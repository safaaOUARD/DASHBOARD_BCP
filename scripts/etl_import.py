import os
import sys
sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from app.database.db import get_engine
from app.services.etl import importer_fichier

def main(chemin_xlsb):
    engine = get_engine()
    resultat = importer_fichier(chemin_xlsb, engine)

    if resultat["statut"] == "ignore":
        print(f"Fichier ignore : {resultat['message']}")
    else:
        print(f"Import reussi : {resultat['lignes_importees']} lignes inserees.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python etl_import.py <chemin_fichier.xlsb>")
        sys.exit(1)
    main(sys.argv[1])
