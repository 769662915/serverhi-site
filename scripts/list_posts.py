#!/usr/bin/env python3
"""List every post's frontmatter essentials as TSV, newest first.

Columns: pubDate, category, lang, slug, title [, words]
One line per markdown file (bilingual folders yield one line per language).
Replaces dozens of per-file reads for category exclusion and topic dedup.
"""
import argparse
import re
import sys
from pathlib import Path


def parse_frontmatter(text: str):
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, ""
    fm = {}
    body_start = len(lines)
    for i, line in enumerate(lines[1:], 1):
        if line.strip() == "---":
            body_start = i + 1
            break
        m = re.match(r"^([A-Za-z][\w-]*):\s*(.*)$", line)
        if m:
            fm[m.group(1)] = m.group(2).strip().strip("\"'")
    return fm, "\n".join(lines[body_start:])


def count_words(body: str, lang: str) -> int:
    if lang.startswith("zh"):
        return len(re.sub(r"\s", "", body))
    return len([w for w in re.split(r"\s+", body) if w])


def main() -> int:
    # Windows consoles default to GBK; force UTF-8 so Chinese titles survive piping.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("content_dir", help="posts root, e.g. src/content/posts")
    parser.add_argument("--words", action="store_true",
                        help="append body length column (zh: chars, other: words)")
    args = parser.parse_args()

    root = Path(args.content_dir)
    if not root.is_dir():
        print(f"ERROR: not a directory: {root}", file=sys.stderr)
        return 1

    rows = []
    for md in sorted(root.glob("*/*.md")):
        try:
            fm, body = parse_frontmatter(md.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"WARN: skipped {md}: {exc}", file=sys.stderr)
            continue
        lang = fm.get("lang") or md.stem
        if lang == "index":
            lang = "-"
        row = [fm.get("pubDate", "?"), fm.get("category", "?"), lang,
               md.parent.name, fm.get("title", "?")]
        if args.words:
            row.append(str(count_words(body, lang if lang != "-" else fm.get("lang", ""))))
        rows.append(row)

    rows.sort(key=lambda r: r[0], reverse=True)
    print("\n".join("\t".join(r) for r in rows))
    return 0


if __name__ == "__main__":
    sys.exit(main())
