from app.assistant.entities import extract_entities
from app.assistant.intents import detect_intent
from app.assistant.context import get_context, save_context
from app.assistant.business_rules import explain
from app.assistant.tools.kpi_tools import get_kpi, get_distribution
from app.assistant.analysis.comparison import compare_four_dates, contributors
from app.assistant.analysis.insights import build_insights


class AssistantEngine:
    def process(self, message, context, engine):
        raise NotImplementedError


class RuleBasedEngine(AssistantEngine):
    def process(self, message, context, engine):
        intent = detect_intent(message)
        entities = extract_entities(message)
        merged = {**context, **{key: value for key, value in entities.items() if value is not None}}
        metric = merged.get("metric", "EAD_MAD")
        date_t0 = merged.get("date_t0")
        filters = dict(merged.get("filters") or {})
        if merged.get("segment"):
            filters["segment"] = merged["segment"]
        if intent == "EXPLAIN_BUSINESS_RULE":
            return {"intent": intent, "message": explain(message), "data": {}, "context": merged}
        if intent in {"GET_TOP_FILIALES", "GET_TOP_SECTORS", "GET_CURRENCY_EXPOSURE"}:
            group = {"GET_TOP_FILIALES": "filiale", "GET_TOP_SECTORS": "secteur", "GET_CURRENCY_EXPOSURE": "devise"}[intent]
            data = get_distribution(engine, date_t0, group, metric)
            return {"intent": intent, "message": f"Voici les principaux éléments par {group}.", "data": {"distribution": data}, "context": merged}
        if intent in {"COMPARE_FOUR_REFERENCE_DATES", "ANALYZE_DASHBOARD"}:
            comparison = compare_four_dates(engine, date_t0, metric, filters)
            tops = contributors(engine, date_t0, metric, "segment") if comparison["dates"] else []
            insights = build_insights(comparison, tops)
            return {"intent": intent, "message": " ".join(insights), "data": {**comparison, "contributors": tops, "insights": insights}, "context": merged}
        metric_for_query = "NUMBER_EXPOSURES" if intent == "GET_NUMBER_EXPOSURES" else metric
        kpi = get_kpi(engine, date_t0, metric_for_query, filters)
        return {"intent": intent, "message": f"{kpi['label']} au {kpi['date_arret']} : {kpi['value']} {kpi['unit']}.", "data": {"kpi": kpi}, "context": merged}


def process_chat(message, supplied_context, user, db_engine):
    session_id = supplied_context.get("session_id")
    context = get_context(user["id"], session_id, supplied_context)
    result = RuleBasedEngine().process(message, context, db_engine)
    save_context(user["id"], session_id, result["context"])
    return result
