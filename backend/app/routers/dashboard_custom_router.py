from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from typing import Optional

from app.database import get_engine
from app.routers.dashboard_common import (
    get_dates_reference,
    convertir_mmdh,
    parser_dates_selectionnees,
    FILTRE_PERIMETRE_EXPOSITION,
)


router = APIRouter(
    prefix="/api/dashboard/custom",
    tags=["Dashboard - Personnalisée"]
)

SQL_SEGMENT_VF = """
    CASE
        WHEN fe.segment IN ('PARTICULIERS', 'CORPORATES') THEN 'CLIENTELES'
        WHEN fe.segment = 'BANQUES' THEN 'BANQUES'
        WHEN fe.segment = 'SOUVERAINS' THEN 'SOUVERAINS'
        WHEN fe.type = 'BANQUE_CENTRALE' THEN 'BANQUES CENTRALES'
        ELSE fe.segment
    END
"""

DIMENSIONS_AUTORISEES = {
    "pays":                   {"label": "Pays",                     "sql": "fe.risque_pays"},
    "filiale":                {"label": "Filiale",                  "sql": "fe.filiale"},
    "segment":                {"label": "Segment",                  "sql": "fe.segment"},
    "segment_vf":             {"label": "Segment VF",               "sql": SQL_SEGMENT_VF},
    "type":                   {"label": "Type",                     "sql": "fe.type"},
    "devise":                 {"label": "Devise",                   "sql": "fe.devise"},
    "type_engagement":        {"label": "Type engagement",          "sql": "fe.type_engagement"},
    "secteur":                {"label": "Secteur d'activité",       "sql": "fe.secteur_activite"},
    "zone":                   {"label": "Zone",                     "sql": "fe.zone"},
    "intra_group":            {"label": "Intra-groupe",             "sql": "fe.intra_group"},
    "wl":                     {"label": "Watchlist",                "sql": "fe.wl"},
    "b1":                     {"label": "B1",                       "sql": "fe.b1"},
    "b2":                     {"label": "B2",                       "sql": "fe.b2"},
    "b3":                     {"label": "B3",                       "sql": "fe.b3"},
    "perimetre_limites_pays": {"label": "Périmètre limites pays",   "sql": "fe.perimetre_limites_pays"},

    "rating": {
        "label": "Rating",
        "sql": "drp.note_retenue",
        "join": "LEFT JOIN dim_rating_pays drp "
                "ON drp.pays = fe.risque_pays AND drp.date_arret = fe.date_arret",
    },
}

# --- Mesures (axe Y) -------------------------------------------------

MESURES_AUTORISEES = {
    "nombre_dossiers": {
        "label": "Nombre de dossiers",
        "sql": "*",
        "aggregations": ["COUNT"],
        "mmdh": False,
    },
    "ead_mad": {
        "label": "Somme EAD (MMDH)",
        "sql": "fe.ead_mad",
        "aggregations": ["SUM", "AVG", "MIN", "MAX"],
        "mmdh": True,
    },
    "el_mad": {
        "label": "Somme EL (MMDH)",
        "sql": "fe.el_mad",
        "aggregations": ["SUM", "AVG", "MIN", "MAX"],
        "mmdh": True,
    },
    "encours": {
        "label": "Somme Encours (MMDH)",
        "sql": "fe.encours",
        "aggregations": ["SUM", "AVG", "MIN", "MAX"],
        "mmdh": True,
    },
    "encours_sains": {
        "label": "Somme Encours sains (MMDH)",
        "sql": "fe.encours_sains",
        "aggregations": ["SUM", "AVG", "MIN", "MAX"],
        "mmdh": True,
    },
    "encours_impayes": {
        "label": "Somme Encours impayés (MMDH)",
        "sql": "fe.encours_impayes",
        "aggregations": ["SUM", "AVG", "MIN", "MAX"],
        "mmdh": True,
    },
    "encours_restrectures": {
        "label": "Somme Encours restructurés (MMDH)",
        "sql": "fe.encours_restrectures",
        "aggregations": ["SUM", "AVG", "MIN", "MAX"],
        "mmdh": True,
    },
    "encours_douteux": {
        "label": "Somme Encours douteux (MMDH)",
        "sql": "fe.encours_douteux",
        "aggregations": ["SUM", "AVG", "MIN", "MAX"],
        "mmdh": True,
    },
    "stock_provision": {
        "label": "Somme Stock provision (MMDH)",
        "sql": "fe.stock_provision",
        "aggregations": ["SUM", "AVG", "MIN", "MAX"],
        "mmdh": True,
    },
    "nbr_impaye": {
        "label": "Nombre d'impayés",
        "sql": "fe.nbr_impaye",
        "aggregations": ["SUM", "AVG", "MIN", "MAX", "COUNT"],
        "mmdh": False,
    },
}


# --- Filtres combinables ---------------------------------------------

FILTRES_AUTORISES = dict(DIMENSIONS_AUTORISEES)
FILTRES_AUTORISES["perimetre_exposition"] = {
    "label": "Périmètre d'exposition",
    "sql": "fe.perimetre_exposition",
}



@router.get("/options")
def get_options():
    return {
        "dimensions": [
            {"key": k, "label": v["label"]} for k, v in DIMENSIONS_AUTORISEES.items()
        ],
        "mesures": [
            {"key": k, "label": v["label"], "aggregations": v["aggregations"]}
            for k, v in MESURES_AUTORISEES.items()
        ],
        "filtres": [
            {"key": k, "label": v["label"]} for k, v in FILTRES_AUTORISES.items()
        ],
    }


@router.get("/valeurs")
def get_valeurs_distinctes(
    colonne: str,
    date_arret: str,
    engine=Depends(get_engine),
):

    if colonne not in FILTRES_AUTORISES:
        raise HTTPException(
            status_code=400,
            detail=f"Colonne de filtre non autorisée : {colonne}"
        )

    config = FILTRES_AUTORISES[colonne]
    join_clause = config.get("join", "")

    sql = text(f"""
        SELECT DISTINCT
            {config['sql']} AS valeur
        FROM fact_engagement fe
        {join_clause}
        WHERE
            fe.date_arret = :date_arret
            AND {config['sql']} IS NOT NULL
        ORDER BY {config['sql']}
        LIMIT 500
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            sql,
            {"date_arret": date_arret}
        ).mappings().all()

    return {
        "valeurs": [row["valeur"] for row in rows]
    }

class MesureSelectionnee(BaseModel):
    cle: str
    aggregation: str


class RequeteDashboardCustom(BaseModel):
    dimensions: list[str]
    mesures: list[MesureSelectionnee]
    filters: Optional[dict] = {}
    date_arret: Optional[str] = None
    dates: Optional[list[str]] = None

def _alias_mesure(index, mesure):
    """Alias SQL unique et stable pour une mesure agregee. Prefixe par
    l'index de selection : deux mesures identiques (meme cle, meme
    agregation) ajoutees deux fois par erreur restent distinguables et
    ne collisionnent jamais avec le nom d'une dimension."""
    return f"m{index}_{mesure.aggregation.lower()}_{mesure.cle}"


def construire_requete(dimensions, mesures, filtres, date_arret):
    """
    Construit une requête SQL paramétrée et sûre à partir UNIQUEMENT des
    fragments SQL codés dans DIMENSIONS_AUTORISEES / MESURES_AUTORISEES /
    FILTRES_AUTORISES. Aucun nom de colonne fourni par le frontend n'est
    jamais concaténé directement : seules des CLÉS sont reçues, et ce sont
    les valeurs (filtres, date) qui passent en paramètres liés.

    Retourne (sql, params, mesures_mmdh) où mesures_mmdh est un dict
    {alias_sql: bool} précisant quelles colonnes du résultat doivent
    être converties en MMDH avant d'être renvoyées au frontend.
    """

    if not dimensions:
        raise HTTPException(status_code=400, detail="Au moins une dimension (colonne à regrouper) est requise.")

    if not mesures:
        raise HTTPException(status_code=400, detail="Au moins une mesure est requise.")

    for cle_dim in dimensions:
        if cle_dim not in DIMENSIONS_AUTORISEES:
            raise HTTPException(status_code=400, detail=f"Dimension non autorisée : {cle_dim}")

    for mesure in mesures:
        if mesure.cle not in MESURES_AUTORISEES:
            raise HTTPException(status_code=400, detail=f"Mesure non autorisée : {mesure.cle}")
        aggregations_valides = MESURES_AUTORISEES[mesure.cle]["aggregations"]
        if mesure.aggregation not in aggregations_valides:
            raise HTTPException(
                status_code=400,
                detail=f"Agrégation '{mesure.aggregation}' non compatible avec la mesure '{mesure.cle}'"
            )

    joins = []
    colonnes_dimensions = []
    for cle_dim in dimensions:
        config_dim = DIMENSIONS_AUTORISEES[cle_dim]
        if config_dim.get("join") and config_dim["join"] not in joins:
            joins.append(config_dim["join"])
        colonnes_dimensions.append((cle_dim, config_dim["sql"]))
    colonnes_mesures = []
    mesures_mmdh = {}
    for i, mesure in enumerate(mesures):
        config_mesure = MESURES_AUTORISEES[mesure.cle]
        if config_mesure.get("join") and config_mesure["join"] not in joins:
            joins.append(config_mesure["join"])

        alias = _alias_mesure(i, mesure)
        expression_sql = (
            "COUNT(*)" if config_mesure["sql"] == "*"
            else f"{mesure.aggregation}({config_mesure['sql']})"
        )
        colonnes_mesures.append((alias, expression_sql, config_mesure["label"], mesure.aggregation))
        mesures_mmdh[alias] = config_mesure["mmdh"]

    where_clauses = ["fe.date_arret = :date_arret"]
    params = {"date_arret": date_arret}

    for i, (cle_filtre, valeurs) in enumerate(filtres.items()):

        if cle_filtre not in FILTRES_AUTORISES:
            raise HTTPException(status_code=400, detail=f"Filtre non autorisé : {cle_filtre}")

        if not valeurs:
            continue

        config_filtre = FILTRES_AUTORISES[cle_filtre]

        if config_filtre.get("join") and config_filtre["join"] not in joins:
            joins.append(config_filtre["join"])

        nom_param = f"filtre_{i}"
        where_clauses.append(f"{config_filtre['sql']} = ANY(:{nom_param})")
        params[nom_param] = list(valeurs)

    select_dimensions = ", ".join(f"{sql} AS {alias}" for alias, sql in colonnes_dimensions)
    select_mesures = ", ".join(f"{expr} AS {alias}" for alias, expr, _, _ in colonnes_mesures)
    group_by = ", ".join(sql for _, sql in colonnes_dimensions)
    order_by = ", ".join(sql for _, sql in colonnes_dimensions)

    sql = text(f"""
        SELECT
            {select_dimensions},
            {select_mesures}
        FROM fact_engagement fe
        {' '.join(joins)}
        WHERE {' AND '.join(where_clauses)}
        GROUP BY {group_by}
        ORDER BY {order_by}
    """)

    colonnes_mesures_meta = [
        {"cle": alias, "label": label, "aggregation": aggregation}
        for alias, _, label, aggregation in colonnes_mesures
    ]

    return sql, params, mesures_mmdh, colonnes_mesures_meta


def executer_pour_une_date(engine, dimensions, mesures, filtres, date_arret):

    if date_arret is None:
        return []

    sql, params, mesures_mmdh, _ = construire_requete(dimensions, mesures, filtres, date_arret)

    with engine.connect() as conn:
        rows = conn.execute(sql, params).mappings().all()

    resultats = []
    for row in rows:
        ligne = {cle_dim: row[cle_dim] for cle_dim in dimensions}
        for alias, est_mmdh in mesures_mmdh.items():
            valeur = row[alias] or 0
            ligne[alias] = convertir_mmdh(valeur, decimales=2) if est_mmdh else valeur
        resultats.append(ligne)

    return resultats

@router.post("")
def dashboard_custom(
    requete: RequeteDashboardCustom,
    engine=Depends(get_engine),
):
    """
    Génère le dashboard personnalisé (tableau croisé), pour les dates
    de référence demandées via `dates` (DateSelector côté frontend),
    calculées à partir de `date_arret` (la date choisie dans le Header,
    qui devient T0) : T0, T-1, N-1, Arrêté annuel — même principe que
    les autres dashboards.
    """

    dates_ref = get_dates_reference(engine, requete.date_arret)

    if dates_ref is None:
        return {
            "dates": {},
            "dates_selectionnees": [],
            "colonnes_dimensions": [],
            "colonnes_mesures": [],
            "series": {},
        }

    # évite les dimensions dupliquées
    dimensions = list(dict.fromkeys(requete.dimensions))

    cles_selectionnees = parser_dates_selectionnees(
        ",".join(requete.dates) if requete.dates else None
    )

    _, _, _, colonnes_mesures_meta = construire_requete(
        dimensions, requete.mesures, requete.filters or {}, dates_ref["date_courante"]
    )

    series = {}
    for cle in cles_selectionnees:
        series[cle] = executer_pour_une_date(
            engine,
            dimensions,
            requete.mesures,
            requete.filters or {},
            dates_ref[cle],
        )

    colonnes_dimensions = [
        {
            "cle": cle_dim,
            "label": DIMENSIONS_AUTORISEES[cle_dim]["label"],
        }
        for cle_dim in dimensions
    ]

    return {
        "dates": dates_ref,
        "dates_selectionnees": cles_selectionnees,
        "colonnes_dimensions": colonnes_dimensions,
        "colonnes_mesures": colonnes_mesures_meta,
        "series": series,
    }