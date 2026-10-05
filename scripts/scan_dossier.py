"""
Scanner du dossier de depot manuel des fichiers mensuels.

Pourquoi un scan planifie plutot qu'une surveillance temps reel ?
La cadence est mensuelle (un fichier par mois) - un service de
surveillance continue (ex: librairie 'watchdog') ajouterait un
processus permanent a maintenir pour un evenement rarissime. Un script
lance une fois par jour via une tache planifiee est plus simple, plus
robuste, et suffisant ici.

Mise en place (Linux, crontab) :
    0 6 * * * /usr/bin/python3 /chemin/vers/scan_dossier.py

Mise en place (Windows, Planificateur de taches) :
    Creer une tache declenchee tous les jours a 06:00, action =
    "python.exe" avec argument "C:\\chemin\\vers\\scan_dossier.py"

Le script est volontairement idempotent : le relancer plusieurs fois
sur les memes fichiers ne cree jamais de doublon (voir etl.deja_importe).
"""

import sys
from pathlib import Path

from app.database import get_engine
from app.etl import importer_fichier

DOSSIER_DEPOT_MANUEL = Path("data/depot_manuel")
EXTENSIONS_ACCEPTEES = {".xlsb", ".xlsx"}


def lister_fichiers_a_traiter():
    if not DOSSIER_DEPOT_MANUEL.exists():
        print(f"Dossier introuvable : {DOSSIER_DEPOT_MANUEL.resolve()}")
        return []
    return [
        f for f in DOSSIER_DEPOT_MANUEL.iterdir()
        if f.is_file() and f.suffix.lower() in EXTENSIONS_ACCEPTEES
    ]


def main():
    engine = get_engine()
    fichiers = lister_fichiers_a_traiter()

    if not fichiers:
        print("Aucun fichier trouve dans le dossier de depot manuel.")
        return

    print(f"{len(fichiers)} fichier(s) trouve(s), verification en cours...")
    for fichier in fichiers:
        print(f"--- {fichier.name} ---")
        try:
            resultat = importer_fichier(str(fichier), engine)
            if resultat["statut"] == "ignore":
                print(f"  Ignore : {resultat['message']}")
            else:
                print(f"  Importe : {resultat['lignes_importees']} lignes.")
        except Exception as exc:
            print(f"  ERREUR : {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
