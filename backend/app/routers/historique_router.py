from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from app.database import get_engine

router = APIRouter(prefix="/api/historique", tags=["historique"])


@router.get("")
def list_historique(
    engine=Depends(get_engine),
    id_ligne: Optional[int] = None,
    utilisateur: Optional[str] = None,
    date_debut: Optional[date] = None,
    date_fin: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    conditions = []
    params = {}

    if id_ligne is not None:
        conditions.append("id_ligne = :id_ligne")
        params["id_ligne"] = id_ligne
    if utilisateur:
        conditions.append("utilisateur ILIKE :utilisateur")
        params["utilisateur"] = f"%{utilisateur}%"
    if date_debut:
        conditions.append("date_modification::date >= :date_debut")
        params["date_debut"] = date_debut
    if date_fin:
        conditions.append("date_modification::date <= :date_fin")
        params["date_fin"] = date_fin

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with engine.connect() as conn:
        total = conn.execute(
            text(f"SELECT COUNT(*) FROM journal_modifications {where_clause}"), params
        ).scalar()

        params["limit"] = page_size
        params["offset"] = (page - 1) * page_size

        rows = conn.execute(
            text(f"""
                SELECT id, date_modification, utilisateur, table_modifiee, id_ligne,
                       nom_colonne, ancienne_valeur, nouvelle_valeur, motif, import_id
                FROM journal_modifications
                {where_clause}
                ORDER BY date_modification DESC
                LIMIT :limit OFFSET :offset
            """),
            params,
        ).mappings().all()

    return {
        "items": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),
    }