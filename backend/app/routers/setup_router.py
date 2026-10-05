"""
Endpoints de configuration initiale de l'application.

Tant que la table "utilisateur" est vide (tout premier demarrage,
juste apres `docker compose up -d`), le frontend affiche une page de
configuration permettant de creer le premier administrateur, a la
place de la page de connexion habituelle.

Une fois ce premier compte cree, ces endpoints redeviennent inertes :
/create-admin refuse toute nouvelle creation (409) des qu'il existe
au moins un utilisateur en base.
"""

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import text

from app.database import get_engine
from app.services.auth import hash_password, creer_token, journaliser_acces

router = APIRouter(prefix="/api/setup", tags=["setup"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

VERROU_SETUP = 987654321


class SetupStatus(BaseModel):
    initialized: bool


class CreationAdminPayload(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    confirmation_mot_de_passe: str

    @field_validator("nom")
    @classmethod
    def valider_nom(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Le nom est requis.")
        return v

    @field_validator("email")
    @classmethod
    def valider_email(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Adresse email invalide.")
        return v

    @field_validator("mot_de_passe")
    @classmethod
    def valider_mot_de_passe(cls, v: str) -> str:
        if len(v or "") < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caracteres.")
        return v


def _nb_utilisateurs(conn) -> int:
    return conn.execute(text("SELECT COUNT(*) FROM utilisateur")).scalar()


@router.get("/status", response_model=SetupStatus)
def get_setup_status(engine=Depends(get_engine)):
    with engine.connect() as conn:
        nb = _nb_utilisateurs(conn)
    return {"initialized": nb > 0}


@router.post("/create-admin", status_code=201)
def creer_premier_admin(payload: CreationAdminPayload, engine=Depends(get_engine)):
    if payload.mot_de_passe != payload.confirmation_mot_de_passe:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas.")

    with engine.begin() as conn:
        conn.execute(text("SELECT pg_advisory_xact_lock(:cle)"), {"cle": VERROU_SETUP})

        if _nb_utilisateurs(conn) > 0:
            raise HTTPException(
                status_code=409,
                detail="La configuration initiale a deja ete effectuee.",
            )

        email_existe = conn.execute(
            text("SELECT id FROM utilisateur WHERE email = :email"),
            {"email": payload.email},
        ).first()
        if email_existe:
            raise HTTPException(status_code=409, detail="Un compte existe deja avec cet email.")

        hash_mdp = hash_password(payload.mot_de_passe)

        result = conn.execute(
            text("""
                INSERT INTO utilisateur
                    (nom, email, role, password_hash, actif,
                     peut_importer, peut_modifier, peut_exporter)
                VALUES
                    (:nom, :email, 'admin', :hash, TRUE, TRUE, TRUE, TRUE)
                RETURNING id, nom, email, role, actif,
                          peut_importer, peut_modifier, peut_exporter
            """),
            {
                "nom": payload.nom,
                "email": payload.email,
                "hash": hash_mdp,
            },
        )
        utilisateur = dict(result.mappings().first())

    token = creer_token(utilisateur)
    journaliser_acces(engine, utilisateur["id"], "creation_admin_initial")

    return {
        "token": token,
        "utilisateur": {
            "id": utilisateur["id"],
            "nom": utilisateur["nom"],
            "email": utilisateur["email"],
            "role": utilisateur["role"],
            "peut_importer": utilisateur["peut_importer"],
            "peut_modifier": utilisateur["peut_modifier"],
            "peut_exporter": utilisateur["peut_exporter"],
        },
    }