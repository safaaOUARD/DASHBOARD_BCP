"""
Importe automatiquement TOUS les fichiers deja presents dans le dossier
uploads (Base, devise, Rating pays), sans passer par l'upload manuel sur
l'interface web.

Le type de chaque fichier est devine a partir de son NOM (insensible a
la casse) :
    - commence par "base"    -> importer_fichier()          (fichier de base)
    - commence par "devise"  -> importer_fichier_devises()  (taux de change)
    - commence par "rating"  -> importer_fichier_rating()   (rating pays)
    - tout autre nom est ignore (affiche en warning), rien n'est suppose.

Ordre de traitement : Base -> devise -> Rating. Les Base sont importees
en premier (meme si les taux de change ne sont pas encore tous
disponibles, ead_mad restera NULL pour l'instant), puis les devise, qui
recalculent RETROACTIVEMENT ead_mad/el_mad pour TOUTES les lignes deja
en base (cf. appliquer_taux_change(engine, import_id=None) dans
importer_fichier_devises) -> l'ordre exact entre Base et devise n'a donc
pas d'impact sur le resultat final, seulement sur le nombre de lignes
NULL a un instant intermediaire.

Chaque import est idempotent (deja_importe() se base sur le hash du
CONTENU du fichier) : relancer ce script plusieurs fois, ou apres avoir
ajoute de nouveaux fichiers dans le dossier, ne reimporte jamais deux
fois le meme contenu.

⚠️ ATTENTION : Base mars 2026.xlsb / Base mars 2026.xlsx / Base_mars_2026.xlsx
dans votre dossier semblent etre le MEME fichier en 3 formats/copies
differents. Comme le hash se calcule sur le contenu binaire, des FICHIERS
DIFFERENTS (meme si les donnees metier sont identiques) seront tous les
trois importes -> RISQUE DE DOUBLONS dans fact_engagement (importer_fichier
fait un simple append, pas un upsert). Verifiez/supprimez les doublons
avant de lancer ce script, ou lancez d'abord en --dry-run pour voir la
liste de ce qui sera importe.

Usage :
    python importer_dossier.py "C:\\chemin\\vers\\uploads"
    python importer_dossier.py "C:\\chemin\\vers\\uploads" --dry-run
"""

import sys
from pathlib import Path

from etl import importer_fichier, importer_fichier_devises, importer_fichier_rating

# ⚠️ À adapter si votre projet importe l'engine autrement
# (ex: from app.database import get_engine ; engine = get_engine())
from sqlalchemy import create_engine

DATABASE_URL ="postgresql+psycopg2://postgres:safaa@localhost:5432/bcp_dashboard"

EXTENSIONS_SUPPORTEES = {".xlsx", ".xlsb", ".xls"}


def classifier(nom_fichier):
    nom = nom_fichier.lower()
    if nom.startswith("rating"):
        return "rating"
    if nom.startswith("devise"):
        return "devise"
    if nom.startswith("base"):
        return "base"
    return None


def lister_fichiers_par_type(dossier):
    dossier = Path(dossier)
    par_type = {"base": [], "devise": [], "rating": []}
    ignores = []

    for f in sorted(dossier.iterdir()):
        if not f.is_file() or f.suffix.lower() not in EXTENSIONS_SUPPORTEES:
            continue
        type_fichier = classifier(f.name)
        if type_fichier is None:
            ignores.append(f.name)
        else:
            par_type[type_fichier].append(f)

    return par_type, ignores


def executer_import(type_fichier, chemin, engine):
    if type_fichier == "base":
        return importer_fichier(str(chemin), engine)
    if type_fichier == "devise":
        return importer_fichier_devises(str(chemin), engine)
    if type_fichier == "rating":
        return importer_fichier_rating(str(chemin), engine)
    raise ValueError(f"Type de fichier inconnu : {type_fichier}")


def main():
    if len(sys.argv) < 2:
        print("Usage : python importer_dossier.py <dossier_uploads> [--dry-run]")
        sys.exit(1)

    dossier = sys.argv[1]
    dry_run = "--dry-run" in sys.argv[2:]

    par_type, ignores = lister_fichiers_par_type(dossier)

    print("===== Fichiers detectes =====")
    for type_fichier, fichiers in par_type.items():
        print(f"\n{type_fichier.upper()} ({len(fichiers)}) :")
        for f in fichiers:
            print(f"  - {f.name}")

    if ignores:
        print(f"\n⚠️ Fichiers ignores (nom non reconnu, ni 'base', ni 'devise', ni 'rating') :")
        for nom in ignores:
            print(f"  - {nom}")

    if dry_run:
        print("\n--dry-run : aucun import reellement effectue.")
        return

    engine = create_engine(DATABASE_URL)

    print("\n===== Import : Base =====")
    for f in par_type["base"]:
        print(f"\n-- {f.name}")
        print(executer_import("base", f, engine))

    print("\n===== Import : devise =====")
    for f in par_type["devise"]:
        print(f"\n-- {f.name}")
        print(executer_import("devise", f, engine))

    print("\n===== Import : Rating pays =====")
    for f in par_type["rating"]:
        print(f"\n-- {f.name}")
        print(executer_import("rating", f, engine))

    print("\n===== Terminé =====")


if __name__ == "__main__":
    main()