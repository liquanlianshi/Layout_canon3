/* Drives workbench.js head-less: load -> filter -> groupby -> pivot ->
   assign -> sort -> describe -> corr -> hist -> value_counts -> reset. */
(function () {
  var out = { errors: [], steps: [], xpandas: [] };
  function $(id) { return document.getElementById(id); }
  function run(name, fn) {
    try { fn(); out.steps.push(name); }
    catch (e) { out.errors.push(name + " -> " + String((e && e.message) || e)); }
  }
  function meta() { return $("dfMeta").innerHTML; }
  function shape(text) {
    var m = /shape = \((\d+), (\d+)\)/.exec(text);
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
  }
  function logCodes() {
    return window.__logProbe ? window.__logProbe() : null;
  }

  function logCount() {
    var html = $("opLog").innerHTML;
    var m = html.match(/log-item/g);
    return m ? m.length : 0;
  }

  run("init", function () {
    window.I18N.restore();
    window.OVERVIEW.render();
    window.WORKBENCH.init();
    out.initShape = shape(meta());
    out.initLogHtmlLength = $("opLog").innerHTML.length;
    out.initTableHtmlLength = $("dfTable").innerHTML.length;
    out.initStatsHtmlLength = $("wbStats").innerHTML.length;
    out.initChartSet = !!__lastOptions.wbChart;
    out.healthRows = ($("healthGrid").innerHTML.match(/health-row/g) || []).length;
    out.healthMetaHtml = $("healthMeta").innerHTML.length;
  });

  run("filter", function () {
    $("filterExpr").value = "indicator == 'digital_share' and year >= 2020";
    $("btnFilter").fire("click");
    out.filterShape = shape(meta());
  });

  run("pivot", function () {
    $("pivotIndex").value = "year";
    $("pivotCols").value = "region";
    $("pivotValues").value = "value";
    $("aggFunc").value = "mean";
    $("btnPivot").fire("click");
    out.pivotShape = shape(meta());
    out.pivotSeriesCount = __lastOptions.wbChart.series.length;
  });

  run("reset-after-pivot", function () {
    $("btnReset").fire("click");
    out.resetShape1 = shape(meta());
  });

  run("groupby", function () {
    var sel = $("groupBy");
    for (var i = 0; i < sel.options.length; i++) {
      sel.options[i].selected = (sel.options[i].value === "year");
    }
    $("aggCol").value = "value";
    $("aggFunc").value = "mean";
    $("btnGroup").fire("click");
    out.groupShape = shape(meta());
    out.groupChartPoints = __lastOptions.wbChart.series[0].data.length;
  });

  run("assign", function () {
    $("newColName").value = "value_scaled";
    $("newColExpr").value = "value / 1000";
    $("btnNewCol").fire("click");
    out.assignShape = shape(meta());
    out.assignChipPresent = $("colChips").innerHTML.indexOf("value_scaled") >= 0;
  });

  run("sort", function () {
    $("sortCol").value = "value_scaled";
    $("btnSortDesc").fire("click");
    out.sortShape = shape(meta());
  });

  run("describe", function () {
    $("btnSummary").fire("click");
    out.describeRows = $("statsTable").innerHTML.length;
    out.statsTableVisible = $("statsTableShell").style.display !== "none";
  });

  run("corr", function () {
    $("btnCorr").fire("click");
    var opt = __lastOptions.wbChart;
    out.corrCells = opt.series[0].data.length;
  });

  run("hist", function () {
    $("btnHist").fire("click");
    out.histBars = __lastOptions.wbChart.series[0].data.length;
  });

  run("chartType", function () {
    $("chartType").value = "bar";
    $("chartType").fire("change");
    out.barType = __lastOptions.wbChart.series[0].type;
  });

  run("valueCounts", function () {
    $("btnValueCounts").fire("click");
    out.valueCountsShape = shape(meta());
  });

  run("reset", function () {
    $("btnReset").fire("click");
    out.resetShape = shape(meta());
  });

  run("english", function () {
    window.I18N.set("en");
    window.WORKBENCH.refresh();
    out.enSteps = $("opLog").innerHTML.length > 0;
    out.enChart = !!__lastOptions.wbChart;
  });

  run("log-follows-language", function () {
    var html = $("opLog").innerHTML;
    out.logHasChinese = /[\u4e00-\u9fff]/.test(html);
    out.logHasEnglish = html.indexOf("Load default data") >= 0 || html.indexOf("Group by") >= 0;
  });

  run("html-injection-is-escaped", function () {
    $("pasteArea").value = "name,<img src=x onerror=alert(1)>\na,1\nb,2";
    $("btnParsePaste").fire("click");
    var html = $("dfTable").innerHTML;
    out.rawTagPresent = html.indexOf("<img") >= 0;
    out.escapedTagPresent = html.indexOf("&lt;img") >= 0;
    out.injectionShape = shape(meta());
  });

  run("prototype-named-values", function () {
    $("pasteArea").value = "k,v\nconstructor,1\ntoString,2\na,3";
    $("btnParsePaste").fire("click");
    $("aggCol").value = "v";
    $("aggFunc").value = "sum";
    var sel = $("groupBy");
    for (var i = 0; i < sel.options.length; i++) {
      sel.options[i].selected = (sel.options[i].value === "k");
    }
    $("btnGroup").fire("click");
    out.protoShape = shape(meta());
  });

  run("groupby-without-region-keeps-charting", function () {
    $("btnReset").fire("click");
    var sel = $("groupBy");
    for (var i = 0; i < sel.options.length; i++) {
      sel.options[i].selected = (sel.options[i].value === "indicator" || sel.options[i].value === "year");
    }
    $("aggCol").value = "value";
    $("aggFunc").value = "mean";
    var before = __setOptionCount;
    $("btnGroup").fire("click");
    out.noRegionShape = shape(meta());
    out.noRegionChartRedrawn = __setOptionCount > before;
  });

  run("column-chip-toggle-is-reversible", function () {
    $("btnReset").fire("click");
    out.chipShapeAll = shape(meta());
    /* simulate clicking the "value" chip off and back on */
    var chip = new El("span");
    chip.setAttribute("data-col", "value");
    chip.closest = function () { return chip; };
    var ev = { target: chip, preventDefault: function () {} };
    $("colChips").fire("click", ev);
    out.chipShapeOff = shape(meta());
    $("colChips").fire("click", ev);
    out.chipShapeBack = shape(meta());
  });

  run("language-switch-keeps-log-size", function () {
    $("btnReset").fire("click");
    $("btnSummary").fire("click");
    out.logCountBefore = logCount();
    window.I18N.set("zh");
    window.WORKBENCH.refresh();
    window.I18N.set("en");
    window.WORKBENCH.refresh();
    out.logCountAfter = logCount();
  });

  out.finalLogLength = $("opLog").innerHTML.length;
  out.setOptionCount = __setOptionCount;
  return JSON.stringify(out);
})();
