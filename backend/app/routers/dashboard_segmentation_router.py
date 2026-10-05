from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.database import get_engine
from app.routers.dashboard_common import (
    get_dates_reference,
    calculer_pourcentages,
    convertir_mmdh,
    parser_dates_selectionnees,
    FILTRE_PERIMETRE_EXPOSITION,
)


router = APIRouter(
    prefix="/api/dashboard/segmentation-baloise",
    tags=["Dashboard - Segmentation Bâloise"]
)


# ==========================================================
# Mapping métier Bâloise
# ==========================================================

def convertir_segment_vf(segment, type_dossier):

    if type_dossier == "BANQUE_CENTRALE":
        return "BANQUE CENTRALE"

    if segment in ("PARTICULIERS", "CORPORATES"):
        return "CLIENTELES"

    if segment == "BANQUES":
        return "BANQUES"

    if segment == "SOUVERAINS":
        return "SOUVERAINS"

    return "AUTRES"


# ==========================================================
# Statistiques d'une date
# ==========================================================

def get_segmentation_date(engine, date_arret):
    """
    Retourne la segmentation Bâloise (en montants d'engagement,
    exprimés en MMDH) pour une date d'arrêt donnée.

    Seuls les engagements du périmètre d'exposition sont pris en compte.
    """

    sql = text(f"""
        SELECT
            segment,
            type,
            SUM(ead_mad) AS montant
        FROM fact_engagement
        WHERE date_arret = :date_arret
        {FILTRE_PERIMETRE_EXPOSITION}
        GROUP BY segment, type
        ORDER BY segment
    """)

    with engine.connect() as conn:

        rows = conn.execute(
            sql,
            {"date_arret": date_arret}
        ).mappings().all()

    resultats = {}

    for row in rows:

        segment_vf = convertir_segment_vf(
            row["segment"],
            row["type"]
        )

        if segment_vf not in resultats:
            resultats[segment_vf] = 0

        resultats[segment_vf] += (row["montant"] or 0)

    return calculer_pourcentages(resultats)


# ==========================================================
# Total des engagements (KPI)
# Alimente la carte KPI "Total engagements" affichée au-dessus de
# chaque donut côté frontend. Même filtre (périmètre d'exposition)
# et même colonne (ead_mad) que get_segmentation_date, converti en
# MMDH avec 1 décimale pour l'affichage.
# ==========================================================

def get_segmentation_total(engine, date_arret):
    """
    Retourne le total des engagements (toute la segmentation confondue)
    pour une date d'arrêt donnée, exprimé en MMDH.
    """

    sql = text(f"""
        SELECT
            SUM(ead_mad) AS montant_total
        FROM fact_engagement
        WHERE date_arret = :date_arret
        {FILTRE_PERIMETRE_EXPOSITION}
    """)

    with engine.connect() as conn:

        montant_total = conn.execute(
            sql,
            {"date_arret": date_arret}
        ).scalar()

    return convertir_mmdh(montant_total, decimales=1)


# ==========================================================
# Endpoint principal
# ==========================================================

@router.get("")
def dashboard_segmentation(dates: Optional[str] = None, date_arret: Optional[str] = None, engine=Depends(get_engine)):
    """
    Dashboard Segmentation Bâloise.

    Calcule la segmentation et le total (carte KPI) uniquement pour les
    dates de référence demandées via ?dates=cle1,cle2,... (DateSelector
    côté frontend). Sans ce paramètre, conserve l'ancien comportement :
    les 4 dates.
    """

    dates_ref = get_dates_reference(engine, date_arret)
    

    if dates_ref is None:
        return {
            "date_courante": [],
            "trimestre_precedent": [],
            "annee_precedente": [],
            "arret_annuel": [],
            "dates": {},
            "totaux": {},
            "dates_selectionnees": [],
        }

    cles_selectionnees = parser_dates_selectionnees(dates)

    resultat = {
        "dates": dict(dates_ref),
        "dates_selectionnees": cles_selectionnees,
        "totaux": {},
    }

    for cle in cles_selectionnees:
        date_arret_carte = dates_ref[cle]
        resultat[cle] = get_segmentation_date(engine, date_arret_carte)
        resultat["totaux"][cle] = get_segmentation_total(engine, date_arret_carte)

    return resultat