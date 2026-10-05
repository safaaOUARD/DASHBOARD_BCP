"""
Dependances FastAPI pour l'authentification et le controle des
permissions. Utilisees via Depends(...) sur chaque route protegee.
"""

from fastapi import Depends, HTTPException, Header
from sqlalchemy import text

from app.database import get_engine
from app.services.auth import decoder_token
import jwt as pyjwt


def get_current_user(authorization: str = Header(None), engine=Depends(get_engine)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentification requise.")

    token = authorization.split(" ", 1)[1]
    try:
        payload = decoder_token(token)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expiree, veuillez vous reconnecter.")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide.")

    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT * FROM utilisateur WHERE id = :id"), {"id": payload["sub"]}
        ).mappings().first()

    if not user or not user["actif"]:
        raise HTTPException(status_code=401, detail="Compte introuvable ou desactive.")

    return dict(user)


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Reserve aux administrateurs.")
    return user


def require_permission(permission: str):
    """permission : 'peut_importer' | 'peut_modifier' | 'peut_exporter'"""
    def _verifier(user=Depends(get_current_user)):
        if user["role"] == "admin":
            return user
        if not user.get(permission, False):
            raise HTTPException(status_code=403, detail="Vous n'avez pas la permission necessaire.")
        return user
    return _verifier