from io import BytesIO
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from openpyxl import Workbook

from app.database import get_engine
from app.dependencies import require_permission

router = APIRouter(prefix="/api/export", tags=["export"])

COLONNES_VALIDES = {
    "id", "type", "filiale", "filiale", "devise", "nom_client", "cle",
    "type_engagement", "encours", "intra_group", "segment", "risque_pays",
    "encours_sains", "encours_impayes", "encours_restrectures",
    "encours_douteux", "stock_provision", "nbr_impaye", "anteriorite_impaye",
    "code_ape", "lib_ape", "wl", "b1", "b2", "b3", "date_maj", "date_arret",
    "el", "secteur_activite", "el_mad", "ead_mad", "zone",
}


class ExportPayload(BaseModel):
    colonnes: List[str]
    ids: Optional[List[int]] = None
    filiale: Optional[str] = None
    zone: Optional[str] = None
    date_arret: Optional[date] = None
    segment: Optional[str] = None
    devise: Optional[str] = None
    q: Optional[str] = None
    fichier: Optional[str] = None
    fichiers: Optional[str] = None


@router.post("/excel")
def exporter_excel(
    payload: ExportPayload,
    engine=Depends(get_engine),
    _user=Depends(require_permission("peut_exporter")),
):
    colonnes = [c for c in payload.colonnes if c in COLONNES_VALIDES]
    if not colonnes:
        return {"detail": "Aucune colonne valide selectionnee."}

    colonnes_sql = ", ".join(f"fe.{c}" for c in colonnes)
    joins = ""
    conditions = []
    params = {}

    if payload.ids:
        conditions.append("fe.id = ANY(:ids)")
        params["ids"] = payload.ids
    else:
        if payload.fichiers:
            noms = [f.strip() for f in payload.fichiers.split(",") if f.strip()]
            joins = "JOIN journal_import ji ON ji.id = fe.import_id"
            conditions.append("ji.nom_fichier = ANY(:noms)")
            params["noms"] = noms
        elif payload.fichier:
            joins = "JOIN journal_import ji ON ji.id = fe.import_id"
            conditions.append("ji.nom_fichier ILIKE :fichier")
            params["fichier"] = f"%{payload.fichier}%"

        if payload.filiale:
            conditions.append("fe.filiale = :filiale")
            params["filiale"] = payload.filiale
        if payload.zone:
            conditions.append("fe.zone = :zone")
            params["zone"] = payload.zone
        if payload.date_arret:
            conditions.append("fe.date_arret = :date_arret")
            params["date_arret"] = payload.date_arret
        if payload.segment:
            conditions.append("fe.segment = :segment")
            params["segment"] = payload.segment
        if payload.devise:
            conditions.append("fe.devise = :devise")
            params["devise"] = payload.devise
        if payload.q:
            conditions.append("(fe.nom_client ILIKE :q OR fe.cle ILIKE :q)")
            params["q"] = f"%{payload.q}%"

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    wb = Workbook(write_only=True)
    ws = wb.create_sheet("Engagements")
    ws.append([c.replace("_", " ").capitalize() for c in colonnes])

    with engine.connect().execution_options(stream_results=True) as conn:
        result = conn.execute(
            text(f"SELECT {colonnes_sql} FROM fact_engagement fe {joins} {where_clause}"),
            params,
        )
        while True:
            chunk = result.fetchmany(5000)
            if not chunk:
                break
            for row in chunk:
               ws.append([v if v is not None else "" for v in row])

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=export_engagements.xlsx"},
    )