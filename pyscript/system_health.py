"""Capture ERROR/CRITICAL system log events into a 24h rolling buffer.

Pure buffer logic lives in pyscript/modules/system_errors_buf.py (unit-tested
by shell/test_system_errors_buf.py). This script wires the core
`system_log_event` bus event to that logic and stores the result in the
`buffer` attribute of `pyscript.system_health`, read by
entities/templates/system_health.yaml and automations/system/health_report.yaml.

`system_health.save_review` stores the latest AI health review (attribute
`review` + `review_ts`) for the health dashboard. `system_health.clear` resets
the buffer (operator action). Tracebacks are never stored; messages are
sanitized at the LLM boundary.
"""
import time

from system_errors_buf import sanitize_message, update_buffer

ENTITY = "pyscript.system_health"


@event_trigger("system_log_event", "level in ['ERROR', 'CRITICAL']")
def capture_system_error(level=None, name=None, message=None, timestamp=None, count=None, **kwargs):
    """Sanitize and record one ERROR/CRITICAL log event into the buffer."""
    try:
        msg = sanitize_message(message)
        if not msg:
            return
        ts = int(timestamp) if timestamp else int(time.time())
        try:
            count = int(count)
        except (TypeError, ValueError):
            count = 1
        # Idempotent: registers pyscript.system_health with RestoreState so the
        # buffer survives restarts (re-runs each HA session after a restart).
        # Read-modify-set the full attr dict so we never drop sibling attrs
        # (e.g. the persisted review) regardless of set() merge semantics.
        await state.persist(ENTITY, default_value="0", default_attributes={"buffer": []})
        attrs = dict(state.getattr(ENTITY) or {})
        buffer = update_buffer(attrs.get("buffer") or [], name or "unknown", level or "ERROR", msg, count, ts)
        attrs["buffer"] = buffer
        state.set(ENTITY, str(len(buffer)), new_attributes=attrs)
    except Exception:
        # Never raise from the trigger. A warning won't re-trigger this handler
        # (it only fires on ERROR/CRITICAL), so no feedback loop.
        log.warning("system_health error capture failed", exc_info=True)


@service("system_health.save_review")
def save_review(review=None, **kwargs):
    """Store the latest AI health review for the dashboard (keeps the buffer)."""
    await state.persist(ENTITY, default_value="0", default_attributes={"buffer": []})
    attrs = dict(state.getattr(ENTITY) or {})
    attrs["review"] = (review or "").strip()
    attrs["review_ts"] = int(time.time())
    state.set(ENTITY, str(len(attrs.get("buffer") or [])), new_attributes=attrs)


@service("system_health.clear")
def clear_system_health(**kwargs):
    """Reset the 24h error buffer (operator action). Keeps the last review."""
    await state.persist(ENTITY, default_value="0", default_attributes={"buffer": []})
    attrs = dict(state.getattr(ENTITY) or {})
    attrs["buffer"] = []
    state.set(ENTITY, "0", new_attributes=attrs)
