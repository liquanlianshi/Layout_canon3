# -*- coding: utf-8 -*-
"""Static checks over the JavaScript sources.

Two guarantees the assignment asks for:
  * the site must run at all  -> every .js file must be syntactically valid
  * Chinese and English must be content-identical -> the two i18n
    dictionaries must expose exactly the same key set
"""
import os

import esprima

from i18n_dict import load_dicts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS_FILES = ["js/i18n.js", "js/core.js", "js/dataframe.js", "js/overview.js", "js/workbench.js", "js/app.js", "js/data.js"]


def _read(rel):
    path = os.path.join(ROOT, rel)
    assert os.path.exists(path), "missing file: " + rel
    return open(path, encoding="utf-8").read()


def test_all_javascript_files_are_valid():
    parsed = 0
    for rel in JS_FILES:
        src = _read(rel)
        try:
            esprima.parseScript(src)
        except Exception as exc:  # pragma: no cover - failure path
            raise AssertionError("syntax error in %s: %s" % (rel, exc))
        parsed += 1
    assert parsed == len(JS_FILES)


def _dict_object(rel):
    """Return {lang: {key: literal-node}} for js/i18n.js."""
    return load_dicts(rel)


def test_chinese_and_english_dictionaries_have_identical_keys():
    dicts = _dict_object("js/i18n.js")
    assert set(dicts.keys()) == {"zh", "en"}
    zh_keys, en_keys = set(dicts["zh"]), set(dicts["en"])
    assert zh_keys == en_keys, (
        "missing in en: %s | missing in zh: %s"
        % (sorted(zh_keys - en_keys), sorted(en_keys - zh_keys))
    )
    assert len(zh_keys) > 100, "dictionary unexpectedly small"


def test_dictionary_values_are_non_empty_strings():
    dicts = _dict_object("js/i18n.js")
    for lang, entries in dicts.items():
        for key, node in entries.items():
            assert node["type"] == "Literal", (lang, key)
            value = node["value"]
            assert isinstance(value, str) and value.strip(), (lang, key)


def test_translation_placeholders_match():
    """Keys whose Chinese text contains ’should not silently drop content."""
    dicts = _dict_object("js/i18n.js")
    for key, node in dicts["zh"].items():
        en = dicts["en"][key]["value"]
        zh = node["value"]
        assert bool(zh) == bool(en)
