from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.database import get_engine
from app.routers.dashboard_common import (
    get_dates_reference,
    calculer_pourcentages,
    parser_dates_selectionnees,
    FILTRE_PERIMETRE_EXPOSITION,
)


router = APIRouter(
    prefix="/api/dashboard/zones",
    tags=["Dashboard - Répartition par Zone"]
)


# ==========================================================
# Statistiques d'une date
# ==========================================================

def get_zone_date(engine, date_arret):
    """
    Retourne la répartition par zone (en montants d'engagement,
    exprimés en MMDH) pour une date d'arrêt donnée.

    Seuls les engagements du périmètre d'exposition sont pris en compte.
    Pas de KPI "Total engagements" pour ce dashboard (contrairement à
    Segmentation Bâloise) : le frontend n'en a pas besoin.
    """

    sql = text(f"""
        SELECT
            TRIM(zone) AS zone,   
            SUM(ead_mad) AS montant
        FROM fact_engagement
        WHERE date_arret = :date_arret
        {FILTRE_PERIMETRE_EXPOSITION}
        GROUP BY TRIM(zone)
        ORDER BY TRIM(zone)
    """)

    with engine.connect() as conn:

        rows = conn.execute(
            sql,
            {"date_arret": date_arret}
        ).mappings().all()

    resultats = {}

    for row in rows:

        zone = row["zone"]

        if zone not in resultats:
            resultats[zone] = 0

        resultats[zone] += (row["montant"] or 0)

    return calculer_pourcentages(resultats)


# ==========================================================
# Endpoint principal
# ==========================================================

@router.get("")
def dashboard_zones(dates: Optional[str] = None, date_arret: Optional[str] = None, engine=Depends(get_engine)):
    """
    Dashboard Répartition par Zone.

    Calcule la répartition uniquement pour les dates de référence
    demandées via ?dates=cle1,cle2,... (DateSelector côté frontend).
    Sans ce paramètre, conserve l'ancien comportement : les 4 dates.
    """

    dates_ref = get_dates_reference(engine, date_arret)
    

    if dates_ref is None:
        return {
            "date_courante": [],
            "trimestre_precedent": [],
            "annee_precedente": [],
            "arret_annuel": [],
            "dates": {},
            "dates_selectionnees": [],
        }

    cles_selectionnees = parser_dates_selectionnees(dates)

    resultat = {
        "dates": dict(dates_ref),
        "dates_selectionnees": cles_selectionnees,
    }

    for cle in cles_selectionnees:
        resultat[cle] = get_zone_date(engine, dates_ref[cle])

    return resultat