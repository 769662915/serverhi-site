#!/usr/bin/env python3
"""Download/process a blog cover image: keep aspect ratio (no crop), downscale if wide, convert to webp q60."""
import argparse
import shutil
import sys
import tempfile
import urllib.request
from pathlib import Path

from PIL import Image

DEFAULT_MIN_W = 1200
DEFAULT_MIN_H = 630
DEFAULT_MAX_W = 1600
DEFAULT_QUALITY = 60


def fetch(source: str) -> Path:
    if source.startswith(("http://", "https://")):
        suffix = Path(source.split("?")[0]).suffix or ".img"
        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.close()
        with urllib.request.urlopen(source, timeout=30) as resp, open(tmp.name, "wb") as f:
            shutil.copyfileobj(resp, f)
        return Path(tmp.name)
    return Path(source)


def process(input_path: Path, output_path: Path,
            min_w: int = DEFAULT_MIN_W, min_h: int = DEFAULT_MIN_H,
            max_w: int = DEFAULT_MAX_W, quality: int = DEFAULT_QUALITY) -> tuple:
    img = Image.open(input_path).convert("RGB")
    if img.width > max_w:
        img = img.resize((max_w, round(max_w * img.height / img.width)), Image.LANCZOS)
    if img.height > img.width and min_w > min_h:
        min_w, min_h = min_h, min_w
    if img.width < min_w or img.height < min_h:
        raise ValueError(
            f"cover too small: {img.width}x{img.height}, need >={min_w}x{min_h}")
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "WEBP", quality=quality)
    return img.size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="image URL or local path")
    parser.add_argument("--output", required=True, help="output .webp path")
    parser.add_argument("--min-width", type=int, default=DEFAULT_MIN_W)
    parser.add_argument("--min-height", type=int, default=DEFAULT_MIN_H)
    parser.add_argument("--max-width", type=int, default=DEFAULT_MAX_W)
    parser.add_argument("--quality", type=int, default=DEFAULT_QUALITY)
    args = parser.parse_args()
    is_remote = args.input.startswith(("http://", "https://"))
    try:
        local = fetch(args.input)
        try:
            size = process(local, Path(args.output), args.min_width,
                           args.min_height, args.max_width, args.quality)
        finally:
            if is_remote:
                local.unlink(missing_ok=True)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"OK: {args.output} {size[0]}x{size[1]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
