RULES = {
    "ead": "L’EAD (Exposure at Default) correspond à l’exposition au défaut. Dans ce tableau de bord, l’EAD MAD est l’exposition convertie en dirhams selon les taux de change de l’arrêté.",
    "el": "L’EL (Expected Loss) est la perte attendue. Toute valeur communiquée par l’assistant provient des montants calculés et stockés dans le dashboard.",
    "t0": "T0 est la date d’arrêt sélectionnée. T-1 est le trimestre précédent, N-1 la même date de l’année précédente et l’arrêté annuel le 31 décembre de l’année précédente.",
    "segmentation": "La segmentation Bâloise regroupe notamment CLIENTÈLES, BANQUES, SOUVERAINS et BANQUE CENTRALE selon les règles métier déjà appliquées par le dashboard.",
}


def explain(message: str) -> str:
    lower = message.lower()
    for key, answer in RULES.items():
        if key in lower:
            return answer
    return "Je peux expliquer l’EAD, l’EL, les dates de référence T0/T-1/N-1, ou la segmentation Bâloise."
