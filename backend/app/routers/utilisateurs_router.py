from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_engine
from app.dependencies import require_admin
from app.services.auth import hash_password
from sqlalchemy import text

router = APIRouter(prefix="/api/utilisateurs", tags=["utilisateurs"])


class NouvelUtilisateur(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    role: str = "consultant"  
    peut_importer: bool = False
    peut_modifier: bool = False
    peut_exporter: bool = False


class MiseAJourUtilisateur(BaseModel):
    nom: Optional[str] = None
    role: Optional[str] = None
    actif: Optional[bool] = None
    peut_importer: Optional[bool] = None
    peut_modifier: Optional[bool] = None
    peut_exporter: Optional[bool] = None


@router.get("")
def lister_utilisateurs(engine=Depends(get_engine), _admin=Depends(require_admin)):
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT id, nom, email, role, actif,
                       peut_importer, peut_modifier, peut_exporter, created_at
                FROM utilisateur ORDER BY created_at DESC
            """)
        ).mappings().all()
    return [dict(r) for r in rows]


@router.post("")
def creer_utilisateur(payload: NouvelUtilisateur, engine=Depends(get_engine), _admin=Depends(require_admin)):
    if payload.role not in ("admin", "consultant"):
        raise HTTPException(status_code=400, detail="role doit etre 'admin' ou 'consultant'.")

    hash_mdp = hash_password(payload.mot_de_passe)

    with engine.begin() as conn:
        existe = conn.execute(
            text("SELECT id FROM utilisateur WHERE email = :email"),
            {"email": payload.email.lower()},
        ).first()
        if existe:
            raise HTTPException(status_code=409, detail="Un compte existe deja avec cet email.")

        result = conn.execute(
            text("""
                INSERT INTO utilisateur
                    (nom, email, role, password_hash, actif,
                     peut_importer, peut_modifier, peut_exporter)
                VALUES
                    (:nom, :email, :role, :hash, TRUE, :pi, :pm, :pe)
                RETURNING id
            """),
            {
                "nom": payload.nom, "email": payload.email.lower(), "role": payload.role,
                "hash": hash_mdp, "pi": payload.peut_importer,
                "pm": payload.peut_modifier, "pe": payload.peut_exporter,
            },
        )
        nouvel_id = result.scalar_one()

    return {"id": nouvel_id, "message": "Compte cree avec succes."}


@router.patch("/{utilisateur_id}")
def modifier_utilisateur(
    utilisateur_id: int,
    payload: MiseAJourUtilisateur,
    engine=Depends(get_engine),
    admin=Depends(require_admin),
):
    champs = payload.dict(exclude_unset=True)
    if not champs:
        raise HTTPException(status_code=400, detail="Aucune modification fournie.")

    # Empeche de se desactiver soi-meme si on est le dernier admin actif
    if champs.get("actif") is False and utilisateur_id == admin["id"]:
        with engine.connect() as conn:
            nb_admins = conn.execute(
                text("SELECT COUNT(*) FROM utilisateur WHERE role = 'admin' AND actif = TRUE")
            ).scalar()
        if nb_admins <= 1:
            raise HTTPException(status_code=400, detail="Impossible : vous etes le dernier admin actif.")

    set_clause = ", ".join(f"{k} = :{k}" for k in champs)
    champs["id"] = utilisateur_id
    with engine.begin() as conn:
        conn.execute(text(f"UPDATE utilisateur SET {set_clause} WHERE id = :id"), champs)

    return {"message": "Utilisateur mis a jour."}