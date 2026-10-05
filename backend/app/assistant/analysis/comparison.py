from app.routers.dashboard_common import get_dates_reference
from app.assistant.tools.kpi_tools import get_kpi, get_distribution


def compare_four_dates(engine, date_t0, metric="EAD_MAD", filters=None):
    dates = get_dates_reference(engine, date_t0)
    if not dates:
        return {"dates": {}, "series": [], "comparisons": []}
    series = []
    for key, value in dates.items():
        kpi = get_kpi(engine, str(value), metric, filters)
        series.append({"key": key, "date_arret": str(value), "value": kpi["value"], "unit": kpi["unit"]})
    current = next(item for item in series if item["key"] == "date_courante")
    comparisons = []
    for previous in series:
        if previous["key"] == "date_courante":
            continue
        absolute = current["value"] - previous["value"]
        percentage = None if previous["value"] == 0 else round(absolute * 100 / previous["value"], 2)
        comparisons.append({"against": previous["key"], "absolute": round(absolute, 2), "percentage": percentage})
    return {"dates": {key: str(value) for key, value in dates.items()}, "series": series, "comparisons": comparisons}


def contributors(engine, date_t0, metric="EAD_MAD", group="segment"):
    dates = get_dates_reference(engine, date_t0)
    if not dates:
        return []
    now = {x["label"]: x["value"] for x in get_distribution(engine, str(dates["date_courante"]), group, metric)}
    before = {x["label"]: x["value"] for x in get_distribution(engine, str(dates["trimestre_precedent"]), group, metric)}
    values = [{"label": name, "variation": round(now.get(name, 0) - before.get(name, 0), 2)} for name in set(now) | set(before)]
    return sorted(values, key=lambda item: abs(item["variation"]), reverse=True)[:5]
