from sqlalchemy import text
from app.routers.dashboard_common import FILTRE_PERIMETRE_EXPOSITION, convertir_mmdh

METRICS = {
    "EAD_MAD": ("ead_mad", "EAD"),
    "EL_MAD": ("el_mad", "EL"),
}
GROUPS = {
    "segment": "segment", "filiale": "filiale", "secteur": "secteur_activite", "devise": "devise",
}


def _where(filters: dict, date_t0: str):
    clauses = ["date_arret = :date_arret", "perimetre_exposition = 1"]
    params = {"date_arret": date_t0}
    for name, column in GROUPS.items():
        value = filters.get(name)
        if value:
            clauses.append(f"{column} = :{name}")
            params[name] = value
    return " AND ".join(clauses), params


def get_kpi(engine, date_t0: str, metric="EAD_MAD", filters=None):
    filters = filters or {}
    if metric == "NUMBER_EXPOSURES":
        expression, label = "COUNT(*)", "Nombre d’expositions"
    else:
        column, label = METRICS.get(metric, METRICS["EAD_MAD"])
        expression = f"COALESCE(SUM({column}), 0)"
    where, params = _where(filters, date_t0)
    with engine.connect() as conn:
        value = conn.execute(text(f"SELECT {expression} FROM fact_engagement WHERE {where}"), params).scalar() or 0
    return {"metric": metric, "label": label, "date_arret": str(date_t0), "value": int(value) if metric == "NUMBER_EXPOSURES" else convertir_mmdh(value), "unit": "nombre" if metric == "NUMBER_EXPOSURES" else "MMDH"}


def get_distribution(engine, date_t0: str, group: str, metric="EAD_MAD", limit=10):
    if group not in GROUPS:
        raise ValueError("Dimension non autorisée")
    if metric not in METRICS:
        metric = "EAD_MAD"
    column, _ = METRICS[metric]
    group_column = GROUPS[group]
    sql = text(f"""
        SELECT COALESCE({group_column}::text, 'Non renseigné') AS label,
               COALESCE(SUM({column}), 0) AS value
        FROM fact_engagement
        WHERE date_arret = :date_arret {FILTRE_PERIMETRE_EXPOSITION}
        GROUP BY {group_column}
        ORDER BY value DESC
        LIMIT :limit
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"date_arret": date_t0, "limit": limit}).mappings().all()
    return [{"label": row["label"], "value": convertir_mmdh(row["value"]), "unit": "MMDH"} for row in rows]
