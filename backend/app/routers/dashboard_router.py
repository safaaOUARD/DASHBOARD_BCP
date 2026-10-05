"""
Cartes KPI affichées en haut du dashboard.
Calculées sur la date d'arrêté sélectionnée, ou sur le dernier arrêté
disponible si aucune date n'est fournie.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from app.database import get_engine

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    date_arret: Optional[date] = Query(
        None,
        description="Date d'arrêté à utiliser (format YYYY-MM-DD). "
                     "Si omise, la dernière date disponible en base est utilisée.",
    ),
    engine=Depends(get_engine),
):
    with engine.connect() as conn:

        if date_arret is None:
            date_arret = conn.execute(
                text("SELECT MAX(date_arret) FROM fact_engagement")
            ).scalar()

        if date_arret is None:
            return {
                "date_arret_reference": None,
                "ead_perimetre_exposition_mmad": 0,
                "ead_souverains_engagements_titres_mmad": 0,
                "el_engagement_mmad": 0,
                "el_titres_mmad": 0,
                "dernier_import": None,
            }

        row = conn.execute(
            text(
                """
                SELECT

                    COALESCE(
                        SUM(
                            CASE
                                WHEN perimetre_exposition = 1
                                THEN ead_mad
                                ELSE 0
                            END
                        ),0
                    ) / 1000000.0 AS ead_perimetre_exposition_mmad,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN segment = 'SOUVERAINS'
                                     AND type IN ('ENGAGEMENT','TITRE ET BDT')
                                THEN ead_mad
                                ELSE 0
                            END
                        ),0
                    ) / 1000000.0 AS ead_souverains_engagements_titres_mmad,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN type = 'ENGAGEMENT'
                                THEN el_mad
                                ELSE 0
                            END
                        ),0
                    ) / 1000000.0 AS el_engagement_mmad,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN type = 'TITRE ET BDT'
                                THEN el_mad
                                ELSE 0
                            END
                        ),0
                    ) / 1000000.0 AS el_titres_mmad

                FROM fact_engagement
                WHERE date_arret = :d
                """
            ),
            {"d": date_arret},
        ).mappings().first()

        dernier_import = conn.execute(
            text("SELECT MAX(date_import) FROM journal_import")
        ).scalar()

    return {
        "date_arret_reference": date_arret,
        "ead_perimetre_exposition_mmad": float(row["ead_perimetre_exposition_mmad"] or 0),
        "ead_souverains_engagements_titres_mmad": float(row["ead_souverains_engagements_titres_mmad"] or 0),
        "el_engagement_mmad": float(row["el_engagement_mmad"] or 0),
        "el_titres_mmad": float(row["el_titres_mmad"] or 0),
        "dernier_import": dernier_import,
    }