import shutil
from pathlib import Path
from typing import Optional

from app.dependencies import require_permission
from fastapi import APIRouter, UploadFile, BackgroundTasks, Depends
from sqlalchemy import text

from app.database import get_engine
from app.services.etl import (
    importer_fichier,
    importer_fichier_devises,
    importer_fichier_rating,
    calculer_hash_fichier,
    deja_importe,
    creer_journal_import,
    journaliser_ignore,
)

router = APIRouter(prefix="/api/import", tags=["import"])

DOSSIER_UPLOAD = Path("uploads")
DOSSIER_UPLOAD.mkdir(exist_ok=True)


def _enregistrer_fichier_uploade(file: UploadFile) -> Path:
    chemin_fichier = DOSSIER_UPLOAD / file.filename
    with chemin_fichier.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return chemin_fichier


def _demarrer_import(
    chemin_fichier: Path,
    engine,
    background_tasks: BackgroundTasks,
    fonction_import,
    type_import: str,
    message_lance: str,
):
    """Facteur commun aux 3 endpoints d'import (base/devise/rating) :

    Le controle de doublon (hash) et la creation de la ligne
    journal_import sont faits ICI, de facon SYNCHRONE, avant de repondre
    au client - contrairement a l'ancien fonctionnement ou tout (y
    compris la creation de la ligne journal_import) se passait dans la
    BackgroundTask, donc apres l'envoi de la reponse HTTP.

    Cela permet de renvoyer immediatement l'import_id au frontend, qui
    peut alors interroger GET /api/import/statut?import_id=... en
    polling pour suivre la progression, sans attendre la fin de l'ETL.

    Reutilise telles quelles les fonctions existantes du module ETL
    (calculer_hash_fichier, deja_importe, creer_journal_import,
    journaliser_ignore) : aucune logique metier n'est dupliquee ici.
    """
    fichier_hash = calculer_hash_fichier(str(chemin_fichier))

    if deja_importe(engine, fichier_hash):
        journaliser_ignore(engine, str(chemin_fichier), fichier_hash)
        return {
            "statut": "ignore",
            "message": "Ce fichier a deja ete importe precedemment.",
            "import_id": None,
        }

    import_id = creer_journal_import(engine, str(chemin_fichier), fichier_hash, type_import=type_import)
    background_tasks.add_task(fonction_import, str(chemin_fichier), engine, import_id)

    return {
        "statut": "en_cours",
        "message": message_lance,
        "import_id": import_id,
    }


@router.post("")
def importer(file: UploadFile, background_tasks: BackgroundTasks, engine=Depends(get_engine), _user=Depends(require_permission("peut_importer"))):
    chemin_fichier = _enregistrer_fichier_uploade(file)
    return _demarrer_import(
        chemin_fichier,
        engine,
        background_tasks,
        importer_fichier,
        type_import="base",
        message_lance=f"Import de {file.filename} lance en arriere-plan.",
    )


@router.get("/statut")
def statut_import(
    limit: int = 10,
    import_id: Optional[int] = None,
    engine=Depends(get_engine),
    _user=Depends(require_permission("peut_importer")),
):
    """Deux modes :

    - import_id fourni : etat d'UN import precis (id, statut, etape,
      progression, message d'erreur...) - utilise par le frontend en
      polling pour suivre la barre de progression pendant l'ETL.
    - import_id absent (comportement d'origine, inchange) : historique
      des `limit` imports les plus recents - alimente le module
      'Journal des mises a jour' et getDernierImport().
    """
    if import_id is not None:
        query = text(
            "SELECT id, nom_fichier, date_import, date_arret, nb_lignes, statut, "
            "message_erreur, etape, progression "
            "FROM journal_import WHERE id = :import_id"
        )
        with engine.connect() as conn:
            row = conn.execute(query, {"import_id": import_id}).mappings().first()
        return dict(row) if row else None

    query = text(
        "SELECT id, nom_fichier, date_import, date_arret, nb_lignes, statut, "
        "message_erreur, etape, progression "
        "FROM journal_import ORDER BY date_import DESC LIMIT :limit"
    )
    with engine.connect() as conn:
        rows = conn.execute(query, {"limit": limit}).mappings().all()
    return [dict(r) for r in rows]


#pour devise
@router.post("/devise")
def importer_devise(file: UploadFile, background_tasks: BackgroundTasks, engine=Depends(get_engine)):
    chemin_fichier = _enregistrer_fichier_uploade(file)
    return _demarrer_import(
        chemin_fichier,
        engine,
        background_tasks,
        importer_fichier_devises,
        type_import="devise",
        message_lance=f"Import du fichier de devises {file.filename} lance en arriere-plan.",
    )


#pour rating pays
@router.post("/rating")
def importer_rating(file: UploadFile, background_tasks: BackgroundTasks, engine=Depends(get_engine)):
    chemin_fichier = _enregistrer_fichier_uploade(file)
    return _demarrer_import(
        chemin_fichier,
        engine,
        background_tasks,
        importer_fichier_rating,
        type_import="rating",
        message_lance=f"Import du fichier de rating pays {file.filename} lance en arriere-plan.",
    )