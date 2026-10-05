from typing import Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_engine
from app.dependencies import require_permission
from app.services.modifications import (
    modifier_ligne_fact_engagement,
    creer_ligne_fact_engagement,
    supprimer_ligne_fact_engagement,
)

router = APIRouter(prefix="/api/engagements", tags=["modifications"])


class ModificationPayload(BaseModel):
    motif: Optional[str] = None
    valeurs: Dict[str, Any]


class CreationPayload(BaseModel):
    motif: Optional[str] = None
    valeurs: Dict[str, Any]


@router.post("")
def creer_engagement(
    payload: CreationPayload,
    engine=Depends(get_engine),
    user=Depends(require_permission("peut_modifier")),
):
    try:
        return creer_ligne_fact_engagement(engine, payload.valeurs, utilisateur=user["nom"], motif=payload.motif)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/{id_ligne}")
def modifier_engagement(
    id_ligne: int,
    payload: ModificationPayload,
    engine=Depends(get_engine),
    user=Depends(require_permission("peut_modifier")),
):
    if not payload.valeurs:
        raise HTTPException(status_code=400, detail="Aucune valeur a modifier fournie.")
    try:
        return modifier_ligne_fact_engagement(
            engine, id_ligne, payload.valeurs, utilisateur=user["nom"], motif=payload.motif,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{id_ligne}")
def supprimer_engagement(
    id_ligne: int,
    motif: Optional[str] = None,
    engine=Depends(get_engine),
    user=Depends(require_permission("peut_modifier")),
):
    try:
        return supprimer_ligne_fact_engagement(engine, id_ligne, utilisateur=user["nom"], motif=motif)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))