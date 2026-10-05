from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext
from sqlalchemy import text

from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(mot_de_passe: str) -> str:
    return pwd_context.hash(mot_de_passe)


def verifier_password(mot_de_passe: str, hash_stocke: str) -> bool:
    return pwd_context.verify(mot_de_passe, hash_stocke)


def creer_token(utilisateur: dict) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(utilisateur["id"]),
        "email": utilisateur["email"],
        "role": utilisateur["role"],
        "peut_importer": utilisateur["peut_importer"],
        "peut_modifier": utilisateur["peut_modifier"],
        "peut_exporter": utilisateur["peut_exporter"],
        "exp": expiration,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decoder_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


def authentifier(engine, email: str, mot_de_passe: str):
    with engine.connect() as conn:
        user = conn.execute(
            text("SELECT * FROM utilisateur WHERE email = :email"), {"email": email}
        ).mappings().first()

    if not user:
        return None
    if not user["actif"]:
        return "inactif"
    if not verifier_password(mot_de_passe, user["password_hash"]):
        return None
    return dict(user)


def journaliser_acces(engine, utilisateur_id, action, details=None):
    import json
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO journal_acces (utilisateur_id, action, details)
                VALUES (:uid, :action, :details)
            """),
            {"uid": utilisateur_id, "action": action, "details": json.dumps(details or {})},
        )