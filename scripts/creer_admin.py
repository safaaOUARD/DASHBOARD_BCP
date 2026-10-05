"""
Cree le premier compte admin. A lancer UNE FOIS depuis le dossier backend/ :

    venv\\Scripts\\activate.bat
    python scripts\\creer_admin.py
"""
import getpass
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR / "backend"))

from passlib.context import CryptContext
from sqlalchemy import text

from app.database.db import get_engine

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main():
    db_engine = get_engine()

    nom = input("Nom complet : ").strip()
    email = input("Email : ").strip().lower()
    mot_de_passe = getpass.getpass("Mot de passe : ")
    confirmation = getpass.getpass("Confirmez le mot de passe : ")

    if mot_de_passe != confirmation:
        print("Les mots de passe ne correspondent pas.")
        return

    hash_mdp = pwd_context.hash(mot_de_passe)

    with db_engine.begin() as conn:
        existe = conn.execute(
            text("SELECT id FROM utilisateur WHERE email = :email"), {"email": email}
        ).first()
        if existe:
            print(f"Un compte existe deja avec l'email {email}.")
            return

        conn.execute(
            text("""
                INSERT INTO utilisateur
                    (nom, email, role, password_hash, actif, peut_importer, peut_modifier, peut_exporter)
                VALUES
                    (:nom, :email, 'admin', :hash, TRUE, TRUE, TRUE, TRUE)
            """),
            {"nom": nom, "email": email, "hash": hash_mdp},
        )

    print(f"Compte admin cree avec succes pour {email}.")


if __name__ == "__main__":
    main()