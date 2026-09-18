"""Capture ERROR/CRITICAL system log events into a 24h rolling buffer.

Pure buffer logic lives in pyscript/modules/system_errors_buf.py (unit-tested
by shell/test_system_errors_buf.py). This script only wires the core
`system_log_event` bus event to that logic and stores the result in the
`buffer` attribute of `pyscript.system_errors`, read by
entities/templates/system_health.yaml and automations/system/health_report.yaml.

Also exposes `system_errors.clear` to reset the buffer (operator action).
Tracebacks are never stored; messages are sanitized at the LLM boundary.
"""
import time

from system_errors_buf import sanitize_message, update_buffer

ENTITY = "pyscript.system_errors"


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
        # Idempotent: registers pyscript.system_errors with RestoreState so the
        # buffer survives restarts (re-runs each HA session after a restart).
        await state.persist(ENTITY, default_value="0", default_attributes={"buffer": []})
        attrs = state.getattr(ENTITY) or {}
        buffer = attrs.get("buffer") or []
        buffer = update_buffer(buffer, name or "unknown", level or "ERROR", msg, count, ts)
        state.set(ENTITY, str(len(buffer)), new_attributes={"buffer": buffer})
    except Exception:
        # Never raise from the trigger. A warning won't re-trigger this handler
        # (it only fires on ERROR/CRITICAL), so no feedback loop.
        log.warning("system_errors capture failed", exc_info=True)


@service("system_errors.clear")
def clear_system_errors(**kwargs):
    """Reset the 24h error buffer (operator action)."""
    state.set(ENTITY, "0", new_attributes={"buffer": []})
