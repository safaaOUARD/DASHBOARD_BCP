from copy import deepcopy

_CONTEXTS: dict[str, dict] = {}


def get_context(user_id, session_id, supplied: dict) -> dict:
    key = f"{user_id}:{session_id or 'default'}"
    saved = deepcopy(_CONTEXTS.get(key, {}))
    saved.update({name: value for name, value in supplied.items() if value not in (None, "", {})})
    _CONTEXTS[key] = saved
    return saved


def save_context(user_id, session_id, context: dict) -> None:
    _CONTEXTS[f"{user_id}:{session_id or 'default'}"] = deepcopy(context)
