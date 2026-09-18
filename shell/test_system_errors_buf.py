"""Unit tests for the pure system-error buffer logic.

Dependency-free: run with `python3 shell/test_system_errors_buf.py`.
Exits non-zero on any failure. Tests pyscript/modules/system_errors_buf.py
(the pure logic only; the HA/pyscript glue in pyscript/system_errors.py is
thin and exercised end-to-end in Home Assistant).
"""
import sys
from pathlib import Path

# Import the pure module from the pyscript modules folder.
_MODULES = Path(__file__).resolve().parent.parent / "pyscript" / "modules"
sys.path.insert(0, str(_MODULES))

import system_errors_buf as buf  # noqa: E402

FAILS = []


def check(name, actual, expected):
    if actual == expected:
        print(f"ok   {name}")
        return
    print(f"FAIL {name}\n     expected: {expected!r}\n     actual:   {actual!r}")
    FAILS.append(name)


def main():
    # --- sanitize_message ---
    check(
        "sanitize masks bearer + url creds",
        buf.sanitize_message(
            [
                "Connection failed: Bearer abc123.DEF-456_789= via "
                "https://user:pass123@api.example.com/v1 retrying"
            ]
        ),
        "Connection failed: Bearer *** via https://***@api.example.com/v1 retrying",
    )
    check("sanitize plain string", buf.sanitize_message("plain error text"), "plain error text")
    check("sanitize joins list variants", buf.sanitize_message(["a", "b", "c"]), "a b c")
    check("sanitize none -> empty", buf.sanitize_message(None), "")
    check(
        "sanitize truncates to MSG_MAX",
        len(buf.sanitize_message("x" * 500)) <= buf.MSG_MAX,
        True,
    )
    check(
        "sanitize collapses whitespace",
        buf.sanitize_message(["multi   whitespace\ncollapsed here"]),
        "multi whitespace collapsed here",
    )

    # --- update_buffer ---
    now = 1795000000
    check(
        "new entry",
        buf.update_buffer([], "mqtt", "ERROR", "boom", 1, now),
        [{"name": "mqtt", "level": "ERROR", "msg": "boom", "count": 1, "ts": now}],
    )
    check(
        "same site bumps count and ts",
        buf.update_buffer(
            [{"name": "mqtt", "level": "ERROR", "msg": "boom", "count": 3, "ts": now - 3600}],
            "mqtt",
            "ERROR",
            "boom",
            5,
            now,
        ),
        [{"name": "mqtt", "level": "ERROR", "msg": "boom", "count": 5, "ts": now}],
    )
    check(
        "count accumulates across restart (bump per event, floor at core count)",
        buf.update_buffer(
            [{"name": "mqtt", "level": "ERROR", "msg": "boom", "count": 7, "ts": now - 3600}],
            "mqtt",
            "ERROR",
            "boom",
            2,
            now,
        )[0]["count"],
        8,
    )
    acc = []
    for i in range(5):
        acc = buf.update_buffer(acc, "mqtt", "ERROR", "boom", 1, now + i)
    check("5 separate count=1 events accumulate to 5", acc[0]["count"], 5)
    check(
        "distinct sites both kept",
        len(
            buf.update_buffer(
                [{"name": "a", "level": "ERROR", "msg": "alpha", "count": 1, "ts": now}],
                "b",
                "ERROR",
                "beta",
                1,
                now,
            )
        ),
        2,
    )
    check(
        "newest first",
        buf.update_buffer(
            [{"name": "a", "level": "ERROR", "msg": "alpha", "count": 1, "ts": now - 100}],
            "b",
            "ERROR",
            "beta",
            1,
            now,
        )[0]["name"],
        "b",
    )
    check(
        "ages out stale entries",
        buf.update_buffer(
            [{"name": "old", "level": "ERROR", "msg": "stale", "count": 9, "ts": now - 90000}],
            "new",
            "ERROR",
            "fresh",
            1,
            now,
        ),
        [{"name": "new", "level": "ERROR", "msg": "fresh", "count": 1, "ts": now}],
    )
    check(
        "caps at MAX_ENTRIES, newest first",
        buf.update_buffer(
            [
                {"name": f"n{i}", "level": "ERROR", "msg": f"m{i}", "count": 1, "ts": now - i}
                for i in range(buf.MAX_ENTRIES)
            ],
            "extra",
            "ERROR",
            "overflow",
            1,
            now,
        ),
        [
            {"name": "extra", "level": "ERROR", "msg": "overflow", "count": 1, "ts": now}
        ]
        + [
            {"name": f"n{i}", "level": "ERROR", "msg": f"m{i}", "count": 1, "ts": now - i}
            for i in range(buf.MAX_ENTRIES - 1)
        ],
    )

    print()
    if FAILS:
        print(f"{len(FAILS)} FAILURE(S): {FAILS}")
        sys.exit(1)
    print("all checks passed")


if __name__ == "__main__":
    main()
