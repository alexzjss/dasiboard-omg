# ── Rate Limiting — per-user, in-memory sliding window ───────────────────────
# Simple token-bucket / sliding-window counter using a dict.
# Works per-process; for multi-process deployments replace with Redis.

import time
from collections import defaultdict
from fastapi import HTTPException, Request

# Structure: { "user_id:action": [(timestamp, ...), ...] }
_windows: dict[str, list[float]] = defaultdict(list)

def check_rate(user_id: str, action: str, max_calls: int, window_secs: int) -> None:
    """
    Raise HTTP 429 if user_id has exceeded max_calls in the last window_secs.
    Call this at the start of any rate-limited endpoint.
    """
    key  = f"{user_id}:{action}"
    now  = time.monotonic()
    cutoff = now - window_secs

    # Evict old entries
    _windows[key] = [t for t in _windows[key] if t > cutoff]

    if len(_windows[key]) >= max_calls:
        wait = int(_windows[key][0] - cutoff) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Muitas requisições para '{action}'. Tente novamente em {wait}s.",
            headers={"Retry-After": str(wait)},
        )

    _windows[key].append(now)


# ── Presets ───────────────────────────────────────────────────────────────────
def rate_create_event(user_id: str) -> None:
    """Max 20 event creations per 5 minutes."""
    check_rate(user_id, "create_event", max_calls=20, window_secs=300)

def rate_create_global_event(user_id: str) -> None:
    """Max 5 global event creations per hour."""
    check_rate(user_id, "create_global_event", max_calls=5, window_secs=3600)

def rate_newsletter(user_id: str) -> None:
    """Max 3 newsletter posts per hour."""
    check_rate(user_id, "newsletter", max_calls=3, window_secs=3600)

def rate_entity_event(user_id: str) -> None:
    """Max 10 entity event creations per 10 minutes."""
    check_rate(user_id, "entity_event", max_calls=10, window_secs=600)

def rate_grades(user_id: str) -> None:
    """Max 60 grade mutations per minute (bulk-safe)."""
    check_rate(user_id, "grades", max_calls=60, window_secs=60)
