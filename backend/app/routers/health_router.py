from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.database import get_engine

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
def health_check(engine=Depends(get_engine)):
    """Verifie que l'API repond et que la connexion PostgreSQL fonctionne."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:
        db_status = f"erreur: {exc}"

    return {"status": "ok", "database": db_status}
