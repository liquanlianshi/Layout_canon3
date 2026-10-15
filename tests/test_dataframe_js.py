# -*- coding: utf-8 -*-
"""Execute js/dataframe.js in a real JavaScript engine and check that the
pandas-style operations return the right values.

js2py is a pure-python ES5 interpreter, so this runs the SHIPPED file
(no transpiling, no stubs) and asserts on the JSON it produces.
"""
import json
import os

import pytest

quickjs = pytest.importorskip("quickjs")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ROWS = [
    {"year": 2015, "region": "A", "value": 10},
    {"year": 2016, "region": "A", "value": 14},
    {"year": 2015, "region": "B", "value": 30},
    {"year": 2016, "region": "B", "value": 26},
    {"year": 2016, "region": "B", "value": 26},   # duplicate row on purpose
    {"year": 2017, "region": "C", "value": None},  # one missing value
]

HARNESS = """
(function () {
  var M = window.NQPF_DF;
  var rows = %s;
  var df = new M.DataFrame(rows);
  var out = {};

  out.dtypes = df.dtypes;
  out.shape = df.shape();
  out.numeric = df.numericColumns();
  out.object = df.objectColumns();

  out.head2 = df.head(2).toRecords();
  out.tail1 = df.tail(1).toRecords();

  out.filtered = df.query("value > 14 and region == 'B'").length;
  out.filteredEq = df.query('(value >= 26) & (year > 2015)').length;
  out.negated = df.query("not (region == 'A')").length;
  out.inList = df.query("region in ['A', 'C']").length;

  out.sortedAsc = df.sortValues("value", true).data.value;
  out.sortedDescFirst = df.sortValues("value", false).data.value[0];

  var assigned = df.assign("scaled", "value * 2");
  out.assignCols = assigned.columns;
  out.assignLast = assigned.data.scaled[0];

  var grouped = df.groupAgg(["region"], "value", "sum").toRecords();
  out.grouped = grouped;

  var piv = df.pivotTable("year", "region", "value", "sum");
  out.pivotRowVals = piv.rowVals;
  out.pivotColVals = piv.colVals;
  out.pivotFrame = piv.frame.toRecords();

  out.describeRows = df.describe().frame.length;
  out.describeCols = df.describe().numericColumns;

  out.valueCounts = df.valueCounts("region").toRecords();
  out.corr = df.corr().matrix;

  out.dropDupLen = df.dropDuplicates().length;
  out.dropNaLen = df.dropna().length;
  out.fillNaFirstYear = df.fillna("mean").data.year[0];
  out.fillNaValue = df.fillna("mean").data.value[5];

  out.selected = df.select(["year", "value"]).columns;

  /* a column literally named "__proto__" must not vanish into the prototype */
  var proto = df.assign("__proto__", "value * 2");
  out.protoOwn = Object.prototype.hasOwnProperty.call(proto.data, "__proto__");
  out.protoFirst = proto.data["__proto__"] ? proto.data["__proto__"][0] : null;
  var protoSel = proto.select(["year", "__proto__"]);
  out.protoSelOwn = Object.prototype.hasOwnProperty.call(protoSel.data, "__proto__");
  out.protoSelLength = protoSel.length;

  var errors = [];
  try { df.query("nope > 1"); } catch (e) { errors.push(String(e.message || e)); }
  out.errors = errors;

  out.csv = df.head(2).toCSV();
  return JSON.stringify(out);
})()
"""


@pytest.fixture(scope="module")
def result():
    with open(os.path.join(ROOT, "js", "dataframe.js"), encoding="utf-8") as fh:
        src = fh.read()
    context = quickjs.Context()
    raw = context.eval("var window = {};\n" + src + "\n" + (HARNESS % json.dumps(ROWS)))
    return json.loads(raw)


def test_dtype_inference(result):
    assert result["dtypes"]["year"] == "number"
    assert result["dtypes"]["value"] == "number"
    assert result["dtypes"]["region"] == "object"
    assert result["shape"] == [6, 3]
    assert result["numeric"] == ["year", "value"]
    assert result["object"] == ["region"]


def test_head_and_tail(result):
    assert [r["year"] for r in result["head2"]] == [2015, 2016]
    assert result["tail1"][0]["region"] == "C"


def test_query_filtering(result):
    assert result["filtered"] == 3          # B 2015, B 2016, B 2016
    assert result["filteredEq"] == 2        # the two B-2016 rows (NaN row excluded)
    assert result["negated"] == 4
    assert result["inList"] == 3            # region A (x2) and C (x1)


def test_sorting(result):
    assert result["sortedAsc"][0] == 10
    assert result["sortedDescFirst"] == 30


def test_assign_creates_column(result):
    assert "scaled" in result["assignCols"]
    assert result["assignLast"] == 20


def test_groupby_sum(result):
    totals = {r["region"]: r["value"] for r in result["grouped"]}
    assert totals["A"] == 24
    assert totals["B"] == 82
    assert totals["C"] == 0        # null becomes 0 through the sum aggregator


def test_pivot_table(result):
    assert result["pivotRowVals"] == ["2015", "2016", "2017"]
    assert set(result["pivotColVals"]) == {"A", "B", "C"}
    frame = result["pivotFrame"]
    row2015 = [r for r in frame if r["year"] == 2015][0]
    assert row2015["A"] == 10
    assert row2015["B"] == 30
    assert row2015["C"] is None


def test_describe(result):
    assert result["describeRows"] == 8       # count/mean/std/min/25/50/75/max
    assert result["describeCols"] == ["year", "value"]


def test_value_counts(result):
    counts = {r["region"]: r["count"] for r in result["valueCounts"]}
    assert counts == {"B": 3, "A": 2, "C": 1}
    percents = [r["percent"] for r in result["valueCounts"]]
    assert percents[0] == pytest.approx(50.0)


def test_correlation_matrix(result):
    m = result["corr"]
    assert len(m) == 2 and len(m[0]) == 2
    for i in range(2):
        assert m[i][i] == pytest.approx(1.0, abs=1e-9)


def test_missing_value_handling(result):
    assert result["dropDupLen"] == 5
    # exactly one row carries a missing value -> dropna keeps the other five
    assert result["dropNaLen"] == 5
    assert result["fillNaFirstYear"] == 2015
    # mean of 10,14,30,26,26 (null rows are ignored) == 21.2
    assert result["fillNaValue"] == pytest.approx(21.2)


def test_column_projection(result):
    assert result["selected"] == ["year", "value"]


def test_unknown_column_raises(result):
    assert result["errors"], "querying an unknown column should throw"
    assert "nope" in result["errors"][0]


def test_prototype_named_column_is_preserved(result):
    """assign()/select() must keep a column literally named '__proto__':
    with plain object maps the value would be swallowed as the prototype."""
    assert result["protoOwn"] is True
    assert result["protoFirst"] == 20          # first row value 10 * 2
    assert result["protoSelOwn"] is True
    assert result["protoSelLength"] == 6


def test_csv_export(result):
    lines = result["csv"].split("\n")
    assert lines[0] == "year,region,value"
    assert lines[1] == "2015,A,10"
