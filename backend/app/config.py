import os

from dotenv import load_dotenv

load_dotenv()

# Origine autorisee pour les appels du frontend React (CORS)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# Taille de page par defaut pour les listes paginees (module dashboard)
DEFAULT_PAGE_SIZE = int(os.getenv("DEFAULT_PAGE_SIZE", "50"))
MAX_PAGE_SIZE = int(os.getenv("MAX_PAGE_SIZE", "200"))
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "changez-moi-en-production-cle-secrete")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 heures