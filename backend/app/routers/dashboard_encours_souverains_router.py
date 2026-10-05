import logging
from decimal import Decimal, ROUND_HALF_UP, getcontext
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import text
import unicodedata

from app.database import get_engine
from app.routers.dashboard_common import get_dates_reference


router = APIRouter(
    prefix="/api/dashboard/encours-souverains",
    tags=["Dashboard - Encours Souverains"]
)

logger = logging.getLogger(__name__)

getcontext().prec = 50


CLES_DATES_VALIDES = [
    "date_courante",
    "trimestre_precedent",
    "annee_precedente",
    "arret_annuel",
]


# ==========================================================
# Périmètre de ce dashboard
# ==========================================================

FILTRE_PERIMETRE_SOUVERAINS = "AND segment = 'SOUVERAINS' AND type <> 'BANQUE_CENTRALE'"
TYPES_CREDIT = ["CHAABI BANK", "ENGAGEMENT"]
TYPES_TITRES = ["TITRE ET BDT", "FCP"]
VALEUR_FILIALE_FCP = "FCP"
ZONES_AFFICHEES = ["UEMOA", "CEMAC", "AUTRES"]

ZERO = Decimal("0")
UN_MILLION = Decimal("1000000")
CENT = Decimal("100")
QUANTUM_2DEC = Decimal("0.01")
QUANTUM_1DEC = Decimal("0.1")


def normaliser_zone(valeur):
    """
    Neutralise la casse, les espaces et les accents, et regroupe les
    deux valeurs "AUTRES" et "AUTRES (PAYS DE PRÉSENCE)" (quel que soit
    l'encodage réel des accents en base) sous une seule zone "AUTRES".
    """
    if not isinstance(valeur, str):
        return valeur

    sans_accents = "".join(
        c for c in unicodedata.normalize("NFD", valeur)
        if unicodedata.category(c) != "Mn"
    )
    valeur_normalisee = " ".join(sans_accents.split()).upper()

    if valeur_normalisee.startswith("AUTRES"):
        return "AUTRES"

    return valeur_normalisee


def to_decimal(valeur):
    """
    Convertit une valeur brute issue de la base (Decimal, float, int,
    str ou None) en Decimal, sans jamais transiter par float lorsque
    ce n'est pas nécessaire (float(Decimal) perdrait la précision
    exacte). On passe par str() uniquement pour les types qui ne sont
    pas déjà Decimal, afin d'éviter les artefacts binaires du float
    (ex: float("28.95") n'est pas exactement 28.95).
    """
    if valeur is None:
        return ZERO
    if isinstance(valeur, Decimal):
        return valeur
    return Decimal(str(valeur))


def arrondir_excel(valeur, decimales):
    """
    Arrondit un Decimal en reproduisant le comportement d'Excel :
    ROUND_HALF_UP (arrondi "commercial", à l'écart de zéro sur les
    valeurs .5), et non ROUND_HALF_EVEN (arrondi bancaire) qui est le
    comportement par défaut de la fonction round() de Python.
    """
    quantum = Decimal("1").scaleb(-decimales)  
    return valeur.quantize(quantum, rounding=ROUND_HALF_UP)

def get_lignes_brutes(engine, date_arret):
    """
    Retourne, pour la date d'arrêté donnée, les montants agrégés par
    zone / type / filiale, dans le périmètre Souverains (hors banques
    centrales). filiale est nécessaire pour exclure les FCP du calcul
    du taux de couverture (jamais des barres elles-mêmes).
    """

    sql = text(f"""
        SELECT
            zone,
            type,
            filiale,
            SUM(ead_mad) AS ead,
            SUM(el_mad) AS el
        FROM fact_engagement
        WHERE date_arret = :date_arret
        {FILTRE_PERIMETRE_SOUVERAINS}
        GROUP BY zone, type, filiale
    """)

    with engine.connect() as conn:
        return conn.execute(sql, {"date_arret": date_arret}).mappings().all()


# ==========================================================
# Agrégation des lignes brutes par zone
# ==========================================================

def calculer_zones(rows):
    """
    Agrège les lignes brutes (zone, type, ead, el) en métriques par
    zone, entièrement en Decimal (aucune conversion float) :
      - ead_credit          : somme EAD des types Crédit (CHAABI BANK + ENGAGEMENT)
      - ead_titres          : somme EAD des Titres (TITRE ET BDT + FCP)
      - ead_titres_hors_fcp : somme EAD des Titres, hors FCP (uniquement
                              utilisé pour le dénominateur du taux de
                              couverture, jamais pour construire les barres)
      - el                  : somme EL (Crédit + Titres), numérateur du
                              taux de couverture
    """

    zones = {}

    for row in rows:
       
        zone = normaliser_zone(row["zone"])

        if zone not in ZONES_AFFICHEES:
            continue

        type_ligne = (row["type"] or "").strip().upper()
        filiale = (row["filiale"] or "").strip().upper()
        ead = to_decimal(row["ead"])
        el = to_decimal(row["el"])

        z = zones.setdefault(zone, {
            "ead_credit": ZERO,
            "ead_titres": ZERO,
            "ead_titres_hors_fcp": ZERO,
            "el": ZERO,
        })
           
        est_credit = type_ligne in TYPES_CREDIT
        est_titres = type_ligne in TYPES_TITRES
        est_fcp = filiale == VALEUR_FILIALE_FCP
        
        if est_credit:
            z["ead_credit"] += ead
        elif est_titres:
            z["ead_titres"] += ead
            if not est_fcp:
                z["ead_titres_hors_fcp"] += ead

        if est_credit or est_titres:
            z["el"] += el

    return zones


# ==========================================================
# Construction du résultat final pour une date (avec TOTAL)
# ==========================================================

def construire_resultat_date(zones, cle_date=""):
    """
    À partir des métriques brutes par zone (en Decimal, pleine
    précision), construit la liste finale exploitable par le frontend
    (une entrée par zone, TOTAL inclus).

    Règle stricte respectée ici : AUCUN arrondi intermédiaire.
    Tous les ratios (pourcentages, taux de couverture) sont calculés à
    partir des montants Decimal non arrondis ; l'arrondi (ROUND_HALF_UP,
    identique à Excel) n'intervient qu'au tout dernier moment, pour la
    valeur affichée.
    """

    cles_montants = ["ead_credit", "ead_titres", "ead_titres_hors_fcp", "el"]

    total = {cle: ZERO for cle in cles_montants}
    for zone in ZONES_AFFICHEES:
        z = zones.get(zone, {cle: ZERO for cle in cles_montants})
        for cle in cles_montants:
            total[cle] += z[cle]

    toutes_zones = dict(zones)
    toutes_zones["TOTAL"] = total

    resultats = []

    for zone in ZONES_AFFICHEES + ["TOTAL"]:
        z = toutes_zones.get(zone, {cle: ZERO for cle in cles_montants})
        
        # Conversion MAD -> MMAD en Decimal, sans arrondi.
        ead_credit_mmad = z["ead_credit"] / UN_MILLION
        ead_titres_mmad = z["ead_titres"] / UN_MILLION
        ead_total_mmad = ead_credit_mmad + ead_titres_mmad

        if ead_total_mmad != ZERO:
            pourcentage_credit_brut = (ead_credit_mmad / ead_total_mmad) * CENT
            pourcentage_titres_brut = (ead_titres_mmad / ead_total_mmad) * CENT
            pourcentage_credit = arrondir_excel(pourcentage_credit_brut, 1)
            pourcentage_titres = arrondir_excel(pourcentage_titres_brut, 1)
        else:
            pourcentage_credit_brut = ZERO
            pourcentage_titres_brut = ZERO
            pourcentage_credit = ZERO
            pourcentage_titres = ZERO

        denominateur_couverture = z["ead_credit"] + z["ead_titres_hors_fcp"]
        if denominateur_couverture != ZERO:
            taux_couverture_brut = (z["el"] / denominateur_couverture) * CENT
            taux_couverture = arrondir_excel(taux_couverture_brut, 1)
        else:
            taux_couverture_brut = ZERO
            taux_couverture = ZERO

        resultats.append({
            "zone": zone,
            "encours_credit": float(arrondir_excel(ead_credit_mmad, 2)),
            "encours_titres": float(arrondir_excel(ead_titres_mmad, 2)),
            "encours_total": float(arrondir_excel(ead_total_mmad, 2)),
            "pourcentage_credit": float(pourcentage_credit),
            "pourcentage_titres": float(pourcentage_titres),
            "taux_couverture": float(taux_couverture),
        })

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
    dates_reference = get_dates_reference(engine, date_arret)

    if dates_reference is None:
        return {
            "dates_disponibles": {},
            "dates_selectionnees": [],
        }

    cles_selectionnees = [
        cle.strip()
        for cle in (dates or "").split(",")
        if cle.strip() in CLES_DATES_VALIDES
    ]

    if not cles_selectionnees:
        cles_selectionnees = list(CLES_DATES_VALIDES)

    resultat = {

        "dates_disponibles": {
            "date_courante": dates_reference["date_courante"],
            "trimestre_precedent": dates_reference["trimestre_precedent"],
            "annee_precedente": dates_reference["annee_precedente"],
            "arret_annuel": dates_reference["arret_annuel"],
        },

        "dates_selectionnees": cles_selectionnees,

    }

    for cle in cles_selectionnees:
        rows = get_lignes_brutes(engine, dates_reference[cle])
        zones = calculer_zones(rows)
        resultat[cle] = construire_resultat_date(zones, cle_date=cle)

    return resultat