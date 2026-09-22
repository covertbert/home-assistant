"""Persist latest AI system-health review for health dashboard."""
import time

ENTITY = "pyscript.system_health"


@service("system_health.save_review")
def save_review(review=None, **kwargs):
    """Store latest AI health review for dashboard."""
    await state.persist(ENTITY, default_value="0", default_attributes={})
    state.set(
        ENTITY,
        "0",
        new_attributes={"review": (review or "").strip(), "review_ts": int(time.time())},
    )
