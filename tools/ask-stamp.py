#!/usr/bin/env python3
"""Footer helper: request timestamp + this session's emoji rule.

Prints four tab-separated lines for the agent's response footer:

  stamp   Wed Aug 5, 2026 · 4:16 PM EDT
  ask     <first 300 chars of my most recent request>
  theme   forest
  rule    <the 40-emoji / 80-char rule line, ready to paste>

Timestamp: read from the pi session JSONL ($PI_SESSION_FILE or --session <path>),
which records a true ISO timestamp for every user message, so it stays correct
when a session is resumed days or months later. The hidden pi extension uses
--timestamp-ms and --ask to supply the current request before it has been written
to the session log. Falls back to current time.

Theme: derived from sha256($PI_SESSION_ID), so one conversation keeps the same
visual identity for its entire life -- across compaction, context loss, and
resume -- without storing any state. Falls back to seeding from the cwd.
"""

import hashlib
import json
import os
import random
import sys
from datetime import datetime, timezone

try:
    from zoneinfo import ZoneInfo

    EASTERN = ZoneInfo("America/New_York")
except Exception:  # pragma: no cover
    EASTERN = None

EMOJI_WIDTH = 40  # double-width glyphs -> ~80 columns, matching pi's <hr>
TEXT_WIDTH = 80  # single-width glyphs

# Curated themes. Invariants for every glyph below:
#   - no U+FE0F variation selectors and no ZWJ sequences
#   - no base characters whose default presentation is text
# Violating either makes glyphs render half-width and the row goes ragged.
EMOJI_THEMES = {
    # color families
    "green": "🌿🍀🥬🥒🐸🌵🍃🥝🫑🐢🌲🥦",
    "purple": "🟣🍇🔮🪻🍆🟪💜🫐👾🎆",
    "orange": "🟠🍊🥕🎃🦊🏀🧡🟧🍁🥧",
    "yellow": "🟡🍋🌻🐥🧀🍌🟨💛🌼🐝",
    "blue": "🔵🌊🐳🫐💧🐟🧊🟦💙🐋",
    "red": "🔴🍎🍒🍅🌹🟥🍓🥊🎈🦞",
    "pink": "🌸🩷🐷💗🌷🦩🍑🌺💖🧁",
    "brown": "🟤🟫🐻🍂🥔🌰🪵🍞🐴🦫",
    "mono": "⚫⚪🔘🖤🤍🩶🎱🐧",
    # macro gradient
    "moon": "🌑🌒🌓🌔🌕🌖🌗🌘",
    # seasons
    "spring": "🌷🌱🐣🦋🌸🐝🪺🐇",
    "summer": "🌞🍉🩴🍦🏄🌻🩱🍹",
    "autumn": "🍂🍁🌰🎃🦃🍄🧣🥧",
    "winter": "⛄🧣🧤🎿🛷🧊🥶🐧",
    # subjects
    "flowers": "🌸🌺🌻🌷🌹🪷🌼💐🥀🪻",
    "junkfood": "🍔🍟🌭🍕🍩🍿🍫🍬🍭🧁🥤🍪",
    "fruit": "🍎🍊🍋🍌🍉🍇🍓🍑🥭🍍🥝🍒",
    "veg": "🥕🥦🥬🌽🥒🍆🫑🧄🧅🥔",
    "breakfast": "🍳🥓🥞🧇🥐🥯🍞🥚🧈🥛",
    "hotdogs": "🌭",
    "ocean": "🐠🐟🐡🦈🐬🐳🐙🦑🦀🦞🐚🪸",
    "farm": "🐮🐷🐔🐴🐑🐐🦆🦃🐄🐖",
    "bugs": "🐛🦋🐝🐞🐜🦗🪲🪳🦟🐌",
    "forest": "🌲🌳🌴🌵🎋🪵🍄🍂🦌🦉",
    "desert": "🌵🐍🦂🌞🪨🐫🌾🥵",
    "beach": "🌴🥥🐚🩴🌊🦀🏄🐠",
    "gems": "💎💍👑🪙🏆🥇🧿🔮",
    "vehicles": "🚗🚕🚙🚌🚎🚐🚚🛵🚓🚜",
    "shoes": "👞👟👠👡👢🥾🥿🩴",
    "halloween": "🎃👻💀🦇🧛🧟🧙🍬",
}

# Text waves. "teal" variants get wrapped in backticks so the markdown renderer
# paints them with mdCode (#8abeb7 in the dark theme); plain ones inherit body text.
TEXT_THEMES = {
    "braille": ("⣀⡠⠔⠊⠉⠑⠢⢄", False),
    "braille-teal": ("⣀⡠⠔⠊⠉⠑⠢⢄", True),
    "sinewave": ("∿", False),
    "sinewave-teal": ("∿", True),
}

# One continuous train: locomotive, shuffled cars, occasional gag, red car caboose.
TRAIN_LOCO = "🚂"
TRAIN_CARS = ["🚃", "🚃", "🚃", "🚋", "🚋"]
TRAIN_GAGS = ["🐄", "🚙", "🛻", "🎪"]
TRAIN_GAG_ODDS = 0.07
TRAIN_CABOOSE = "🚗"

THEME_NAMES = sorted(list(EMOJI_THEMES) + list(TEXT_THEMES) + ["trains"])


def fmt(dt: datetime) -> str:
    if EASTERN is not None:
        dt = dt.astimezone(EASTERN)
    return dt.strftime("%a %b %-d, %Y · %-I:%M %p %Z")


def arg_value(*names: str) -> str | None:
    args = sys.argv[1:]
    for index, arg in enumerate(args[:-1]):
        if arg in names:
            return args[index + 1]
    return None


def session_path() -> str:
    return arg_value("--session", "-s") or os.environ.get("PI_SESSION_FILE", "")


def last_user_message(path: str):
    found = None
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line or '"role":"user"' not in line.replace('"role": "user"', '"role":"user"'):
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if entry.get("type") != "message":
                continue
            msg = entry.get("message") or {}
            if msg.get("role") != "user":
                continue
            found = (entry.get("timestamp"), msg.get("content"))
    return found


def content_text(content) -> str:
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
        text = "\n".join(p for p in parts if p)
    else:
        text = ""
    return " ".join(text.split())[:300]


def build_train() -> str:
    rnd = random.Random()  # fresh cars every render; the theme itself stays fixed
    body = []
    for _ in range(EMOJI_WIDTH - 2):
        pool = TRAIN_GAGS if rnd.random() < TRAIN_GAG_ODDS else TRAIN_CARS
        body.append(rnd.choice(pool))
    return TRAIN_LOCO + "".join(body) + TRAIN_CABOOSE


def build_rule(theme: str) -> str:
    if theme == "trains":
        return build_train()
    if theme in TEXT_THEMES:
        unit, teal = TEXT_THEMES[theme]
        row = "".join((list(unit) * TEXT_WIDTH)[:TEXT_WIDTH])
        return f"`{row}`" if teal else row
    units = list(EMOJI_THEMES[theme])
    return "".join((units * EMOJI_WIDTH)[:EMOJI_WIDTH])


def pick_theme() -> str:
    seed = os.environ.get("PI_SESSION_ID") or os.getcwd()
    digest = int(hashlib.sha256(seed.encode()).hexdigest(), 16)
    return THEME_NAMES[digest % len(THEME_NAMES)]


def main() -> None:
    if "--themes" in sys.argv:  # inspect the catalog
        for name in THEME_NAMES:
            print(f"{name}\n{build_rule(name)}\n")
        return

    path = session_path()
    stamp, ask = None, ""
    timestamp_ms = arg_value("--timestamp-ms")
    ask_override = arg_value("--ask")
    if timestamp_ms:
        try:
            stamp = fmt(datetime.fromtimestamp(int(timestamp_ms) / 1000, timezone.utc))
        except ValueError:
            stamp = None
    if ask_override is not None:
        ask = content_text(ask_override)
    if stamp is None and path and os.path.isfile(path):
        hit = last_user_message(path)
        if hit and hit[0]:
            try:
                stamp = fmt(datetime.fromisoformat(hit[0].replace("Z", "+00:00")))
                if ask_override is None:
                    ask = content_text(hit[1])
            except ValueError:
                stamp = None
    if stamp is None:
        stamp = fmt(datetime.now(timezone.utc)) + " (approx: no session timestamp)"

    theme = pick_theme()
    print(f"stamp\t{stamp}")
    print(f"ask\t{ask}")
    print(f"theme\t{theme}")
    print(f"rule\t{build_rule(theme)}")


if __name__ == "__main__":
    main()
