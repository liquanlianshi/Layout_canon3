# -*- coding: utf-8 -*-
"""Head-less render tests.

quickjs executes the *shipped* js/*.js files against a mock DOM + mock
ECharts (tests/js_harness/mock_dom.js). That proves two things the static
checks cannot:
  * the page actually boots without throwing
  * the charts really receive data (series lengths, sankey links, ...)
and it replays real user interactions on the workbench.
"""
import json
import os

import pytest

quickjs = pytest.importorskip("quickjs")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HARNESS = os.path.join(ROOT, "tests", "js_harness")
LIB = ["js/data.js", "js/i18n.js", "js/core.js", "js/dataframe.js"]


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def build_source(entry_file, extra_lib=()):
    parts = [read(os.path.join(HARNESS, "mock_dom.js"))]
    for rel in LIB:
        parts.append(read(os.path.join(ROOT, rel)))
    for rel in extra_lib:
        parts.append(read(os.path.join(ROOT, rel)))
    parts.append(read(os.path.join(HARNESS, entry_file)))
    return "\n;\n".join(parts)


@pytest.fixture(scope="module")
def overview():
    ctx = quickjs.Context()
    return json.loads(ctx.eval(build_source("run_overview.js", ["js/overview.js"])))


@pytest.fixture(scope="module")
def workbench():
    ctx = quickjs.Context()
    return json.loads(ctx.eval(build_source("run_workbench.js", ["js/overview.js", "js/workbench.js"])))


# --------------------------------------------------------------- overview --
def test_overview_renders_without_errors(overview):
    assert overview["errors"] == []
    assert overview["missing"] == []


def test_overview_default_language_is_chinese(overview):
    assert overview["lang"] == "zh"
    assert "万元" in overview["unit_zh"] if "unit_zh" in overview else True
    assert overview["kpiValueHtml"].strip() != ""


def test_overview_charts_received_data(overview):
    lens = overview["lens"]
    assert lens["trend0"] == 10 and lens["trend1"] == 10      # 10 years
    assert lens["spilloverLinks"] > 0                          # sankey links from correlations
    assert lens["radarRegions"] == 3                           # 3 default regions
    assert lens["scatterSeries"] >= 10                         # 10 regions (+ trend line)
    assert lens["heatCells"] == 9 * 10                         # 9 indicators x 10 regions
    assert lens["rankBars"] == 10                              # 10 regions
    assert lens["raceOptions"] == 10                           # one frame per year
    assert lens["corrCells"] == 11 * 11                        # full correlation matrix
    assert lens["roseSlices"] == 10                            # 10 regions
    assert lens["flow0"] == 10                                 # 10 years
    assert lens["compareSeries"] == 2                          # 2015 vs 2024


def test_overview_new_blocks_received_data(overview):
    """the added content: an all-indicators grid, a gauge and two more charts"""
    assert overview["briefCards"] == 11                        # one mini chart per indicator
    assert overview["briefSparkPoints"] == 10                  # each covers 2015-2024
    assert overview["scoreValue"] > 100                        # 2015 = 100 baseline
    assert overview["energySeriesCount"] == 4                  # 3 regions + national average
    assert overview["jobsSeriesCount"] == 2                    # bar + line on dual axis


def test_overview_index_grows_over_time(overview):
    assert overview["trendFirst"] == pytest.approx(100.0, abs=0.01)
    assert overview["trendLast"] > 140


def test_overview_language_switch_rerenders_in_english(overview):
    assert overview["enLang"] == "en"
    assert "index" in overview["enTrendName"].lower()


# -------------------------------------------------------------- workbench --
def test_workbench_boots(workbench):
    assert workbench["errors"] == []
    assert workbench["initShape"] == [1100, 7]
    assert workbench["initChartSet"] is True
    assert workbench["initTableHtmlLength"] > 500
    assert workbench["initStatsHtmlLength"] > 100
    assert workbench["initLogHtmlLength"] > 0


def test_workbench_data_health_panel(workbench):
    """one row per column, plus the summary pills (completeness / missing /
    duplicates / unique values)"""
    assert workbench["healthRows"] == 7        # long table: 7 columns
    assert workbench["healthMetaHtml"] > 0


def test_workbench_filter_narrows_rows(workbench):
    # 10 regions x 5 years of the digital-share indicator
    assert workbench["filterShape"] == [50, 7]


def test_workbench_groupby_reduces_to_years(workbench):
    # pivot ran on the filtered slice, then the workbench was reset
    assert workbench["pivotShape"] == [5, 11]        # 5 years x (year + 10 regions)
    assert workbench["pivotSeriesCount"] == 10
    assert workbench["resetShape1"] == [1100, 7]
    assert workbench["groupShape"] == [10, 2]        # one row per year
    assert workbench["groupChartPoints"] == 10


def test_workbench_assign_adds_column(workbench):
    assert workbench["assignShape"] == [10, 3]
    assert workbench["assignChipPresent"] is True


def test_workbench_sort_and_describe(workbench):
    assert workbench["sortShape"] == [10, 3]
    assert workbench["describeRows"] > 200
    assert workbench["statsTableVisible"] is True


def test_workbench_corr_hist_and_chart_types(workbench):
    # numeric columns after group-by + assign: year, value, value_scaled
    assert workbench["corrCells"] == 9
    assert workbench["histBars"] == 12
    assert workbench["barType"] == "bar"


def test_workbench_value_counts_and_reset(workbench):
    assert workbench["valueCountsShape"][1] == 3      # column, count, percent
    assert workbench["resetShape"] == [1100, 7]


def test_workbench_log_follows_language(workbench):
    assert workbench["logHasChinese"] is False
    assert workbench["logHasEnglish"] is True


def test_workbench_html_injection_is_escaped(workbench):
    """A column name coming from pasted/uploaded data must never be
    injected as live markup into the data view."""
    assert workbench["rawTagPresent"] is False
    assert workbench["escapedTagPresent"] is True
    assert workbench["injectionShape"] == [2, 2]


def test_workbench_prototype_named_values_do_not_break_grouping(workbench):
    """Values such as 'constructor'/'toString' used to collide with
    Object.prototype when used as hash keys."""
    assert workbench["protoShape"] == [3, 2]


def test_workbench_groupby_without_region_still_renders(workbench):
    """Charting must survive a group-by that drops the 'region' column
    (previously threw a TypeError inside the pivot used by the chart)."""
    assert workbench["noRegionShape"] == [110, 3]
    assert workbench["noRegionChartRedrawn"] is True


def test_column_chip_selection_is_reversible(workbench):
    """Toggling a column chip off projects the view; toggling it back must
    restore it (the frame itself is never destroyed)."""
    assert workbench["chipShapeAll"] == [1100, 7]
    assert workbench["chipShapeOff"] == [1100, 6]
    assert workbench["chipShapeBack"] == [1100, 7]


def test_language_switch_does_not_grow_the_operation_log(workbench):
    """Re-rendering after a language switch must not append pseudo-entries
    such as 'describe()' to the user's operation log."""
    assert workbench["logCountBefore"] == workbench["logCountAfter"]


def test_workbench_english_refresh(workbench):
    assert workbench["enSteps"] is True
    assert workbench["enChart"] is True
    assert workbench["finalLogLength"] > 0
    assert workbench["setOptionCount"] >= 8
