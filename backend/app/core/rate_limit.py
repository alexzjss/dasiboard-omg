# ── Rate Limiting — per-user sliding window ───────────────────────────────────
# Uses in-memory dict within a single process.
# Gunicorn is configured with --workers 1 (see backend/Dockerfile) to ensure
# all requests share the same process. For Redis-backed limiting in the future,
# replace _windows with a Redis ZSET per key.

import time
from collections import defaultdict
from fastapi import HTTPException

_windows: dict[str, list[float]] = defaultdict(list)


def check_rate(user_id: str, action: str, max_calls: int, window_secs: int) -> None:
    """
    Raise HTTP 429 if user has exceeded max_calls in the last window_secs seconds.
    Thread-safe for a single-process gunicorn deployment.
    """
    key    = f"{user_id}:{action}"
    now    = time.monotonic()
    cutoff = now - window_secs

    # Evict expired entries
    _windows[key] = [t for t in _windows[key] if t > cutoff]

    if len(_windows[key]) >= max_calls:
        retry_after = int(_windows[key][0] - cutoff) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Muitas requisições para '{action}'. Aguarde {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )

    _windows[key].append(now)


# ── Presets ───────────────────────────────────────────────────────────────────
def rate_create_event(user_id: str) -> None:
    check_rate(user_id, "create_event", max_calls=20, window_secs=300)

def rate_create_global_event(user_id: str) -> None:
    check_rate(user_id, "create_global_event", max_calls=5, window_secs=3600)

def rate_newsletter(user_id: str) -> None:
    check_rate(user_id, "newsletter", max_calls=3, window_secs=3600)

def rate_entity_event(user_id: str) -> None:
    check_rate(user_id, "entity_event", max_calls=10, window_secs=600)

def rate_grades(user_id: str) -> None:
    check_rate(user_id, "grades", max_calls=60, window_secs=60)

def rate_social(user_id: str) -> None:
    check_rate(user_id, "social", max_calls=30, window_secs=60)
