"""
Alimente le panneau de filtres du dashboard (Filiale / Type engagement /
Segment / Risque pays / WL / Zone). Lecture seule sur les tables de
dimension deja peuplees par l'ETL (services/etl.py -> upsert_dimensions)
et sur fact_engagement - aucune ecriture ici.

Note: "Intra groupe" n'est pas expose ici. La colonne correspondante ne
prend que les valeurs NaN/1 (indicateur de presence), donc le filtre est
gere cote front comme un choix Oui/Non fixe (voir FilterBar.jsx), sans
requete dediee.
"""

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.database import get_engine

router = APIRouter(prefix="/api/filters", tags=["filters"])


@router.get("")
def get_filter_options(
    date_arret: Optional[str] = None,
    engine=Depends(get_engine)
):
    with engine.connect() as conn:
        dates_arret = conn.execute(
            text("""
                SELECT DISTINCT date_arret
                FROM fact_engagement
                ORDER BY date_arret DESC
            """)
        ).scalars().all()

        if not date_arret:
            return {
                "filiales": [],
                "zones": [],
                "segments": [],
                "types": [],
                "types_engagement": [],
                "risques_pays": [],
                "wl": [],
                "dates_arret": dates_arret,
            }

        filiales = conn.execute(
            text("""
                SELECT DISTINCT
                    f.code,
                    f.nom,
                    f.zone
                FROM dim_filiale f
                JOIN fact_engagement e
                    ON e.filiale = f.code
                WHERE e.date_arret = :date_arret
                ORDER BY f.code
            """),
            {"date_arret": date_arret},
        ).mappings().all()

        zones = conn.execute(
            text("""
                SELECT DISTINCT
                    f.zone
                FROM dim_filiale f
                JOIN fact_engagement e
                    ON e.filiale = f.code
                WHERE e.date_arret = :date_arret
                  AND f.zone IS NOT NULL
                ORDER BY f.zone
            """),
            {"date_arret": date_arret},
        ).scalars().all()

        segments = conn.execute(
            text("""
                SELECT DISTINCT
                    s.code,
                    s.libelle
                FROM dim_segment s
                JOIN fact_engagement e
                    ON e.segment = s.code
                WHERE e.date_arret = :date_arret
                ORDER BY s.code
            """),
            {"date_arret": date_arret},
        ).mappings().all()

        types = conn.execute(
            text("""
                SELECT DISTINCT type
                FROM fact_engagement
                WHERE date_arret = :date_arret
                  AND type IS NOT NULL
                ORDER BY type
            """),
            {"date_arret": date_arret},
        ).scalars().all()

        types_engagement = conn.execute(
            text("""
                SELECT DISTINCT type_engagement
                FROM fact_engagement
                WHERE date_arret = :date_arret
                  AND type_engagement IS NOT NULL
                ORDER BY type_engagement
            """),
            {"date_arret": date_arret},
        ).scalars().all()

        risques_pays = conn.execute(
            text("""
                SELECT DISTINCT risque_pays
                FROM fact_engagement
                WHERE date_arret = :date_arret
                  AND risque_pays IS NOT NULL
                ORDER BY risque_pays
            """),
            {"date_arret": date_arret},
        ).scalars().all()

        wl = conn.execute(
        text("""
            SELECT DISTINCT wl
            FROM fact_engagement
            WHERE date_arret = :date_arret
              AND wl IS NOT NULL
            ORDER BY wl
        """),
        {"date_arret": date_arret},
        ).scalars().all()

    return {
    "filiales": [dict(f) for f in filiales],
    "zones": zones,
    "segments": [dict(s) for s in segments],
    "types": types,
    "types_engagement": types_engagement,
    "risques_pays": risques_pays,
    "wl": wl,
    "dates_arret": dates_arret,
}