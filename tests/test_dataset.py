# -*- coding: utf-8 -*-
"""Default dataset integrity checks.

Validates that the three copies of the demo dataset stay consistent:
  data/nqpf_long.csv  <->  data/nqpf_wide.csv  <->  js/data.js
plus the internal shape promised by the site (10 regions x 11 indicators x 10 years).
"""
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YEARS = list(range(2015, 2025))
N_REGIONS = 10
N_INDICATORS = 11


def load_data_js():
    path = os.path.join(ROOT, "js", "data.js")
    src = open(path, encoding="utf-8").read()
    m = re.search(r"window\.NQPF\s*=\s*(\{.*\})\s*;", src, re.S)
    assert m, "js/data.js must contain 'window.NQPF = {...};'"
    return json.loads(m.group(1))


def load_long():
    path = os.path.join(ROOT, "data", "nqpf_long.csv")
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_wide():
    path = os.path.join(ROOT, "data", "nqpf_wide.csv")
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def test_shape_of_long_table():
    rows = load_long()
    assert len(rows) == len(YEARS) * N_REGIONS * N_INDICATORS == 1100
    assert list(rows[0].keys()) == ["year", "region", "indicator", "indicator_en", "value", "unit"]


def test_shape_of_wide_table():
    rows = load_wide()
    assert len(rows) == len(YEARS) * N_REGIONS == 100
    assert list(rows[0].keys())[:2] == ["year", "region"]
    assert len(rows[0].keys()) == 2 + N_INDICATORS


def test_data_js_matches_long_csv():
    payload = load_data_js()
    rows = load_long()
    assert payload["years"] == YEARS
    assert len(payload["regions"]) == N_REGIONS
    assert len(payload["indicators"]) == N_INDICATORS

    lookup = {}
    for r in rows:
        lookup[(int(r["year"]), r["region"], r["indicator"])] = float(r["value"])

    checked = 0
    for ind in payload["indicators"]:
        key = ind["key"]
        series = payload["series"][key]
        assert set(series.keys()) == set(payload["regions"]), key
        for region, values in series.items():
            assert len(values) == len(YEARS), (key, region)
            for yi, year in enumerate(YEARS):
                expected = lookup[(year, region, key)]
                assert abs(values[yi] - expected) < 1e-6, (key, region, year, values[yi], expected)
                checked += 1
    assert checked == len(YEARS) * N_REGIONS * N_INDICATORS


def test_indicator_metadata_is_bilingual_and_complete():
    payload = load_data_js()
    for ind in payload["indicators"]:
        for field in ("key", "zh", "en", "unitZh", "unitEn", "dir"):
            assert ind.get(field), (ind.get("key"), field)
        assert ind["dir"] in ("up", "down")
        assert ind["zh"] != ind["en"]


def test_wide_and_long_agree():
    long_rows = load_long()
    wide_rows = load_wide()
    lookup = {}
    for r in long_rows:
        lookup[(int(r["year"]), r["region"], r["indicator"])] = float(r["value"])
    for r in wide_rows:
        year, region = int(r["year"]), r["region"]
        for key, raw in r.items():
            if key in ("year", "region"):
                continue
            assert abs(float(raw) - lookup[(year, region, key)]) < 1e-6, (year, region, key)


def test_values_are_plausible():
    payload = load_data_js()
    for ind in payload["indicators"]:
        for values in payload["series"][ind["key"]].values():
            for v in values:
                assert isinstance(v, (int, float))
                assert 0 < v < 5_000_000, (ind["key"], v)
        # direction semantics: 'up' indicators grow, 'down' indicators fall
        for values in payload["series"][ind["key"]].values():
            if ind["dir"] == "up":
                assert values[-1] > values[0], ind["key"]
            else:
                assert values[-1] < values[0], ind["key"]
