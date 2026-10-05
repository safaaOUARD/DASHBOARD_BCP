from app.assistant.intents import detect_intent


def test_detect_kpi_intent():
    assert detect_intent("Quel est l'EAD des banques ?") == "GET_SEGMENT_EAD"


def test_detect_comparison_intent():
    assert detect_intent("Compare les quatre arrêts") == "COMPARE_FOUR_REFERENCE_DATES"
