"""Pure buffer logic for the system-error capture (no HA/pyscript deps).

Holds a 24h rolling buffer of distinct ERROR/CRITICAL log records, each with
its core-reported repeat count. Unit-tested by shell/test_system_errors_buf.py.
"""
import re

# Tunables
MAX_AGE_HOURS = 24  # drop entries not re-seen within this window
MAX_ENTRIES = 10  # max distinct errors kept (newest first)
MSG_MAX = 200  # truncate sanitized message

# Mask secrets at the LLM boundary: Bearer tokens and user:pass@ in URLs.
_BEARER_RE = re.compile(r"(?i)Bearer\s+[A-Za-z0-9._~+/=-]+")
_URLCRED_RE = re.compile(r"([A-Za-z][A-Za-z0-9+.-]*://)[^@/\s]+@")
_WS_RE = re.compile(r"\s+")


def sanitize_message(raw):
    """Join message variants, mask secrets, collapse whitespace, truncate."""
    if raw is None:
        return ""
    text = " ".join(raw) if isinstance(raw, (list, tuple)) else str(raw)
    text = _BEARER_RE.sub("Bearer ***", text)
    text = _URLCRED_RE.sub(r"\1***@", text)
    text = _WS_RE.sub(" ", text).strip()
    return text[:MSG_MAX]


def _dedup_key(name, msg):
    """Identity of an error site: logger name + leading message text."""
    return f"{name} {msg[:60]}"


def update_buffer(buffer, name, level, msg, count, ts):
    """Merge one error event into the buffer; return a new list, newest first.

    buffer: list of {name, level, msg, count, ts(int epoch)}
    count:  core-reported repeats for this site this HA session
    ts:     epoch seconds of this event

    An entry is replaced when it is the same error site. Its count is the
    number of occurrences within the window: bumped once per event (core fires
    a separate count=1 event per repeat) but never below core's reported count
    (core may dedup some repeats into one higher-count event). It is aged out
    when not re-seen within MAX_AGE_HOURS. The list is capped at MAX_ENTRIES,
    newest first.
    """
    key = _dedup_key(name, msg)
    out = []
    seen = False
    for e in buffer:
        if ts - int(e.get("ts", 0)) >= MAX_AGE_HOURS * 3600:
            continue  # aged out
        if _dedup_key(e.get("name", ""), e.get("msg", "")) == key:
            e = dict(e)
            e["count"] = max(int(e.get("count", 1)) + 1, int(count))
            e["ts"] = ts
            e["level"] = level
            seen = True
        out.append(e)
    if not seen:
        out.insert(0, {"name": name, "level": level, "msg": msg, "count": int(count), "ts": ts})
    return out[:MAX_ENTRIES]
