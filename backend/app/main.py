from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine as db_engine
from app.config import FRONTEND_ORIGIN
from app.routers import setup_router
from app.assistant import router as assistant_router



import logging
from app.routers import dashboard_segmentation_router
from app.routers import dashboard_zone_router
from app.routers import dashboard_souverains_router
from app.routers import dashboard_rating_pays_router
from app.routers import dashboard_custom_router
from app.routers import dashboard_encours_souverains_router
from app.routers import (
    health_router, import_router, dashboard_router, filters_router,
    engagements_router, fichiers_router, modifications_router,
    historique_router, auth_router, utilisateurs_router, export_router,
)
logger = logging.getLogger(__name__)
app = FastAPI(
    title="Dashboard BCP API",
    description="API de consultation et d'import des engagements Banque Populaire",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Deja existants dans le projet (lecture/ecriture des fichiers -> inchanges)
app.include_router(health_router.router)
app.include_router(import_router.router)

# Nouveaux endpoints pour le dashboard React
app.include_router(dashboard_router.router)
app.include_router(filters_router.router)
app.include_router(engagements_router.router)
app.include_router(fichiers_router.router)
app.include_router(modifications_router.router)
app.include_router(historique_router.router)
app.include_router(auth_router.router)
app.include_router(utilisateurs_router.router)
app.include_router(export_router.router)
#dashboard 
app.include_router(dashboard_segmentation_router.router)
app.include_router(dashboard_zone_router.router)
app.include_router(dashboard_souverains_router.router)
app.include_router(dashboard_rating_pays_router.router)
app.include_router(dashboard_custom_router.router)
app.include_router(dashboard_encours_souverains_router.router)
app.include_router(setup_router.router)
app.include_router(assistant_router.router)
