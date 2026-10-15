# -*- coding: utf-8 -*-
"""Small inventory helper: file sizes and i18n key counts.

Usage:  python scripts/stats.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tests"))

from i18n_dict import load_dicts  # noqa: E402


def human(n):
    if n < 1024:
        return "%d B" % n
    if n < 1024 * 1024:
        return "%.1f KB" % (n / 1024)
    return "%.2f MB" % (n / 1024 / 1024)


def main():
    total = 0
    print("--- project files ---")
    for folder, _dirs, files in os.walk(ROOT):
        if any(part in folder for part in (".git", ".pytest_cache", "__pycache__", ".reasonix")):
            continue
        for name in sorted(files):
            path = os.path.join(folder, name)
            size = os.path.getsize(path)
            total += size
            print("%-46s %10s" % (os.path.relpath(path, ROOT), human(size)))
    print("%-46s %10s" % ("TOTAL", human(total)))

    dicts = load_dicts()
    zh, en = set(dicts["zh"]), set(dicts["en"])
    print("\n--- i18n ---")
    print("zh keys: %d" % len(zh))
    print("en keys: %d" % len(en))
    print("identical: %s" % (zh == en))


if __name__ == "__main__":
    main()
