from sqlalchemy import text


# ==========================================================
# Dates de référence
# ==========================================================
def get_dates_reference(engine, date_arret=None):
    """
    Détermine automatiquement les 4 dates utilisées
    dans les dashboards.

    Exemple :

        Date courante      : 31/03/2026
        Trim précédent     : 31/12/2025
        Année précédente   : 31/03/2025
        Arrêt annuel       : 31/12/2025
    """

    with engine.connect() as conn:

        if date_arret:
         date_courante = conn.execute(
        text("SELECT CAST(:d AS date)"),
        {"d": date_arret},
     ).scalar()
        else:
          date_courante = conn.execute(
        text("""
            SELECT MAX(date_arret)
            FROM fact_engagement
        """)
         ).scalar()

        if date_courante is None:
            return None

        trimestre_precedent = conn.execute(
            text("""
                SELECT
                (
                    date_trunc(
                        'month',
                        CAST(:d AS date) - interval '3 months'
                    )
                    + interval '1 month - 1 day'
                )::date
            """),
            {"d": date_courante},
        ).scalar()

        annee_precedente = conn.execute(
            text("""
                SELECT
                make_date(
                    extract(year from :d)::int - 1,
                    extract(month from :d)::int,
                    extract(day from :d)::int
                )
            """),
            {"d": date_courante},
        ).scalar()

        arret_annuel = conn.execute(
            text("""
                SELECT
                make_date(
                    extract(year from :d)::int - 1,
                    12,
                    31
                )
            """),
            {"d": date_courante},
        ).scalar()

    return {
        "date_courante": date_courante,
        "trimestre_precedent": trimestre_precedent,
        "annee_precedente": annee_precedente,
        "arret_annuel": arret_annuel,
    }


# ==========================================================
# Selection des dates de reference (parametre query "dates")
# ==========================================================
CLES_DATES_REFERENCE = (
    "date_courante",
    "trimestre_precedent",
    "annee_precedente",
    "arret_annuel",
)


def parser_dates_selectionnees(dates_param):
    """
    Parse le parametre query "dates" (chaine "cle1,cle2,...") en liste
    de cles valides parmi CLES_DATES_REFERENCE.

    Si le parametre est absent, vide, ou ne contient aucune cle valide
    (ancien appel sans selection, ou valeur corrompue), retourne les 4
    cles : comportement identique a celui d'avant l'ajout du selecteur
    de dates cote frontend.
    """

    if not dates_param:
        return list(CLES_DATES_REFERENCE)

    cles_demandees = [c.strip() for c in dates_param.split(",")]
    cles_valides = [c for c in cles_demandees if c in CLES_DATES_REFERENCE]

    return cles_valides or list(CLES_DATES_REFERENCE)


# ==========================================================
# Périmètre d'exposition
# ==========================================================

FILTRE_PERIMETRE_EXPOSITION = "AND perimetre_exposition = 1"
# ==========================================================
# Conversion en MMDH
# ==========================================================

MAD_VERS_MMDH = 1_000_000_000


def convertir_mmdh(montant_mad, decimales=2):
    """
    Convertit un montant exprimé en MAD vers des MMDH,
    arrondi proprement.
    """

    if montant_mad is None:
        return 0.0

    return round(montant_mad / MAD_VERS_MMDH, decimales)


# ==========================================================
# Calcul des pourcentages
# ==========================================================

def calculer_pourcentages(resultats, label_key="segment", decimales_mmdh=2):

    total = sum(resultats.values())

    if total == 0:
        return []

    donnees = []

    for cle, montant_mad in resultats.items():

        donnees.append(
            {
                label_key: cle,
                "nombre": convertir_mmdh(montant_mad, decimales_mmdh),
                "pourcentage": round(montant_mad * 100 / total, 2),
            }
        )

    donnees.sort(
        key=lambda x: x["pourcentage"],
        reverse=True,
    )

    return donnees