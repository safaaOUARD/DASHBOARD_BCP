import re
import unicodedata
from datetime import date

MONTHS = {
    "janvier": 1, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5,
    "juin": 6, "juillet": 7, "aout": 8, "septembre": 9,
    "octobre": 10, "novembre": 11, "decembre": 12,
}
SEGMENTS = {
    "corporates": "CORPORATES", "corporate": "CORPORATES",
    "particuliers": "PARTICULIERS", "banques": "BANQUES",
    "banque": "BANQUES", "souverains": "SOUVERAINS", "souverain": "SOUVERAINS",
}
DASHBOARDS = {
    "baloise": "segmentation-baloise", "segmentation": "segmentation-baloise",
    "zone": "zones", "zones": "zones", "souverain": "souverains",
    "souverains": "souverains", "rating": "rating-pays", "pays": "rating-pays",
    "encours souverains": "encours-souverains", "personnalise": "custom",
}


def normalise(value: str) -> str:
    value = unicodedata.normalize("NFD", value.lower())
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", value).strip()


def extract_date(message: str) -> str | None:
    text = normalise(message)
    iso = re.search(r"\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b", text)
    if iso:
        return date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3))).isoformat()
    french = re.search(r"\b(\d{1,2})\s+(%s)\s+(20\d{2})\b" % "|".join(MONTHS), text)
    if french:
        return date(int(french.group(3)), MONTHS[french.group(2)], int(french.group(1))).isoformat()
    month_year = re.search(r"\b(%s)\s+(20\d{2})\b" % "|".join(MONTHS), text)
    if month_year:
        month, year = MONTHS[month_year.group(1)], int(month_year.group(2))
        # Les imports sont trimestriels : la date exacte sera validée en base par l'outil.
        quarter_end = ((month - 1) // 3 + 1) * 3
        import calendar
        return date(year, quarter_end, calendar.monthrange(year, quarter_end)[1]).isoformat()
    return None


def extract_entities(message: str) -> dict:
    text = normalise(message)
    result = {"date_t0": extract_date(message)}
    result["metric"] = "EL_MAD" if re.search(r"\b(el|perte attendue|expected loss)\b", text) else "EAD_MAD"
    result["segment"] = next((value for key, value in SEGMENTS.items() if re.search(rf"\b{key}\b", text)), None)
    result["dashboard"] = next((value for key, value in DASHBOARDS.items() if key in text), None)
    return result
