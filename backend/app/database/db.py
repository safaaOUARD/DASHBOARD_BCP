import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Charger les variables du fichier .env
load_dotenv()

DATABASE_URL = (
    f"postgresql+psycopg2://"
    f"{os.getenv('DB_USER')}:"
    f"{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}:"
    f"{os.getenv('DB_PORT')}/"
    f"{os.getenv('DB_NAME')}"
)

# Création du moteur SQLAlchemy
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Création des sessions de base de données
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_engine():
    """Retourne le moteur PostgreSQL."""
    return engine


def get_db():
    """
    Retourne une session de base de données.
    Utilisé principalement avec FastAPI.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()