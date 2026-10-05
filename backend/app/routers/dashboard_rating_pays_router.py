from fastapi import APIRouter, Depends
from sqlalchemy import text, bindparam
from typing import Optional
from app.database import get_engine
from app.routers.dashboard_common import (
    get_dates_reference,
    FILTRE_PERIMETRE_EXPOSITION,
)
router = APIRouter(
    prefix="/api/dashboard/rating-pays",
    tags=["Dashboard - Rating Pays"]
)
# ==========================================================
# Clés de dates valides (identiques aux autres dashboards)
# ==========================================================

CLES_DATES_VALIDES = [
    "date_courante",
    "trimestre_precedent",
    "annee_precedente",
    "arret_annuel",
]
CLE_DATE_OBLIGATOIRE = "date_courante"
# ==========================================================
# Zones autorisées pour ce dashboard 
# ==========================================================
ZONES_AUTORISEES = [
    "UEMOA",
    "CEMAC",
    "AUTRES (Pays de présence)",
    'AUTRES (Pays de prÃ©sence)'
]
def normalize(valeur):
    """
    Neutralise la casse et les espaces (simples ou multiples/insécables)
    pour fiabiliser la correspondance fact_engagement.risque_pays ↔
    dim_rating_pays.pays, qui peuvent être saisis avec une casse ou un
    espacement différents (ex: exports Excel).
    """
    if not isinstance(valeur, str):
        return valeur
    return " ".join(valeur.split()).upper()
# ==========================================================
# Table de correspondance Pays → Note retenue, à UNE date donnée
# ==========================================================

def get_mapping_pays_note(engine, date_arret):
    """
    Construit la table de correspondance Pays → (note_retenue, libellé pays)
    à partir de dim_rating_pays, à la date d'arrêté passée en paramètre
    (le rating valable à CETTE date précise).

    Fonction générique : appelée soit avec la date d'un arrêté précis
    (pour classer les montants de cet arrêté selon la note historique
    en vigueur à ce moment-là), soit avec la date la plus récente parmi
    les dates sélectionnées (pour construire la liste d'affichage des
    pays sous chaque note — cf. build_pays_par_note — et servir de
    filet de secours de classement, cf. get_rating_pays_date).

    La clé du dictionnaire est le nom de pays normalisé (pour la
    correspondance), la valeur conserve le libellé "propre" du pays tel
    qu'il figure dans dim_rating_pays (pour l'affichage).
    """

    sql = text("""
        SELECT
            pays,
            note_retenue
        FROM dim_rating_pays
        WHERE date_arret = :date_arret
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            sql,
            {"date_arret": date_arret}
        ).mappings().all()

    return {
        normalize(row["pays"]): {
            "note_retenue": row["note_retenue"],
            "pays_libelle": row["pays"],
        }
        for row in rows
    }


def build_pays_par_note(mapping_pays_note):
    """
    Inverse la table Pays → Note en Note → liste de pays.

    Utilisé pour construire, une seule fois, la liste des pays affichée
    sous chaque note dans le graphique — toujours basée sur la note LA
    PLUS RÉCENTE (celle du mapping passé en paramètre), quelle que soit
    la date d'arrêté dont le montant est affiché à côté.
    """

    pays_par_note = {}

    for info in mapping_pays_note.values():
        note = info["note_retenue"]
        pays_par_note.setdefault(note, set()).add(info["pays_libelle"])

    return {
        note: sorted(pays)
        for note, pays in pays_par_note.items()
    }

# ==========================================================
# Statistiques d'une date (regroupées par note_retenue,
# avec le détail des pays et les pourcentages du total)
# ==========================================================

def get_rating_pays_date(
    engine,
    date_arret,
    pays_par_note_affichage,
    mapping_pays_note_reference,
):
    """
    Retourne les engagements (en MMDH) d'une date d'arrêt donnée,
    regroupés par note_retenue.

    Règle métier :
      - Le MONTANT/POURCENTAGE d'une date est calculé avec la note
        HISTORIQUE en vigueur à CETTE date d'arrêté précise (le rating
        d'un pays peut donc différer d'une date à l'autre : un pays noté
        B au 31/12/N-1 puis noté C au 31/03 sera bien compté sous B pour
        le 31/12 et sous C pour le 31/03).
      - L'AFFICHAGE du nom du pays sous le graphique, lui, reste
        toujours basé sur la note LA PLUS RÉCENTE (paramètre
        pays_par_note_affichage, identique quelle que soit la date
        traitée) — un pays peut donc apparaître dans un montant sans
        que son nom soit listé sous cette note-là, si sa note a changé
        depuis.
      - Catégorie "Non noté" supprimée : si un pays présent dans
        fact_engagement n'a pas de note historique à cette date d'arrêté
        précise (ex. rating pas encore renseigné à cette date dans
        dim_rating_pays), on le rattache à sa dernière note disponible
        (mapping_pays_note_reference, la même que celle utilisée pour
        l'affichage des pays sous le graphique) plutôt que de créer une
        catégorie "Non noté". Aucun engagement du périmètre autorisé
        n'est donc jamais perdu ni isolé dans une note fictive.

    Pour chaque note_retenue, on retourne :
      - montant       : somme des engagements (ead_mad) classés sous
                        cette note à la date d'arrêté traitée
      - pourcentage   : part de ce montant dans le total de cette date
                        (tous ratings confondus, mêmes zones)
      - pays          : liste des pays affichés sous cette note,
                        toujours selon la note la plus récente

    Seuls les engagements du périmètre d'exposition ET des zones
    autorisées (UEMOA, CEMAC, AUTRES (Pays de présence),'AUTRES (Pays de prÃ©sence)') sont pris en
    compte. Les pays des autres zones sont donc totalement exclus du
    dashboard.
    """
    mapping_pays_note_historique = get_mapping_pays_note(engine, date_arret)

    sql = text(f"""
        SELECT
            risque_pays,
            SUM(ead_mad) AS montant
        FROM fact_engagement
        WHERE date_arret = :date_arret
        AND zone IN :zones
        {FILTRE_PERIMETRE_EXPOSITION}
        GROUP BY risque_pays
    """).bindparams(bindparam("zones", expanding=True))

    with engine.connect() as conn:
        rows = conn.execute(
            sql,
            {"date_arret": date_arret, "zones": ZONES_AUTORISEES}
        ).mappings().all()

    # Regroupement par note historique : montant cumulé
    montants_par_note = {}

    for row in rows:

        pays_brut = row["risque_pays"]
        montant = row["montant"] or 0
        pays_normalise = normalize(pays_brut)
        info = mapping_pays_note_historique.get(pays_normalise)
        if info is None:
            info = mapping_pays_note_reference.get(pays_normalise)

        if info is None:
            continue

        note = info["note_retenue"]
        montants_par_note[note] = montants_par_note.get(note, 0) + montant

    total_general = sum(montants_par_note.values())

    resultats = []

    for note, montant in montants_par_note.items():
        pourcentage = (
            round((montant / total_general) * 100, 2)
            if total_general
            else 0
        )

        resultats.append({
            "note_retenue": note,
            "montant": montant,
            "pourcentage": pourcentage,
            "pays": pays_par_note_affichage.get(note, []),
        })

    resultats.sort(key=lambda item: item["montant"], reverse=True)

    return resultats


# ==========================================================
# Endpoint principal
# ==========================================================

@router.get("")
def dashboard_encours_souverains(
    date_arret: Optional[str] = None,
    dates: str = None,
    engine=Depends(get_engine),
):
    """
    Dashboard Rating Pays.

    Query param "dates" (optionnel) : liste de clés séparées par des
    virgules parmi date_courante, trimestre_precedent, annee_precedente,
    arret_annuel (ex: "?dates=date_courante,arret_annuel").
    1 à 4 clés peuvent être sélectionnées. Si absent, invalide, ou vide,
    les 4 dates sont utilisées par défaut.

    Règle métier : "date_courante" (Situation actuelle / T0) est
    obligatoire et toujours incluse dans le résultat, même si elle est
    absente du paramètre "dates" (l'utilisateur ne peut pas la
    désélectionner ; côté frontend, sa case à cocher doit être
    non-décochable).

    Pour chaque date sélectionnée, retourne une liste d'objets :
        {
            "note_retenue": "CCC",
            "montant": 12345.0,
            "pourcentage": 8.42,
            "pays": ["Burkina", "Cameroun", "Congo", ...]
        }
    """

    dates_reference = get_dates_reference(engine, date_arret)

    if dates_reference is None:
        return {
            "dates_disponibles": {},
            "dates_selectionnees": [],
            "date_reference_rating": None,
        }

    cles_selectionnees = [
        cle.strip()
        for cle in (dates or "").split(",")
        if cle.strip() in CLES_DATES_VALIDES
    ]

    if not cles_selectionnees:
        cles_selectionnees = list(CLES_DATES_VALIDES)

    if CLE_DATE_OBLIGATOIRE not in cles_selectionnees:
        cles_selectionnees = [CLE_DATE_OBLIGATOIRE] + cles_selectionnees

    date_reference_rating = max(
        dates_reference[cle] for cle in cles_selectionnees
    )

    mapping_pays_note_actuelle = get_mapping_pays_note(engine, date_reference_rating)
    pays_par_note_affichage = build_pays_par_note(mapping_pays_note_actuelle)

    resultat = {

        "dates_disponibles": {
            "date_courante": dates_reference["date_courante"],
            "trimestre_precedent": dates_reference["trimestre_precedent"],
            "annee_precedente": dates_reference["annee_precedente"],
            "arret_annuel": dates_reference["arret_annuel"],
        },

        "dates_selectionnees": cles_selectionnees,

        "date_reference_rating": date_reference_rating,

    }

    for cle in cles_selectionnees:
        resultat[cle] = get_rating_pays_date(
            engine,
            dates_reference[cle],
            pays_par_note_affichage,
            mapping_pays_note_actuelle,
        )

    return resultat