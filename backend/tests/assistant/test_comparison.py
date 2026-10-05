from app.assistant.analysis.insights import build_insights


def test_insight_is_derived_from_comparison():
    insights = build_insights({"comparisons": [{"against": "trimestre_precedent", "absolute": 5, "percentage": 10}]}, [])
    assert "5.00 MMDH" in insights[0]
