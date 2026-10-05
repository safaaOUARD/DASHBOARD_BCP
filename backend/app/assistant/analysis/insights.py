def build_insights(comparison: dict, contributors: list[dict]) -> list[str]:
    result = []
    t1 = next((item for item in comparison.get("comparisons", []) if item["against"] == "trimestre_precedent"), None)
    if t1:
        direction = "progresse" if t1["absolute"] >= 0 else "recule"
        percentage = "n.d." if t1["percentage"] is None else f"{abs(t1['percentage']):.2f} %"
        result.append(f"L’indicateur {direction} de {abs(t1['absolute']):.2f} MMDH entre T-1 et T0 ({percentage}).")
    if contributors:
        leader = contributors[0]
        direction = "hausse" if leader["variation"] >= 0 else "baisse"
        result.append(f"Le principal contributeur est {leader['label']} avec une {direction} de {abs(leader['variation']):.2f} MMDH.")
    return result or ["Aucune comparaison n’est disponible pour la date demandée."]
