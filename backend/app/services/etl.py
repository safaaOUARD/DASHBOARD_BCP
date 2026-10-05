import sys
import re
import hashlib
import unicodedata
from contextlib import contextmanager
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation

import numpy as np
import pandas as pd
from sqlalchemy import text
import zipfile


def arrondir_2(valeur):
    """Arrondit `valeur` a 2 decimales avec la meme convention qu'Excel
    (ROUND_HALF_UP, ex: 2.005 -> 2.01 et non 2.00). Accepte un nombre,
    une chaine ou None/NaN ; retourne None si la valeur est manquante ou
    non interpretable. A utiliser pour tout montant financier calcule en
    Python avant insertion en base ou affichage."""
    if valeur is None or (isinstance(valeur, float) and pd.isna(valeur)):
        return None
    try:
        return float(
            Decimal(str(valeur)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        )
    except (InvalidOperation, ValueError, TypeError):
        return None


# ============================================================================
# EXCEPTIONS METIER
# ============================================================================


class FichierInvalide(Exception):
    """Erreur metier : le fichier fourni ne peut pas etre importe tel
    quel (feuille introuvable, colonnes obligatoires manquantes, date ou
    montant non reconnu, etc.). Le message porte par cette exception est
    directement presentable a l'utilisateur : jamais de trace Python."""


# ============================================================================
# LECTURE EXCEL (detection moteur / feuille / en-tete)
# ============================================================================


def detecter_moteur_excel(chemin_fichier):
    """Detecte le vrai format du fichier Excel en lisant sa structure
    interne, independamment de son extension (un fichier peut etre
    renomme .xlsb alors qu'il s'agit reellement d'un .xlsx, etc.)."""
    try:
        with zipfile.ZipFile(chemin_fichier) as zf:
            noms = zf.namelist()
            if any(n == "xl/workbook.bin" for n in noms):
                return "pyxlsb"
            if any(n == "xl/workbook.xml" for n in noms):
                return "openpyxl"
        raise ValueError(
            "Archive Excel reconnue mais format interne non supporte."
        )
    except zipfile.BadZipFile:
        # Pas une archive ZIP -> ancien format binaire .xls
        return "xlrd"
    

# ============================================================================
# TRACABILITE DES IMPORTS (hash fichier / journal_import)
# ============================================================================


def calculer_hash_fichier(chemin_fichier):
    """Empreinte SHA-256 du contenu binaire du fichier.

    On identifie un fichier par son CONTENU plutot que par son nom : un
    meme fichier depose deux fois sous des noms differents (upload puis
    copie manuelle dans le dossier, ou renommage accidentel) doit quand
    meme etre reconnu comme deja traite.
    """
    sha256 = hashlib.sha256()
    with open(chemin_fichier, "rb") as f:
        for bloc in iter(lambda: f.read(8192), b""):
            sha256.update(bloc)
    return sha256.hexdigest()


def deja_importe(engine, fichier_hash):
    """Verifie dans journal_import si ce contenu de fichier a deja ete
    importe avec succes. Retourne True si oui (l'import doit etre ignore)."""
    query = text(
        "SELECT 1 FROM journal_import WHERE fichier_hash = :h AND statut = 'succes' LIMIT 1"
    )
    with engine.connect() as conn:
        return conn.execute(query, {"h": fichier_hash}).first() is not None


# ============================================================================
# CONVERSIONS (dates, nombres, booleens, noms de colonnes)
# ============================================================================


def excel_serial_to_date(serial):
    if pd.isna(serial):
        return None

    # openpyxl (.xlsx) renvoie deja un objet date/datetime pour les
    # cellules formatees comme dates -> pas de conversion serial a faire.
    if isinstance(serial, (datetime, pd.Timestamp)):
        return serial.date() if hasattr(serial, "date") else serial

    # Cas CSV reenregistre en xlsx : la date arrive en texte plutot qu'en
    # serial Excel ou en datetime natif (ex: "31/03/2026").
    if isinstance(serial, str):
        texte = serial.strip()
        if not texte:
            return None
        date_convertie = pd.to_datetime(texte, dayfirst=True, errors="coerce")
        if pd.isna(date_convertie):
            raise FichierInvalide(
                f"Le fichier est invalide : la date '{serial}' n'est pas reconnue."
            )
        return date_convertie.date()

    # pyxlsb (.xlsb) renvoie un nombre serial Excel brut.
    return (datetime(1899, 12, 30) + timedelta(days=int(serial))).date()


def _normaliser_nom_colonne(nom):
    """Normalise un nom de colonne quelle que soit sa source (Excel natif,
    CSV reenregistre en xlsx, en-tetes avec accents/espaces multiples/
    tabulations...). Utilisee a la fois pour renommer les colonnes du
    DataFrame final et pour detecter automatiquement la ligne d'en-tete
    et la feuille contenant les donnees metier."""
    if nom is None:
        return ""
    texte = str(nom).strip()
    if not texte or texte.lower().startswith("unnamed"):
        return ""
    texte = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode("ascii")
    texte = texte.lower()
    texte = re.sub(r"[^a-z0-9]+", "_", texte)
    return texte.strip("_")


def normaliser_colonnes(df):
    rename_map = {}

    for col in df.columns:
        col_clean = _normaliser_nom_colonne(col)

        # Cas particulier : ead mad 31/03/2026 -> ead_mad
        if col_clean.startswith("ead_mad_"):
            col_clean = "ead_mad"

        rename_map[col] = col_clean

    return df.rename(columns=rename_map)


def _detecter_ligne_entete(df_brut, colonnes_requises, max_lignes_scan=15):
    """Cherche, parmi les premieres lignes d'une feuille lue sans en-tete
    (header=None), celle qui correspond le mieux a la ligne d'en-tete
    metier : celle qui contient, une fois normalisee, le plus de colonnes
    obligatoires. Gere ainsi les fichiers avec un titre/une date de
    generation avant la vraie ligne d'en-tete. Retourne (index, score),
    ou (None, 0) si aucune ligne ne matche."""
    meilleure_ligne, meilleur_score = None, 0
    limite = min(max_lignes_scan, len(df_brut))
    for i in range(limite):
        noms = {_normaliser_nom_colonne(v) for v in df_brut.iloc[i].tolist()}
        score = len(noms & colonnes_requises)
        if score > meilleur_score:
            meilleure_ligne, meilleur_score = i, score
    return meilleure_ligne, meilleur_score


def _charger_toutes_les_feuilles(chemin_fichier, moteur):
    """Lit le classeur avec le moteur Excel detecte. Si le contenu du
    fichier ne correspond en realite a aucun format Excel reconnu (cas
    d'un CSV simplement renomme en .xlsx, sans avoir ete reellement
    reenregistre par Excel), tente une lecture CSV en repli avant
    d'abandonner avec un message clair."""
    try:
        return pd.read_excel(chemin_fichier, engine=moteur, sheet_name=None, header=None)
    except Exception:
        pass

    try:
        df_csv = pd.read_csv(
            chemin_fichier, sep=None, engine="python", header=None, dtype=str
        )
        return {"csv": df_csv}
    except Exception:
        raise FichierInvalide(
            "Le fichier n'est pas reconnu comme un fichier Excel valide "
            "(.xlsx/.xlsb/.xls) ni comme un fichier CSV. Verifiez le "
            "fichier fourni."
        )


def selectionner_feuille_et_entete(chemin_fichier, moteur, colonnes_requises):
    """Parcourt TOUTES les feuilles du classeur (jamais d'hypothese sur
    leur nom, ex. 'Sheet1') et retourne un DataFrame brut positionne sur
    la bonne feuille et la bonne ligne d'en-tete : la feuille/ligne
    retenue est celle qui contient le plus de colonnes obligatoires une
    fois normalisee. Les lignes totalement vides sont supprimees.

    Leve FichierInvalide si aucune feuille ne contient de ligne
    correspondant aux colonnes attendues.
    """
    colonnes_requises = set(colonnes_requises)
    toutes_feuilles = _charger_toutes_les_feuilles(chemin_fichier, moteur)

    meilleure_feuille, meilleur_score, meilleure_ligne_entete = None, 0, 0

    for nom_feuille, df_brut in toutes_feuilles.items():
        if df_brut.empty:
            continue
        ligne_entete, score = _detecter_ligne_entete(df_brut, colonnes_requises)
        if ligne_entete is not None and score > meilleur_score:
            meilleure_feuille, meilleur_score, meilleure_ligne_entete = (
                nom_feuille, score, ligne_entete,
            )

    if meilleure_feuille is None:
        raise FichierInvalide(
            "Le fichier est invalide : aucune feuille du classeur ne "
            "contient les colonnes attendues (" + ", ".join(sorted(colonnes_requises)) + ")."
        )

    df_brut = toutes_feuilles[meilleure_feuille]
    df = df_brut.iloc[meilleure_ligne_entete + 1:].copy()
    df.columns = df_brut.iloc[meilleure_ligne_entete].tolist()

    return df.dropna(how="all").reset_index(drop=True)


# ============================================================================
# VALIDATION
# ============================================================================


def valider_colonnes(df, colonnes_requises):
    """Verifie que toutes les colonnes obligatoires sont presentes dans
    un DataFrame deja normalise. Leve FichierInvalide avec un message
    listant precisement les colonnes manquantes ; ne fait rien sinon."""
    manquantes = sorted(c for c in colonnes_requises if c not in df.columns)
    if not manquantes:
        return
    if len(manquantes) == 1:
        raise FichierInvalide(
            f"Le fichier est invalide : la colonne '{manquantes[0]}' est absente."
        )
    liste = ", ".join(f"'{c}'" for c in manquantes)
    raise FichierInvalide(f"Le fichier est invalide : les colonnes {liste} sont absentes.")


# ============================================================================
# NETTOYAGE
# ============================================================================


def _vers_booleen(valeur):
    """Convertit une valeur heterogene (bool, 0/1, '1'/'0', 'oui'/'non',
    'vrai'/'faux'...) en booleen fiable. Remplace un simple astype(bool),
    qui evaluerait a tort la chaine '0' ou 'non' comme True."""
    if pd.isna(valeur):
        return False
    if isinstance(valeur, bool):
        return valeur
    if isinstance(valeur, (int, float)):
        return bool(valeur)
    texte = str(valeur).strip().lower()
    correspondances = {
        "1": True, "1.0": True, "true": True, "vrai": True, "oui": True, "y": True, "o": True,
        "0": False, "0.0": False, "false": False, "faux": False, "non": False, "n": False, "": False,
    }
    return correspondances.get(texte, bool(texte))
def _vers_wl(valeur):
    """Convertit la colonne WL en entier (0, 1 ou 2).

    A NE PAS remplacer par _vers_booleen : malgre son nom, WL n'est pas
    un booleen, c'est un indicateur a 3 etats dans les fichiers sources.
    _vers_booleen ferait bool(2) -> True, indiscernable de 1 -> True,
    et perdrait silencieusement la distinction entre wl=1 et wl=2.
    Retourne None si la valeur est manquante ou non interpretable."""
    if pd.isna(valeur):
        return None
    if isinstance(valeur, bool):
        return int(valeur)
    if isinstance(valeur, (int, float)):
        return int(valeur)
    texte = str(valeur).strip().lower()
    correspondances = {
        "0": 0, "0.0": 0, "non": 0, "false": 0, "faux": 0, "n": 0,
        "1": 1, "1.0": 1, "oui": 1, "true": 1, "vrai": 1, "y": 1, "o": 1,
        "2": 2, "2.0": 2,
    }
    if texte in correspondances:
        return correspondances[texte]
    try:
        return int(float(texte))
    except ValueError:
        return None


def _vers_nombre(valeur):
    """Convertit une valeur numerique heterogene (deja numerique, ou
    texte avec separateur milliers/decimal different - cas frequent d'un
    CSV reenregistre en xlsx) vers un float. Retourne None si non
    interpretable, plutot que de lever une exception en plein import."""
    if pd.isna(valeur):
        return None
    if isinstance(valeur, (int, float)):
        return float(valeur)
    texte = str(valeur).strip().replace(" ", "").replace("\xa0", "")
    if not texte:
        return None
    if "," in texte and "." in texte:
        texte = texte.replace(",", "")
    else:
        texte = texte.replace(",", ".")
    try:
        return float(texte)
    except ValueError:
        return None


COLONNES_NUMERIQUES = [
    "encours", "encours_sains", "encours_impayes", "encours_restrectures",
    "encours_douteux", "stock_provision", "nbr_impaye", "anteriorite_impaye",
    "el", "el_mad", "ead_mad", "b1", "b2", "b3",
]


# ============================================================================
# CALCULS METIER
# ============================================================================


def calculer_bucket(row):
    """Conserve pour compatibilite (ancienne colonne 'bucket_ifrs9',
    ordre de priorite B3 > B2 > B1). Ne pas confondre avec la regle
    metier 'bucket' (B1 > B2 > B3) implementee dans calculer_bucket_serie()."""
    if _vers_booleen(row.get("b3")):
        return 3
    if _vers_booleen(row.get("b2")):
        return 2
    if _vers_booleen(row.get("b1")):
        return 1
    return None


def calculer_bucket_serie(df):
    """Regle metier 'bucket' (colonne fact_engagement.bucket) :

        Si B1 = 1            -> "B1"
        Sinon si B2 = 1       -> "B2"
        Sinon si B3 = 1       -> "B3"
        Sinon (B1=B2=B3=0)    -> "0"

    Version vectorisee (np.select) de la regle metier decrite dans le
    cahier des charges : equivalente a un apply(axis=1) mais evaluee en
    une seule passe sur toute la colonne, donc nettement plus rapide sur
    de gros volumes. B1/B2/B3 sont d'abord normalises en booleen avec
    _vers_booleen pour tolerer 0/1, '0'/'1', True/False, etc."""
    b1 = df["b1"].apply(_vers_booleen)
    b2 = df["b2"].apply(_vers_booleen)
    b3 = df["b3"].apply(_vers_booleen)

    return pd.Series(
        np.select(
            [b1, b2, b3],
            ["B1", "B2", "B3"],
            default="0",
        ),
        index=df.index,
    )


# ============================================================================
# PIPELINE PRINCIPAL : LECTURE + NORMALISATION + CALCULS METIER
# ============================================================================


def charger_et_transformer(chemin_xlsb):
    moteur = detecter_moteur_excel(chemin_xlsb)
    # Colonnes calculees par l'ETL (jamais presentes dans le fichier Excel
    # source) : elles doivent etre exclues de la validation des colonnes
    # obligatoires, sinon l'import echouerait a tort en reclamant une
    # colonne que l'ETL a justement pour role de produire lui-meme.
    COLONNES_CALCULEES_PAR_ETL = {
    "perimetre_exposition",
    "perimetre_limites_pays",
    "bucket",

    "el_mad",
    "ead_mad",

    "el_mad_trim_prec",
    "ead_mad_trim_prec",

    "el_mad_annee_prec",
    "ead_mad_annee_prec",

    "el_mad_arret_annuel",
    "ead_mad_arret_annuel",
    }
    
    colonnes_requises = set(COLONNES_CIBLE.keys()) - COLONNES_CALCULEES_PAR_ETL

    df = selectionner_feuille_et_entete(chemin_xlsb, moteur, colonnes_requises)
    df = normaliser_colonnes(df)
    valider_colonnes(df, colonnes_requises)

    df["date_maj"] = df["date_maj"].apply(excel_serial_to_date)
    df["date_arret"] = df["date_arret"].apply(excel_serial_to_date)

    df["bucket_ifrs9"] = df.apply(calculer_bucket, axis=1)
    df["bucket"] = calculer_bucket_serie(df)

    for col in COLONNES_NUMERIQUES:
        df[col] = df[col].apply(_vers_nombre)

    df["intra_group"] = df["intra_group"].apply(_vers_booleen)
    df["wl"] = df["wl"].apply(_vers_wl)
    df["perimetre_exposition"] = (
    (~df["type_engagement"].fillna("").str.strip().str.upper().isin([
        "HORS PERIMETRE",
        "HB/HP"
    ]))
    &
    (df["type"].fillna("").str.strip().str.upper() != "SOLDE NOSTRO")
    &
    (~df["intra_group"])
    &
    (df["zone"].fillna("").str.strip().str.upper() != "MAROC")
    ).astype(int)
    
    # NOTE AUDIT : un bloc de code mort (calcul de perimetre_limites_pays
    # ici en Python, apres le `return` ci-dessus donc jamais execute, et
    # referencant une constante PAYS_PERIMETRE non definie) a ete retire
    # a cet endroit. Cette regle metier est deja implementee et executee
    # correctement en SQL par appliquer_perimetre_limites_pays() ci-dessous,
    # qui reste l'unique source de verite pour ce calcul. Voir l'audit
    # pour la recommandation sur comment eviter cette duplication a l'avenir.
    return df


# ============================================================================
# PREPARATION DES DONNEES / INSERTION POSTGRESQL
# ============================================================================


def upsert_dimensions(engine, df):

    with engine.begin() as conn:

        for devise in df["devise"].dropna().unique():

            conn.execute(
                text("""
                    INSERT INTO dim_devise(code)
                    VALUES(:c)
                    ON CONFLICT(code) DO NOTHING
                """),
                {"c": devise}
            )

        filiales = (
            df[
                [
                    "filiale",
                    "risque_pays",
                    "zone"
                ]
            ]
            .dropna(subset=["filiale"])
            .drop_duplicates("filiale")
        )

        for _, r in filiales.iterrows():

            conn.execute(
                text("""
                    INSERT INTO dim_filiale(code,pays,zone)
                    VALUES(:code,:pays,:zone)
                    ON CONFLICT(code) DO NOTHING
                """),
                {
                    "code": r["filiale"],
                    "pays": r["risque_pays"],
                    "zone": r["zone"]
                }
            )

        for seg in df["segment"].dropna().unique():

            conn.execute(
                text("""
                    INSERT INTO dim_segment(code,libelle)
                    VALUES(:c,:c)
                    ON CONFLICT(code) DO NOTHING
                """),
                {"c": seg}
            )

        secteurs = (
            df[
                [
                    "code_ape",
                    "secteur_activite"
                ]
            ]
            .dropna(subset=["code_ape"])
            .drop_duplicates("code_ape")
        )

        for _, r in secteurs.iterrows():

            conn.execute(
                text("""
                    INSERT INTO dim_secteur_activite(code_ape,libelle)
                    VALUES(:code,:lib)
                    ON CONFLICT(code_ape) DO NOTHING
                """),
                {
                    "code": r["code_ape"],
                    "lib": r["secteur_activite"]
                }
            )


# Mapping colonne_source -> colonne_cible, ALIGNE avec fact_engagement.
# Chaque valeur a droite doit exister telle quelle dans schema_postgresqlbcp.sql.
COLONNES_CIBLE = {
    "cle": "cle",

    "date_arret": "date_arret",
    "date_maj": "date_maj",

    "filiale": "filiale",

    "segment": "segment",
    
 

    "devise": "devise",

    "nom_client": "nom_client",

    "code_ape": "code_ape",
    "lib_ape": "lib_ape",
    "secteur_activite": "secteur_activite",

    "type": "type",
    "type_engagement": "type_engagement",

    "risque_pays": "risque_pays",

    "intra_group": "intra_group",

    "encours": "encours",
    "encours_sains": "encours_sains",
    "encours_impayes": "encours_impayes",
    "encours_restrectures": "encours_restrectures",
    "encours_douteux": "encours_douteux",

    "stock_provision": "stock_provision",

    "nbr_impaye": "nbr_impaye",
    "anteriorite_impaye": "anteriorite_impaye",

    "wl": "wl",
    "b1": "b1",
    "b2": "b2",
    "b3": "b3",
    "bucket": "bucket",
   

    "el": "el",
    "perimetre_exposition": "perimetre_exposition",
    "perimetre_limites_pays": "perimetre_limites_pays",

    

    "zone": "zone",
    
    
}


def inserer_faits(engine, df, import_id):

    df_final = df[list(COLONNES_CIBLE.keys())].rename(columns=COLONNES_CIBLE)
    df_final["import_id"] = import_id

    df_final.to_sql("fact_engagement", engine, if_exists="append", index=False, chunksize=5000)
    return len(df_final)


def creer_journal_import(engine, nom_fichier, fichier_hash, type_import="base"):
    """Cree la ligne journal_import AVANT l'insertion des faits, avec un
    statut provisoire 'en_cours', pour pouvoir renseigner import_id des
    le depart et permettre au frontend de suivre la progression par
    polling (GET /api/import/statut?import_id=...) pendant que le
    pipeline ETL tourne en arriere-plan. Le statut est finalise ensuite
    par finaliser_journal_import()."""
    with engine.begin() as conn:
        result = conn.execute(
            text(
                "INSERT INTO journal_import "
                "(nom_fichier, fichier_hash, statut, type_import, etape, progression) "
                "VALUES (:f, :h, 'en_cours', :t, 'En file d''attente', 0) RETURNING id"
            ),
            {"f": nom_fichier, "h": fichier_hash, "t": type_import},
        )
        return result.scalar_one()


def maj_progression_import(engine, import_id, etape, progression):
    """Met a jour l'etape en cours et le pourcentage d'avancement (0-100)
    d'un import dans journal_import. Appelee a chaque etape cle du
    pipeline ETL (base, devises, rating) pour alimenter le polling du
    frontend. Transaction courte et independante, comme le reste des
    ecritures du module : ne bloque pas le pipeline en cas de forte
    frequence d'appel."""
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE journal_import SET etape = :etape, progression = :p WHERE id = :id"),
            {"etape": etape, "p": progression, "id": import_id},
        )


def finaliser_journal_import(engine, import_id, date_arret, nb_lignes, statut, erreur=None):
    etape = "Import terminé" if statut == "succes" else "Import échoué"
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE journal_import "
                "SET date_arret = :d, nb_lignes = :n, statut = :s, message_erreur = :e, "
                "etape = :etape, progression = 100 "
                "WHERE id = :id"
            ),
            {"d": date_arret, "n": nb_lignes, "s": statut, "e": erreur, "etape": etape, "id": import_id},
        )


def journaliser_ignore(engine, nom_fichier, fichier_hash):
    """Cas particulier : fichier deja importe, on trace juste l'evenement,
    sans creer de lien avec des lignes de faits (il n'y en a pas)."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO journal_import (nom_fichier, fichier_hash, statut, message_erreur) "
                "VALUES (:f, :h, 'ignore', :e)"
            ),
            {
                "f": nom_fichier,
                "h": fichier_hash,
                "e": "Fichier deja importe (meme contenu detecte par hash).",
            },
        )


# ============================================================================
# SYNCHRONISATION ETL (verrou anti-deadlock)
# ============================================================================

# Cle arbitraire mais fixe : identifie le verrou "pipeline ETL fact_engagement".
# Ne jamais reutiliser cette meme cle pour un autre usage de pg_advisory_lock.
_VERROU_ETL_FACT_ENGAGEMENT = 918273645


@contextmanager
def verrou_etl(engine):
    """Garantit qu'un seul pipeline ETL (import base OU import devises) ne
    modifie fact_engagement a la fois.

    Necessaire car les UPDATE de mise a jour des taux/perimetre peuvent
    porter sur des ensembles de lignes qui se chevauchent entre un import
    base (filtre sur fe.import_id) et un import devises (filtre sur
    tc.import_id, mais qui peut retoucher des lignes fact_engagement
    inserees par n'importe quel import base anterieur). Sans
    synchronisation, deux transactions concurrentes peuvent verrouiller
    ces lignes communes dans un ordre different -> deadlock PostgreSQL
    (psycopg2.errors.DeadlockDetected).

    Utilise pg_advisory_lock, un verrou de SESSION (pas de transaction) :
    contrairement a pg_advisory_xact_lock, il reste actif tant que la
    connexion dediee ci-dessous est ouverte, meme si le code protege
    enchaine plusieurs engine.begin() (donc plusieurs transactions
    distinctes) a l'interieur du bloc `with verrou_etl(engine):`.
    """
    conn = engine.connect()
    conn.execute(text("SELECT pg_advisory_lock(:k)"), {"k": _VERROU_ETL_FACT_ENGAGEMENT})
    try:
        yield
    finally:
        conn.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": _VERROU_ETL_FACT_ENGAGEMENT})
        conn.close()


# ============================================================================
# FONCTIONS PUBLIQUES - IMPORT FICHIER DE BASE
# ============================================================================


def importer_fichier(chemin_xlsb, engine, import_id=None):
    """Pipeline d'import du fichier de base.

    import_id : si fourni (cas normal depuis le router FastAPI, qui cree
    la ligne journal_import de facon synchrone AVANT de repondre au
    client afin de pouvoir renvoyer l'id pour le polling), on saute le
    controle de doublon et la creation de la ligne, deja faits par
    l'appelant. Si None (appel direct/script), on retrouve l'ancien
    comportement autonome.
    """
    print("===== DEBUT IMPORT =====")
    fichier_hash = calculer_hash_fichier(chemin_xlsb)

    if import_id is None:
        if deja_importe(engine, fichier_hash):
            journaliser_ignore(engine, chemin_xlsb, fichier_hash)
            return {
                "statut": "ignore",
                "message": "Ce fichier a deja ete importe precedemment."
            }
        import_id = creer_journal_import(engine, chemin_xlsb, fichier_hash)

    try:
        maj_progression_import(engine, import_id, "Lecture et transformation du fichier", 10)
        df = charger_et_transformer(chemin_xlsb)

        maj_progression_import(engine, import_id, "Mise à jour des référentiels", 30)
        upsert_dimensions(engine, df)

        maj_progression_import(engine, import_id, "Insertion des lignes en base", 50)
        nb = inserer_faits(engine, df, import_id)
        print("Lignes insérées :", nb)

        maj_progression_import(engine, import_id, "Application des taux de change", 70)
        with verrou_etl(engine):
            nb_avec_taux = appliquer_taux_change(engine, import_id_fact=import_id)
            print("Lignes mises à jour avec taux :", nb_avec_taux)

            maj_progression_import(engine, import_id, "Calcul du périmètre limites pays", 90)
            nb_perimetre = appliquer_perimetre_limites_pays(engine, import_id=import_id)
            print("Lignes mises à jour périmètre limites pays :", nb_perimetre)

        print("===== FIN IMPORT =====")

        date_arret = (
            df["date_arret"].dropna().iloc[0]
            if not df["date_arret"].dropna().empty
            else None
        )

        finaliser_journal_import(
            engine,
            import_id,
            date_arret,
            nb,
            statut="succes"
        )

        return {
            "statut": "succes",
            "lignes_importees": nb
        }

    except FichierInvalide as exc:
        finaliser_journal_import(
            engine,
            import_id,
            None,
            0,
            statut="echec",
            erreur=str(exc)
        )
        return {
            "statut": "echec",
            "message": str(exc)
        }

    except Exception as exc:
        finaliser_journal_import(
            engine,
            import_id,
            None,
            0,
            statut="echec",
            erreur=str(exc)
        )
        raise


# ============================================================================
# FONCTIONS PUBLIQUES - IMPORT DEVISES
# ============================================================================

COLONNES_REQUISES_DEVISES = {"date", "devise", "prix"}


def normaliser_colonnes_devise(df):
    return df.rename(columns={col: _normaliser_nom_colonne(col) for col in df.columns})


def charger_devises(chemin_fichier):
    """Charge un fichier de taux de change (.xlsx) avec les colonnes
    date, devise, prix. Detecte automatiquement la feuille et la ligne
    d'en-tete, comme pour le fichier de base."""
    moteur = detecter_moteur_excel(chemin_fichier)

    df = selectionner_feuille_et_entete(chemin_fichier, moteur, COLONNES_REQUISES_DEVISES)
    df = normaliser_colonnes_devise(df)
    valider_colonnes(df, COLONNES_REQUISES_DEVISES)

    df["date"] = df["date"].apply(excel_serial_to_date)
    df["prix"] = df["prix"].apply(_vers_nombre)

    if df["date"].isna().any() or df["prix"].isna().any():
        raise FichierInvalide(
            "Le fichier de devises est invalide : certaines dates ou certains "
            "prix ne sont pas reconnus."
        )

    return df


def importer_taux_change(chemin_fichier, engine, import_id=None):
    """Upsert des taux de change dans taux_change. Rejouable a l'infini :
    un meme (date, devise) ecrase simplement l'ancien prix."""
    df = charger_devises(chemin_fichier)
    parametres = [
        {"d": r["date"], "dev": r["devise"], "p": r["prix"], "imp": import_id}
        for _, r in df.iterrows()
    ]

    if parametres:
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO taux_change (date_taux, devise, prix, import_id)
                    VALUES (:d, :dev, :p, :imp)
                    ON CONFLICT (date_taux, devise)
                    DO UPDATE SET prix = EXCLUDED.prix, import_id = EXCLUDED.import_id
                """),
                parametres,
            )

    date_ref = df["date"].iloc[0] if not df.empty else None
    return len(df), date_ref


# ============================================================================
# CALCULS FINANCIERS (conversion devises, perimetre limites pays)
# ============================================================================


def appliquer_taux_change(engine, import_id_fact=None, import_id_taux=None):
    """Calcule ead_mad = encours * prix, el_mad = el * prix (+ variantes
    trimestre/annee precedents), en joignant fact_engagement.(date_arret,
    devise) avec taux_change.(date_taux, devise).

    Deux modes de portee, non exclusifs avec la rejouabilite :

    - import_id_fact : ne recalcule que les lignes fact_engagement de CET
      import base (utilise juste apres un import de fichier de base, pour
      calculer les taux des lignes qu'on vient d'inserer).

    - import_id_taux : ne recalcule que les lignes fact_engagement dont la
      (date_arret, devise) correspond a un taux appartenant a CET import
      devises (utilise juste apres un import de fichier devises, pour
      mettre a jour retroactivement les bases deja importees - MEME
      importees avant ce fichier devises - mais UNIQUEMENT pour les
      dates/devises presentes dans ce fichier, pas toute la table).

    Si aucun des deux n'est fourni, retombe sur l'ancien comportement
    (toute la table) - a n'utiliser qu'en reprise manuelle/backfill, sous
    le verrou verrou_etl().
    """
    conditions = []
    params = {}

    if import_id_fact is not None:
        conditions.append("fe.import_id = :import_id_fact")
        params["import_id_fact"] = import_id_fact

    if import_id_taux is not None:
        conditions.append("tc.import_id = :import_id_taux")
        params["import_id_taux"] = import_id_taux

    filtre_import = ("AND " + " AND ".join(conditions)) if conditions else ""

    with engine.begin() as conn:
        result = conn.execute(
            text(f"""
                UPDATE fact_engagement fe
                SET
                    ead_mad = fe.encours * tc.prix,
                    el_mad = fe.el * tc.prix,

                    ead_mad_trim_prec = fe.encours * tc_trim.prix,
                    el_mad_trim_prec = fe.el * tc_trim.prix,

                    ead_mad_annee_prec = fe.encours * tc_annee.prix,
                    el_mad_annee_prec = fe.el * tc_annee.prix,

                    ead_mad_arret_annuel = fe.encours * tc_arret_annuel.prix,
                    el_mad_arret_annuel = fe.el * tc_arret_annuel.prix
                FROM taux_change tc

                LEFT JOIN taux_change tc_trim
                    ON tc_trim.devise = tc.devise
                    AND tc_trim.date_taux = (
                        date_trunc('month', tc.date_taux - INTERVAL '3 months')
                        + INTERVAL '1 month - 1 day'
                    )::date

                LEFT JOIN taux_change tc_annee
                    ON tc_annee.devise = tc.devise
                    AND tc_annee.date_taux = (tc.date_taux - INTERVAL '1 year')::date

                LEFT JOIN taux_change tc_arret_annuel
                    ON tc_arret_annuel.devise = tc.devise
                    AND tc_arret_annuel.date_taux =
                        make_date(EXTRACT(YEAR FROM tc.date_taux)::int - 1, 12, 31)

                WHERE fe.date_arret = tc.date_taux
                  AND fe.devise = tc.devise
                  {filtre_import}
            """),
            params,
        )
        return result.rowcount


def importer_fichier_devises(chemin_fichier, engine, import_id=None):
    """Pipeline d'import du fichier de devises. Voir importer_fichier()
    pour la logique du parametre import_id (pre-cree par le router)."""
    print("===== IMPORT DEVISES =====")
    fichier_hash = calculer_hash_fichier(chemin_fichier)

    if import_id is None:
        if deja_importe(engine, fichier_hash):
            journaliser_ignore(engine, chemin_fichier, fichier_hash)
            return {"statut": "ignore", "message": "Ce fichier de devises a deja ete importe."}
        import_id = creer_journal_import(engine, chemin_fichier, fichier_hash, type_import="devise")

    try:
        maj_progression_import(engine, import_id, "Lecture du fichier de devises", 15)
        nb, date_ref = importer_taux_change(
            chemin_fichier,
            engine,
            import_id=import_id
        )

        maj_progression_import(engine, import_id, "Application rétroactive des taux de change", 60)
        with verrou_etl(engine):
            nb_maj = appliquer_taux_change(engine, import_id_taux=import_id)
            print(f"Lignes mises à jour : {nb_maj}")

        finaliser_journal_import(engine, import_id, date_ref, nb, statut="succes")

        return {
            "statut": "succes",
            "taux_importes": nb,
            "lignes_fact_engagement_mises_a_jour": nb_maj,
        }

    except FichierInvalide as exc:
        finaliser_journal_import(engine, import_id, None, 0, statut="echec", erreur=str(exc))
        return {"statut": "echec", "message": str(exc)}

    except Exception as exc:
        finaliser_journal_import(engine, import_id, None, 0, statut="echec", erreur=str(exc))
        raise
    
def appliquer_perimetre_limites_pays(engine, import_id=None):
    sql = text("""
        UPDATE fact_engagement fe
        SET perimetre_limites_pays =
        (
            fe.segment <> 'BANQUES'
            AND fe.type_engagement = 'BILAN'
            AND fe.intra_group = FALSE
            AND fe.type <> 'BANQUE_CENTRALE'
            AND fe.risque_pays IN (
                'CAMEROUN',
                'BURKINA',
                'COTE D''IVOIRE',
                'MALI',
                'SENEGAL',
                'TOGO',
                'BENIN',
                'GUINEE BISSAU',
                'GUINEE CONAKRY',
                'MADAGASCAR',
                'MAURICE',
                'CENTRAFRIQUE',
                'CONGO',
                'NIGER',
                'GABON'
            )
        )
        WHERE (:import_id IS NULL OR fe.import_id = :import_id)
    """)

    with engine.begin() as conn:
        result = conn.execute(sql, {"import_id": import_id})
        return result.rowcount
# ============================================================================
# FONCTIONS PUBLIQUES - IMPORT RATING PAYS
# ============================================================================

COLONNES_REQUISES_RATING = {"pays", "note_retenue", "date"}


def normaliser_colonnes_rating(df):
    return df.rename(columns={col: _normaliser_nom_colonne(col) for col in df.columns})


def charger_rating(chemin_fichier):
    """Charge un fichier Rating Pays (colonnes Pays / Note retenue / date)
    avec la meme robustesse que pour la base et les devises : detection
    automatique du moteur Excel (xlsx/xlsb/xls), de la feuille et de la
    ligne d'en-tete, normalisation des noms de colonnes."""
    moteur = detecter_moteur_excel(chemin_fichier)

    df = selectionner_feuille_et_entete(chemin_fichier, moteur, COLONNES_REQUISES_RATING)
    df = normaliser_colonnes_rating(df)
    valider_colonnes(df, COLONNES_REQUISES_RATING)

    df["date"] = df["date"].apply(excel_serial_to_date)
    df["pays"] = df["pays"].astype(str).str.strip().str.upper()
    df["note_retenue"] = df["note_retenue"].astype(str).str.strip()

    if df["date"].isna().any() or (df["pays"] == "").any() or (df["note_retenue"] == "").any():
        raise FichierInvalide(
            "Le fichier Rating Pays est invalide : certaines dates, certains "
            "pays ou certaines notes retenues ne sont pas reconnus."
        )

    return df


def importer_rating_pays(chemin_fichier, engine, import_id=None):
    """Upsert des ratings pays dans dim_rating_pays. Rejouable a l'infini :
    un meme (date_arret, pays) ecrase simplement l'ancienne note (meme
    principe que importer_taux_change pour taux_change)."""
    df = charger_rating(chemin_fichier)

    parametres = [
        {"d": r["date"], "p": r["pays"], "n": r["note_retenue"], "imp": import_id}
        for _, r in df.iterrows()
    ]

    if parametres:
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO dim_rating_pays (date_arret, pays, note_retenue, import_id)
                    VALUES (:d, :p, :n, :imp)
                    ON CONFLICT (date_arret, pays)
                    DO UPDATE SET note_retenue = EXCLUDED.note_retenue, import_id = EXCLUDED.import_id
                """),
                parametres,
            )

    date_ref = df["date"].iloc[0] if not df.empty else None
    return len(df), date_ref


def importer_fichier_rating(chemin_fichier, engine, import_id=None):
    """Point d'entree : import d'un fichier Rating Pays, sur le meme
    modele que importer_fichier_devises() (hash, journal_import,
    upsert idempotent). Voir importer_fichier() pour la logique du
    parametre import_id (pre-cree par le router)."""
    print("===== IMPORT RATING PAYS =====")
    fichier_hash = calculer_hash_fichier(chemin_fichier)

    if import_id is None:
        if deja_importe(engine, fichier_hash):
            journaliser_ignore(engine, chemin_fichier, fichier_hash)
            return {"statut": "ignore", "message": "Ce fichier de rating pays a deja ete importe."}
        import_id = creer_journal_import(engine, chemin_fichier, fichier_hash, type_import="rating")

    try:
        maj_progression_import(engine, import_id, "Lecture et upsert des notes rating pays", 40)
        nb, date_ref = importer_rating_pays(chemin_fichier, engine, import_id=import_id)
        print(f"Notes rating importées : {nb}")

        finaliser_journal_import(engine, import_id, date_ref, nb, statut="succes")

        return {
            "statut": "succes",
            "notes_importees": nb,
        }

    except FichierInvalide as exc:
        finaliser_journal_import(engine, import_id, None, 0, statut="echec", erreur=str(exc))
        return {"statut": "echec", "message": str(exc)}

    except Exception as exc:
        finaliser_journal_import(engine, import_id, None, 0, statut="echec", erreur=str(exc))
        raise