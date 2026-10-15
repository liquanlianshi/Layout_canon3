# -*- coding: utf-8 -*-
"""Shared helpers for reading the bilingual dictionary out of js/i18n.js."""
import os

import esprima

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(rel):
    return open(os.path.join(ROOT, rel), encoding="utf-8").read()


def _find_var(node, name):
    if isinstance(node, dict):
        if node.get("type") == "VariableDeclarator" and isinstance(node.get("id"), dict) \
                and node["id"].get("name") == name:
            return node
        for value in node.values():
            found = _find_var(value, name)
            if found is not None:
                return found
    elif isinstance(node, list):
        for item in node:
            found = _find_var(item, name)
            if found is not None:
                return found
    return None


def _key_name(key_node):
    """Object keys may be identifiers (`{ zh: ... }`) or string literals."""
    if key_node.get("type") == "Identifier":
        return key_node["name"]
    return key_node["value"]


def load_dicts(rel="js/i18n.js"):
    """Return {lang: {key: <literal node>}} for the `var DICT = {...}` literal."""
    tree = esprima.parseScript(read(rel))
    node = _find_var(esprima.toDict(tree), "DICT")
    if node is None:
        raise AssertionError("DICT not found in " + rel)
    out = {}
    for lang_prop in node["init"]["properties"]:
        lang = _key_name(lang_prop["key"])
        out[lang] = {_key_name(p["key"]): p["value"] for p in lang_prop["value"]["properties"]}
    return out
