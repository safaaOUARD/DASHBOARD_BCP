from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from app.database import get_engine
from app.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

router = APIRouter(prefix="/api/engagements", tags=["engagements"])

COLONNES_LISTE = """
    id, type, filiale, filiale, devise, nom_client, cle, type_engagement,
    encours, intra_group, segment, risque_pays, encours_sains, encours_impayes,
    encours_restrectures, encours_douteux, stock_provision, nbr_impaye,
    anteriorite_impaye, code_ape, lib_ape, wl, b1, b2, b3, bucket,  date_maj, date_arret,
    el, secteur_activite, el_mad, ead_mad, el_mad_trim_prec, ead_mad_trim_prec, el_mad_annee_prec, ead_mad_annee_prec , ead_mad_arret_annuel,
    el_mad_arret_annuel , perimetre_exposition, perimetre_limites_pays, zone
"""


@router.get("")
def list_engagements(
    engine=Depends(get_engine),
    filiale: Optional[str] = None,
    zone: Optional[str] = None,
    date_arret: Optional[date] = None,
    segment: Optional[str] = None,
    devise: Optional[str] = None,
    q: Optional[str] = Query(None, description="Recherche client / cle"),
    perimetre_exposition: Optional[int] = Query(None),
    fichier: Optional[str] = Query(None, description="Recherche par nom de fichier importe"),
    fichiers: Optional[str] = Query(None, description="Noms de fichiers separes par des virgules"),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    has_filter = any([filiale, zone, date_arret, segment, devise, q, fichier,fichiers])

    joins = ""
    conditions = []
    params = {}

    if fichiers:
        noms = [f.strip() for f in fichiers.split(",") if f.strip()]
        joins = "JOIN journal_import ji ON ji.id = fe.import_id"
        conditions.append("ji.nom_fichier = ANY(:noms)")
        params["noms"] = noms
    elif fichier:
        joins = "JOIN journal_import ji ON ji.id = fe.import_id"
        conditions.append("ji.nom_fichier ILIKE :fichier")
        params["fichier"] = f"%{fichier}%"
    if filiale:
        conditions.append("fe.filiale = :filiale")
        params["filiale"] = filiale
    if zone:
        conditions.append("fe.zone = :zone")
        params["zone"] = zone
    if date_arret:
        conditions.append("fe.date_arret = :date_arret")
        params["date_arret"] = date_arret
    if segment:
        conditions.append("fe.segment = :segment")
        params["segment"] = segment
    if devise:
        conditions.append("fe.devise = :devise")
        params["devise"] = devise
    if q:
        conditions.append("(fe.nom_client ILIKE :q OR fe.cle ILIKE :q)")
        params["q"] = f"%{q}%"
    if perimetre_exposition is not None:
        conditions.append("fe.perimetre_exposition = :perimetre_exposition")
        params["perimetre_exposition"] = perimetre_exposition

    with engine.connect() as conn:
        if not has_filter:
            # Vue par defaut : apercu limite sur le dernier arrete
            latest_date = conn.execute(
                text("SELECT MAX(date_arret) FROM fact_engagement")
            ).scalar()

            if not latest_date:
                return {
                    "items": [], "total": 0, "page": 1, "page_size": page_size,
                    "total_pages": 1, "default_view": True,
                }

            total = conn.execute(
                text("SELECT COUNT(*) FROM fact_engagement WHERE date_arret = :d"),
                {"d": latest_date},
            ).scalar()

            rows = conn.execute(
                text(
                    f"""
                    SELECT {COLONNES_LISTE}
                    FROM fact_engagement
                    WHERE date_arret = :d
                    ORDER BY encours DESC NULLS LAST
                    LIMIT :limit
                    """
                ),
                {"d": latest_date, "limit": page_size},
            ).mappings().all()

            return {
                "items": [dict(r) for r in rows],
                "total": total,
                "page": 1,
                "page_size": page_size,
                "total_pages": max(1, -(-total // page_size)),
                "default_view": True,
            }

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        total = conn.execute(
            text(f"SELECT COUNT(*) FROM fact_engagement fe {joins} {where_clause}"),
            params,
        ).scalar()

        params["limit"] = page_size
        params["offset"] = (page - 1) * page_size

        rows = conn.execute(
            text(
                f"""
                SELECT fe.id, fe.type, fe.filiale, fe.filiale, fe.devise,
                       fe.nom_client, fe.cle, fe.type_engagement, fe.encours,
                       fe.intra_group, fe.segment, fe.risque_pays, fe.encours_sains,
                       fe.encours_impayes, fe.encours_restrectures, fe.encours_douteux,
                       fe.stock_provision, fe.nbr_impaye, fe.anteriorite_impaye,
                       fe.code_ape, fe.lib_ape, fe.wl, fe.b1, fe.b2, fe.b3, fe.bucket, 
                       fe.date_maj, fe.date_arret, fe.el, fe.secteur_activite,
                       fe.el_mad, fe.ead_mad, fe.el_mad_trim_prec, fe.ead_mad_trim_prec, fe.el_mad_annee_prec, fe.ead_mad_annee_prec,fe.ead_mad_arret_annuel,
                       fe.el_mad_arret_annuel , fe.perimetre_exposition ,fe.perimetre_limites_pays, fe.zone 
                FROM fact_engagement fe
                {joins}
                {where_clause}
                ORDER BY fe.date_arret DESC, fe.id
                LIMIT :limit OFFSET :offset
                """
            ),
            params,
        ).mappings().all()

    return {
        "items": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),
        "default_view": False,
    }
