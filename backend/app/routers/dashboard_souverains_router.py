from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.database import get_engine
from app.routers.dashboard_common import get_dates_reference, parser_dates_selectionnees


router = APIRouter(
    prefix="/api/dashboard/souverains",
    tags=["Dashboard - Répartition des Souverains"]
)


# ==========================================================
# Mapping métier Souverains
# ==========================================================

MAPPING_TYPE_VF = {
    "TITRE ET BDT": "TITRES ET BDT",
    "CHAABI BANK": "CREDITS DIRECTS",
    "ENGAGEMENT": "CREDITS DIRECTS",
    "BANQUE_CENTRALE": "BANQUES CENTRALES",
}

CATEGORIES = ["TITRES ET BDT", "CREDITS DIRECTS", "BANQUES CENTRALES"]

MMDH = 1_000_000_000  # 1 milliard de MAD


# ==========================================================
# Montants d'une date (en MMDH)
# ==========================================================

def get_montants_souverains(engine, date_arret):
    """
    Retourne { "TITRES ET BDT": .., "CREDITS DIRECTS": .., 
               "BANQUES CENTRALES": .., "TOTAL": .. }
    en MMDH, pour une date d'arrêt donnée, filtré segment='SOUVERAINS'.
    """

    sql = text("""
        SELECT
            type,
            SUM(ead_mad) AS montant
        FROM fact_engagement
        WHERE date_arret = :date_arret
          AND segment = 'SOUVERAINS'
        GROUP BY type
    """)

    with engine.connect() as conn:

        rows = conn.execute(
            sql,
            {"date_arret": date_arret}
        ).mappings().all()

    montants_mad = {cat: 0 for cat in CATEGORIES}

    for row in rows:

        categorie = MAPPING_TYPE_VF.get(row["type"])

        if categorie is None:
            continue

        montants_mad[categorie] += row["montant"] or 0

    montants_mmdh = {
        cat: round(montant / MMDH, 2)
        for cat, montant in montants_mad.items()
    }

    montants_mmdh["TOTAL"] = round(sum(montants_mad.values()) / MMDH, 2)

    return montants_mmdh


# ==========================================================
# Endpoint principal
# ==========================================================

@router.get("")
def dashboard_souverains(dates: Optional[str] = None, date_arret: Optional[str] = None, engine=Depends(get_engine)):
    """
    Dashboard Répartition des Souverains.

    Retourne les montants d'exposition (MMDH) par catégorie, pour les
    dates de référence demandées via ?dates=cle1,cle2,... (DateSelector
    côté frontend). Sans ce paramètre, conserve l'ancien comportement :
    les 4 dates.

    Format pensé pour un BarChart Recharts groupé : un objet par
    catégorie (axe X), avec un champ par date sélectionnée (une barre
    par date).
    """

    dates_ref = get_dates_reference(engine, date_arret)
    

    if dates_ref is None:
        return {"dates": {}, "dates_selectionnees": [], "categories": []}

    cles_selectionnees = parser_dates_selectionnees(dates)

    montants_par_date = {
        cle: get_montants_souverains(engine, dates_ref[cle])
        for cle in cles_selectionnees
    }

    toutes_categories = CATEGORIES + ["TOTAL"]

    categories = [
        {
            "categorie": categorie,
            **{
                cle: montants_par_date[cle][categorie]
                for cle in cles_selectionnees
            },
        }
        for categorie in toutes_categories
    ]

    return {
        "dates": dates_ref,
        "dates_selectionnees": cles_selectionnees,
        "categories": categories,
    }