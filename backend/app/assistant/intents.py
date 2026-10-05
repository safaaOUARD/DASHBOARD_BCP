import re
from .entities import normalise

GENERATE = {"pdf": "GENERATE_PDF", "powerpoint": "GENERATE_POWERPOINT", "ppt": "GENERATE_POWERPOINT", "excel": "GENERATE_EXCEL"}


def detect_intent(message: str) -> str:
    text = normalise(message)
    if any(word in text for word in ("regle", "signifie", "definition", "explique")):
        return "EXPLAIN_BUSINESS_RULE"
    for word, intent in GENERATE.items():
        if word in text and any(v in text for v in ("genere", "rapport", "produis", "telecharge")):
            return intent
    if any(v in text for v in ("quatre arrets", "4 arrets", "compare", "comparaison", "evolution", "variation")):
        return "COMPARE_FOUR_REFERENCE_DATES"
    if any(v in text for v in ("analyse", "dashboard", "principales hausses", "principales baisses")):
        return "ANALYZE_DASHBOARD"
    if any(v in text for v in ("top filiale", "filiales")):
        return "GET_TOP_FILIALES"
    if "secteur" in text:
        return "GET_TOP_SECTORS"
    if "devise" in text or "currency" in text:
        return "GET_CURRENCY_EXPOSURE"
    if "nombre" in text or "combien de dossiers" in text or "exposition" in text and "nombre" in text:
        return "GET_NUMBER_EXPOSURES"
    if "el" in text or "perte attendue" in text:
        return "GET_TOTAL_EL"
    if "segment" in text or any(v in text for v in ("corporates", "particuliers", "banques", "souverains")):
        return "GET_SEGMENT_EAD"
    return "GET_TOTAL_EAD"
