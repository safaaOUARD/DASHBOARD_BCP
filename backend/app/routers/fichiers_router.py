import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from app.database import get_engine
from app.dependencies import require_admin

router = APIRouter(prefix="/api/fichiers", tags=["fichiers"])


@router.get("")
def list_fichiers_importes(
    engine=Depends(get_engine),
    statut: Optional[str] = "succes",  
    type_import: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    conditions = []
    params = {}

    if statut and statut != "tous":
        conditions.append("statut = :statut")
        params["statut"] = statut
    if type_import:
        conditions.append("type_import = :type_import")
        params["type_import"] = type_import

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with engine.connect() as conn:
        total = conn.execute(
            text(f"SELECT COUNT(*) FROM journal_import {where_clause}"), params
        ).scalar()

        params["limit"] = page_size
        params["offset"] = (page - 1) * page_size

        rows = conn.execute(
            text(f"""
                SELECT id, nom_fichier, type_import, date_import, date_arret,
                       nb_lignes, statut, message_erreur
                FROM journal_import
                {where_clause}
                ORDER BY date_import DESC
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


@router.delete("/{import_id}")
def supprimer_fichier_importe(import_id: int, engine=Depends(get_engine), admin=Depends(require_admin)):
    with engine.connect() as conn:
        fichier = conn.execute(
            text("SELECT * FROM journal_import WHERE id = :id"), {"id": import_id}
        ).mappings().first()

    if not fichier:
        raise HTTPException(status_code=404, detail="Import introuvable.")

    with engine.begin() as conn:
        if fichier["type_import"] == "devise":
            conn.execute(text("DELETE FROM taux_change WHERE import_id = :id"), {"id": import_id})
            conn.execute(text("""
                UPDATE fact_engagement fe
                SET ead_mad = NULL, el_mad = NULL
                WHERE NOT EXISTS (
                    SELECT 1 FROM taux_change tc
                    WHERE tc.date_taux = fe.date_arret AND tc.devise = fe.devise
                )
                AND (fe.ead_mad IS NOT NULL OR fe.el_mad IS NOT NULL)
            """))
            nb_lignes_impactees = 0
        else:
            result = conn.execute(
                text("DELETE FROM fact_engagement WHERE import_id = :id"), {"id": import_id}
            )
            nb_lignes_impactees = result.rowcount

        conn.execute(text("DELETE FROM journal_import WHERE id = :id"), {"id": import_id})

        conn.execute(
            text("""
                INSERT INTO journal_acces (utilisateur_id, action, details)
                VALUES (:uid, 'suppression_import', :details)
            """),
            {
                "uid": admin["id"],
                "details": json.dumps({
                    "import_id": import_id,
                    "nom_fichier": fichier["nom_fichier"],
                    "type_import": fichier["type_import"],
                    "nb_lignes_supprimees": nb_lignes_impactees,
                }),
            },
        )

    return {
        "supprime": True,
        "nom_fichier": fichier["nom_fichier"],
        "nb_lignes_supprimees": nb_lignes_impactees,
    }