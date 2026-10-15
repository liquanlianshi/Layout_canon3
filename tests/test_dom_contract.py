# -*- coding: utf-8 -*-
"""Contract checks between index.html and the JavaScript that drives it.

Catches the two most common integration breakages in a static site:
  * a getElementById / chart() target that does not exist in the markup
  * a data-i18n key that is not present in both dictionaries
"""
import os
import re

from i18n_dict import load_dicts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS_FILES = ["js/overview.js", "js/workbench.js", "js/app.js", "js/core.js"]
# ids created at runtime by overview.js (KPI cards)
DYNAMIC_ID = re.compile(r"^kpi(Val|Delta|Spark|Row)\d+$")


def read(rel):
    return open(os.path.join(ROOT, rel), encoding="utf-8").read()


def html_ids():
    html = read("index.html")
    return set(re.findall(r'\bid="([^"]+)"', html))


def referenced_ids():
    found = set()
    for rel in JS_FILES:
        src = read(rel)
        for pattern in (r'\$\("([^"]+)"\)',
                        r'getElementById\("([^"]+)"\)',
                        r'X\.chart\("([^"]+)"\)',
                        r'chart\("([^"]+)"\)'):
            found.update(re.findall(pattern, src))
    return found


def test_every_referenced_element_id_exists_in_html():
    ids = html_ids()
    missing = sorted(i for i in referenced_ids() if i not in ids and not DYNAMIC_ID.match(i))
    assert not missing, "ids referenced by JS but absent from index.html: %s" % missing


def test_overview_chart_containers_exist():
    html = read("index.html")
    containers = re.findall(r'<div class="chart[^"]*" id="([^"]+)"', html)
    assert len(containers) >= 11, containers
    for name in containers:
        assert 'X.chart("%s")' % name in read("js/overview.js") or name == "wbChart", name


def test_workbench_chart_container_exists():
    assert "wbChart" in html_ids()
    assert 'X.chart("wbChart")' in read("js/workbench.js")


def _dict_keys():
    return {lang: set(entries) for lang, entries in load_dicts().items()}


def test_html_translation_keys_all_defined():
    keys = _dict_keys()
    html = read("index.html")
    used = set(re.findall(r'data-i18n(?:-ph)?="([^"]+)"', html))
    assert used, "no data-i18n attributes found"
    for lang in ("zh", "en"):
        missing = sorted(k for k in used if k not in keys[lang])
        assert not missing, "keys missing from %s dictionary: %s" % (lang, missing)


def test_script_and_stylesheet_references_exist():
    html = read("index.html")
    refs = re.findall(r'(?:src|href)="([^"]+)"', html)
    for ref in refs:
        if ref.startswith("#") or ref.startswith("http"):
            continue
        path = os.path.join(ROOT, ref)
        assert os.path.exists(path), "missing asset referenced by index.html: " + ref
    # load order matters: vendor libs before our own modules
    order = [r for r in refs if r.endswith(".js")]
    assert order.index("vendor/echarts.min.js") < order.index("js/core.js")
    assert order.index("js/data.js") < order.index("js/overview.js")
    assert order.index("js/overview.js") < order.index("js/app.js")
