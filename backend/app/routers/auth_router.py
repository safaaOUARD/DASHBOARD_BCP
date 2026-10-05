from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_engine
from app.services.auth import authentifier, creer_token, journaliser_acces
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginPayload(BaseModel):
    email: str
    mot_de_passe: str


@router.post("/login")
def login(payload: LoginPayload, engine=Depends(get_engine)):
    resultat = authentifier(engine, payload.email.lower(), payload.mot_de_passe)

    if resultat is None:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
    if resultat == "inactif":
        raise HTTPException(status_code=403, detail="Ce compte a ete desactive.")

    token = creer_token(resultat)
    journaliser_acces(engine, resultat["id"], "connexion")

    return {
        "token": token,
        "utilisateur": {
            "id": resultat["id"],
            "nom": resultat["nom"],
            "email": resultat["email"],
            "role": resultat["role"],
            "peut_importer": resultat["peut_importer"],
            "peut_modifier": resultat["peut_modifier"],
            "peut_exporter": resultat["peut_exporter"],
        },
    }


@router.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "id": user["id"],
        "nom": user["nom"],
        "email": user["email"],
        "role": user["role"],
        "peut_importer": user["peut_importer"],
        "peut_modifier": user["peut_modifier"],
        "peut_exporter": user["peut_exporter"],
    }