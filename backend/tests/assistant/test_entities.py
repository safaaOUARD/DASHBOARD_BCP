from app.assistant.entities import extract_date, extract_entities


def test_extract_french_date():
    assert extract_date("EAD au 30 juin 2026") == "2026-06-30"


def test_extract_segment_and_metric():
    values = extract_entities("Donne-moi l'EL des Corporates au 30 juin 2026")
    assert values["segment"] == "CORPORATES"
    assert values["metric"] == "EL_MAD"
