#!/usr/bin/env python3
"""Publish due scheduled Markdown articles. UTC ISO timestamps only."""
from datetime import datetime, timezone
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "src/content/blog"
NOW = datetime.now(timezone.utc)
changed = []
for path in ROOT.rglob("*.md"):
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)", text, re.S)
    if not match:
        continue
    front = match.group(1)
    scheduled = re.search(r'^scheduledAt:\s*["\']?(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z)["\']?\s*$', front, re.M)
    draft = re.search(r'^draft:[ \t]*true[ \t]*$', front, re.M)
    if not scheduled or not draft:
        continue
    try:
        due = datetime.fromisoformat(scheduled.group(1).replace("Z", "+00:00"))
    except ValueError:
        continue
    if due > NOW:
        continue
    front = re.sub(r'^draft:[ \t]*true[ \t]*$', 'draft: false', front, count=1, flags=re.M)
    front = re.sub(r'^scheduledAt:.*(?:\r?\n|$)', '', front, count=1, flags=re.M)
    path.write_text('---\n' + front.rstrip('\r\n') + '\n---\n' + text[match.end():], encoding='utf-8')
    changed.append(str(path.relative_to(ROOT)))
print(f"Published {len(changed)} scheduled article(s): {', '.join(changed)}")
