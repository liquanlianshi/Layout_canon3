/* ==========================================================================
   workbench.js — interactive data-analysis workbench.

   It re-implements the everyday pandas workflow in the browser:
   load -> inspect -> filter -> sort -> select -> de-duplicate -> assign ->
   groupby/agg -> pivot_table -> describe/corr/value_counts/hist -> export.
   Every action appends the equivalent pandas snippet to the operation log,
   and every chart is recomputed from the *current* DataFrame.
   ========================================================================== */
(function (global) {
  "use strict";

  var D = global.NQPF, X = global.NQPFX, T = global.I18N, DF = global.NQPF_DF;

  var state = {
    original: null,
    df: null,
    log: [],
    chartIndicator: null,
    tableLimit: 12,
    colSelection: Object.create(null),
    groupTouched: false
  };

  function $(id) { return document.getElementById(id); }

  /* Every user-supplied string passes through this before touching innerHTML:
     column names, cell values, filter expressions and uploaded file names are
     all untrusted input. */
  function esc(v) {
    return String(v === null || v === undefined ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function maxOf(arr) {
    var m = -Infinity;
    for (var i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
    return m;
  }
  function minOf(arr) {
    var m = Infinity;
    for (var i = 0; i < arr.length; i++) if (arr[i] < m) m = arr[i];
    return m;
  }

  /* ----------------------------------------------------------- loading */
  function longRecords() {
    var rows = [];
    D.years.forEach(function (year, yi) {
      D.regions.forEach(function (r) {
        D.indicators.forEach(function (ind) {
          rows.push({
            year: year,
            region: r,
            indicator: ind.key,
            indicator_en: ind.en,
            value: D.series[ind.key][r][yi],
            unit: ind.unitZh,
            unit_en: ind.unitEn
          });
        });
      });
    });
    return rows;
  }

  function wideRecords() {
    var rows = [];
    D.years.forEach(function (year, yi) {
      D.regions.forEach(function (r) {
        var rec = { year: year, region: r };
        D.indicators.forEach(function (ind) { rec[ind.key] = D.series[ind.key][r][yi]; });
        rows.push(rec);
      });
    });
    return rows;
  }

  function loadDefault(kind) {
    state.original = new DF.DataFrame(kind === "wide" ? wideRecords() : longRecords());
    state.df = state.original;
    state.log = [];
    state.chartIndicator = null;
    state.colSelection = Object.create(null);
    state.groupTouched = false;
    if ($("filterExpr")) $("filterExpr").value = "";
    pushLog({
      key: "wb.log.load",
      code: 'pd.read_csv("data/nqpf_' + kind + '.csv")',
      df: state.df
    }, true);
    syncControls();
    renderAll();
  }

  function loadRecords(records, source) {
    if (!records || !records.length) { X.toast(T.t("wb.err.empty")); return; }
    state.original = new DF.DataFrame(records);
    state.df = state.original;
    state.log = [];
    state.chartIndicator = null;
    state.colSelection = Object.create(null);
    state.groupTouched = false;
    if ($("filterExpr")) $("filterExpr").value = "";
    pushLog({
      key: "wb.log.custom",
      code: 'pd.read_csv("' + (source || "uploaded.csv") + '")',
      df: state.df
    }, true);
    syncControls();
    renderAll();
    X.toast(T.t("wb.toast.loaded"));
  }

  /* ------------------------------------------------------------- logging */
  /* log entries are stored as i18n keys + arguments, so a language switch
     re-renders history instead of leaving mixed-language text behind */
  function pushLog(entry, silent) {
    var shape = entry.df.shape();
    state.log.push({
      key: entry.key,
      args: entry.args || [],
      code: entry.code,
      rows: shape[0],
      cols: shape[1]
    });
    if (!silent) renderLog();
  }

  function logLabel(entry) {
    return entry.key ? T.fmt(entry.key, entry.args) : "";
  }

  function renderLog() {
    var host = $("opLog");
    if (!state.log.length) {
      host.innerHTML = '<div class="log-empty">' + esc(T.t("wb.log.empty")) + "</div>";
      return;
    }
    host.innerHTML = state.log.map(function (e, i) {
      return '<div class="log-item">' +
        '<span class="log-idx">' + (i + 1) + "</span>" +
        '<div class="log-body">' +
          '<div class="log-name">' + esc(logLabel(e)) + "</div>" +
          '<div class="log-code">' + esc(e.code) + "</div>" +
          '<div class="log-shape">shape = (' + e.rows + ", " + e.cols + ")</div>" +
        "</div>" +
      "</div>";
    }).join("");
    host.scrollTop = host.scrollHeight;
  }

  /* ------------------------------------------------------------ controls */
  function fillSelect(sel, options, placeholder) {
    var previous = sel.value;
    var html = placeholder ? '<option value="">' + esc(placeholder) + "</option>" : "";
    html += options.map(function (o) {
      return '<option value="' + esc(o.value) + '">' + esc(o.label) + "</option>";
    }).join("");
    sel.innerHTML = html;
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === previous) { sel.value = previous; break; }
    }
  }

  function syncControls() {
    var df = state.df, cols = df.columns;
    var nums = df.numericColumns(), objs = df.objectColumns();

    fillSelect($("sortCol"), cols.map(function (c) {
      return { value: c, label: c + "  (" + df.dtypes[c] + ")" };
    }));

    fillSelect($("aggCol"), nums.map(function (c) { return { value: c, label: c }; }));

    /* remember the current group-by selection so re-syncing never silently
       changes what the next run aggregates */
    var groupSel = $("groupBy");
    var previouslySelected = [];
    for (var g = 0; g < groupSel.options.length; g++) {
      if (groupSel.options[g].selected) previouslySelected.push(groupSel.options[g].value);
    }
    groupSel.innerHTML = cols.map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + "  (" + esc(df.dtypes[c]) + ")</option>";
    }).join("");
    var restored = 0;
    for (var h = 0; h < groupSel.options.length; h++) {
      var optVal = groupSel.options[h].value;
      var wanted;
      if (previouslySelected.length) wanted = previouslySelected.indexOf(optVal) >= 0;
      else if (!state.groupTouched) wanted = (optVal === "region" || optVal === "indicator");
      else wanted = false;
      if (wanted) { groupSel.options[h].selected = true; restored++; }
    }
    /* only fall back to a default while the user has never touched the control,
       otherwise an intentionally empty selection would be silently overridden */
    if (!restored && !state.groupTouched && groupSel.options.length) {
      groupSel.options[0].selected = true;
    }

    fillSelect($("pivotIndex"), cols.map(function (c) { return { value: c, label: c }; }));
    fillSelect($("pivotCols"), objs.concat(nums).map(function (c) { return { value: c, label: c }; }));
    fillSelect($("pivotValues"), nums.map(function (c) { return { value: c, label: c }; }));

    /* column chips reflect the projection currently in force */
    var chips = $("colChips");
    chips.innerHTML = cols.map(function (c) {
      var on = state.colSelection[c] !== false;
      return '<span class="chip' + (on ? " on" : "") + '" data-col="' + esc(c) + '">' + esc(c) + "</span>";
    }).join("");

    /* indicator picker (only meaningful for the long/tidy table) */
    syncIndicatorPicker();

    /* pivot / agg defaults: only fill in when the control is still empty */
    if ($("pivotCols").options.length && objs.length && !$("pivotCols").value) $("pivotCols").value = objs[0];
    if ($("pivotValues").options.length && nums.length && !$("pivotValues").value) $("pivotValues").value = nums[0];
    if ($("pivotIndex").options.length && !$("pivotIndex").value) {
      $("pivotIndex").value = cols.indexOf("year") >= 0 ? "year" : cols[0];
    }
    if ($("aggCol").options.length && !$("aggCol").value) $("aggCol").value = nums[0];
  }

  function isLongTable(df) {
    var c = df.columns;
    /* region is part of the contract: the long table is pivoted to
       year x region for the default chart */
    return c.indexOf("indicator") >= 0 && c.indexOf("value") >= 0 &&
           c.indexOf("year") >= 0 && c.indexOf("region") >= 0;
  }

  function syncIndicatorPicker() {
    var wrap = $("chartIndicatorWrap");
    if (!wrap) return;
    var df = viewFrame();
    if (!isLongTable(df)) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "";
    var sel = $("chartIndicator");
    if (!state.chartIndicator || !D.series[state.chartIndicator]) state.chartIndicator = "digital_share";
    sel.innerHTML = D.indicators.map(function (ind) {
      return '<option value="' + ind.key + '"' + (ind.key === state.chartIndicator ? " selected" : "") + ">" +
        T.indicatorLabel(ind) + "</option>";
    }).join("");
  }

  /* column chips act as a *view* projection: the underlying frame is never
     destroyed, so a de-selected column can always be brought back */
  function viewFrame() {
    var df = state.df;
    var cols = df.columns.filter(function (c) { return state.colSelection[c] !== false; });
    if (!cols.length || cols.length === df.columns.length) return df;
    return df.select(cols);
  }

  /* --------------------------------------------------------------- table */
  function renderTable() {
    var df = viewFrame();
    var n = Math.max(1, Math.min(parseInt($("headN").value, 10) || 12, 200));
    state.tableLimit = n;
    var head = df.head(n);

    var html = "<thead><tr><th class='idx'>#</th>";
    head.columns.forEach(function (c) {
      var num = df.dtypes[c] === "number";
      html += "<th class='" + (num ? "num" : "") + "'>" + esc(c) +
        '<span class="dt">' + esc(df.dtypes[c]) + "</span></th>";
    });
    html += "</tr></thead><tbody>";
    for (var i = 0; i < head.length; i++) {
      html += "<tr><td class='idx'>" + i + "</td>";
      head.columns.forEach(function (c) {
        var v = head.data[c][i];
        var num = df.dtypes[c] === "number";
        var text = v === null || v === undefined ? "NaN"
          : (num ? X.fmt(v, Math.abs(v) >= 1000 ? 0 : 3) : String(v));
        html += "<td class='" + (num ? "num" : "") + "'>" + esc(text) + "</td>";
      });
      html += "</tr>";
    }
    html += "</tbody>";
    $("dfTable").innerHTML = html;

    var shape = df.shape();
    var dtypes = df.columns.map(function (c) { return c + ":" + df.dtypes[c]; }).slice(0, 10).join(" · ");
    $("dfMeta").innerHTML =
      "<span class='meta-pill'>shape = (" + shape[0] + ", " + shape[1] + ")</span>" +
      "<span class='meta-pill'>" + T.t("wb.rows") + ": <b>" + shape[0] + "</b></span>" +
      "<span class='meta-pill'>" + T.t("wb.cols.n") + ": <b>" + shape[1] + "</b></span>" +
      "<span class='meta-pill'>" + T.t("wb.memory") + ": <b>" + X.bytes(df.memory()) + "</b></span>" +
      "<span class='meta-pill'>" + T.t("wb.numeric") + ": <b>" + df.numericColumns().length + "</b></span>" +
      "<span class='meta-pill' style='font-family:var(--mono);font-size:10.5px'>" + esc(dtypes) + "</span>";
  }

  /* --------------------------------------------------------------- stats */
  function renderStats() {
    var df = viewFrame(), nums = df.numericColumns();
    var host = $("wbStats");
    if (!nums.length) {
      host.innerHTML = "<div class='note'>" + T.t("wb.noNumCol") + "</div>";
      return;
    }
    host.innerHTML = nums.slice(0, 8).map(function (c, i) {
      var vals = [];
      for (var k = 0; k < df.length; k++) {
        var v = df.data[c][k];
        if (typeof v === "number" && isFinite(v)) vals.push(v);
      }
      var mean = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0;
      var mx = vals.length ? maxOf(vals) : 0;
      var mn = vals.length ? minOf(vals) : 0;
      var color = X.PALETTE[i % 10];
      return "<div class='stat'>" +
        "<div class='s-name'>" + esc(c) + "</div>" +
        "<div class='s-row'><span>mean</span><span>" + X.fmt(mean, 2) + "</span></div>" +
        "<div class='s-row'><span>min</span><span>" + X.fmt(mn, 2) + "</span></div>" +
        "<div class='s-row'><span>max</span><span>" + X.fmt(mx, 2) + "</span></div>" +
        "<div class='stat-bar'><i style='width:" + (mx ? 100 : 0) + "%;background:" + color + "'></i></div>" +
      "</div>";
    }).join("");
  }

  /* -------------------------------------------------------------- charts */
  function chartFrame() {
    var df = viewFrame();
    if (isLongTable(df) && state.chartIndicator) {
      try {
        var sub = df.query("indicator == '" + state.chartIndicator + "'");
        if (sub.length) {
          var piv = sub.pivotTable("year", "region", "value", "mean");
          if (piv.frame.length) return { frame: piv.frame, kind: "pivot" };
        }
      } catch (e) {
        /* fall back to the raw frame rather than breaking the whole render */
      }
    }
    return { frame: df, kind: "plain" };
  }

  function histogram(values, bins) {
    var mn = minOf(values), mx = maxOf(values);
    if (mn === mx) return { bins: [mn], counts: [values.length] };
    var width = (mx - mn) / bins;
    var counts = [], edges = [];
    for (var i = 0; i < bins; i++) {
      edges.push(+(mn + i * width).toFixed(3));
      counts.push(0);
    }
    values.forEach(function (v) {
      var idx = Math.min(bins - 1, Math.floor((v - mn) / width));
      counts[idx]++;
    });
    return { bins: edges, counts: counts };
  }

  function renderChart() {
    var chartHost = $("wbChart");
    var mode = $("chartType").value;
    var picked = chartFrame();
    var frame = picked.frame;
    var nums = frame.numericColumns(), objs = frame.objectColumns();

    if (!nums.length) {
      X.chart("wbChart").clear();
      X.chart("wbChart").setOption({
        title: { text: T.t("wb.noNumCol"), left: "center", top: "middle", textStyle: { color: X.INK3, fontSize: 13, fontWeight: 500 } }
      });
      return;
    }
    var inst = X.chart("wbChart");

    var xCol = objs.length ? objs[0] : frame.columns[0];
    var seriesCols = frame.columns.filter(function (c) {
      return c !== xCol && frame.dtypes[c] === "number";
    }).slice(0, 12);

    var xData = [];
    for (var i = 0; i < frame.length; i++) {
      var v = frame.data[xCol][i];
      xData.push(typeof v === "number" ? String(X.fmt(v, v % 1 === 0 ? 0 : 2)) : String(v));
    }

    var option;
    if (mode === "pie") {
      var pieCol = nums[0];
      var rows = [];
      for (var p = 0; p < frame.length; p++) rows.push({ name: xData[p], value: frame.data[pieCol][p] });
      rows.sort(function (a, b) { return b.value - a.value; });
      if (rows.length > 12) rows = rows.slice(0, 12);
      option = {
        tooltip: { trigger: "item", formatter: function (p) {
          return esc(p.name) + "<br/>" + X.fmt(p.value, 3) + " (" + p.percent + "%)";
        } },
        legend: { type: "scroll", bottom: 0, itemWidth: 9, itemHeight: 9 },
        series: [{
          type: "pie", radius: ["34%", "70%"], center: ["50%", "46%"], roseType: "radius",
          data: rows.map(function (d, i) { return { name: d.name, value: d.value, itemStyle: { color: X.PALETTE[i % 10] } }; }),
          label: { fontSize: 10.5, color: X.INK2 },
          itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 }
        }]
      };
    } else if (mode === "scatter") {
      var xs = frame.data[nums[0]], ys = frame.data[nums[1] || nums[0]];
      var pts = [];
      for (var s = 0; s < frame.length; s++) {
        if (isFinite(xs[s]) && isFinite(ys[s])) pts.push([xs[s], ys[s]]);
      }
      option = {
        tooltip: { formatter: function (q) {
          return esc(nums[0]) + ": " + X.fmt(q.data[0], 3) + "<br/>" +
                 esc(nums[1] || nums[0]) + ": " + X.fmt(q.data[1], 3);
        } },
        grid: { left: 8, right: 20, top: 26, bottom: 6, containLabel: true },
        xAxis: { type: "value", name: nums[0], scale: true, nameTextStyle: { color: X.INK3, fontSize: 11 } },
        yAxis: { type: "value", name: nums[1] || nums[0], scale: true, nameTextStyle: { color: X.INK3, fontSize: 11 } },
        series: [{
          type: "scatter", data: pts, symbolSize: 9,
          itemStyle: { color: X.withAlpha(X.PALETTE[0], 0.72) }
        }]
      };
    } else if (mode === "box") {
      var boxData = seriesCols.map(function (c) {
        var vals = [];
        for (var k = 0; k < frame.length; k++) {
          var vv = frame.data[c][k];
          if (typeof vv === "number" && isFinite(vv)) vals.push(vv);
        }
        vals.sort(function (a, b) { return a - b; });
        if (!vals.length) return [0, 0, 0, 0, 0];
        return [
          vals[0],
          DF.percentile(vals, 0.25),
          DF.percentile(vals, 0.5),
          DF.percentile(vals, 0.75),
          vals[vals.length - 1]
        ].map(function (n) { return +n.toFixed(3); });
      });
      option = {
        tooltip: { trigger: "item", formatter: function (p) {
          return esc(p.seriesName) + "<br/>" + X.fmt(p.value, 3);
        } },
        grid: { left: 8, right: 20, top: 26, bottom: 6, containLabel: true },
        xAxis: { type: "category", data: seriesCols, axisLabel: { fontSize: 10.5, rotate: 24, color: X.INK3 } },
        yAxis: { type: "value", scale: true },
        series: [{
          type: "boxplot", data: boxData,
          itemStyle: { color: X.withAlpha(X.PALETTE[1], 0.55), borderColor: X.PALETTE[1], borderWidth: 1.6 }
        }]
      };
    } else {
      var isArea = mode === "area";
      var isBar = mode === "bar";
      option = {
        tooltip: { trigger: "axis", axisPointer: { type: isBar ? "shadow" : "line" },
          /* escape axis labels and series names: both can originate from an
             uploaded CSV and ECharts renders HTML tooltips by default */
          formatter: function (params) {
            if (!params || !params.length) return "";
            var out = esc(params[0].axisValue);
            params.forEach(function (p) {
              out += "<br/>" + p.marker + esc(p.seriesName) + ": " +
                     X.fmt(typeof p.value === "number" ? p.value : Number(p.value), 3);
            });
            return out;
          } },
        legend: { type: "scroll", right: 4, top: 0, itemWidth: 9, itemHeight: 9 },
        grid: { left: 8, right: 22, top: 44, bottom: 6, containLabel: true },
        xAxis: { type: "category", data: xData, boundaryGap: isBar,
                 axisLabel: { fontSize: 10.5, color: X.INK3, rotate: xData.length > 14 ? 32 : 0 } },
        yAxis: { type: "value", scale: true },
        series: seriesCols.map(function (c, i) {
          var color = X.PALETTE[i % 10];
          var data = [];
          for (var r = 0; r < frame.length; r++) {
            var val = frame.data[c][r];
            data.push(typeof val === "number" ? +val.toFixed(4) : null);
          }
          var base = {
            name: c, type: isBar ? "bar" : "line", data: data,
            itemStyle: { color: color, borderRadius: isBar ? [5, 5, 0, 0] : 0 },
            lineStyle: { width: 2.6, color: color },
            smooth: true, symbolSize: 6,
            emphasis: { focus: "series" }
          };
          if (isArea) {
            base.type = "line";
            base.stack = "total";
            base.areaStyle = { color: X.withAlpha(color, 0.55) };
            base.lineStyle = { width: 1.6, color: color };
            base.symbol = "none";
          }
          if (isBar) base.barMaxWidth = 30;
          return base;
        })
      };
    }
    inst.setOption(option, true);
  }

  function renderCorrChart() {
    var frame = viewFrame();
    var res = frame.corr();
    if (!res.columns.length) { X.toast(T.t("wb.noNumCol")); return; }
    var data = [];
    res.matrix.forEach(function (row, i) {
      row.forEach(function (v, j) { data.push([j, i, v === null ? 0 : +v.toFixed(3)]); });
    });
    X.chart("wbChart").setOption({
      tooltip: { formatter: function (p) {
        return esc(res.columns[p.data[1]]) + " × " + esc(res.columns[p.data[0]]) + " = " + p.data[2].toFixed(3);
      } },
      grid: { left: 8, right: 16, top: 12, bottom: 56, containLabel: true },
      xAxis: { type: "category", data: res.columns, splitArea: { show: true }, axisLabel: { rotate: 40, fontSize: 10, color: X.INK3 } },
      yAxis: { type: "category", data: res.columns, splitArea: { show: true }, axisLabel: { fontSize: 10, color: X.INK3 } },
      visualMap: {
        min: -1, max: 1, calculable: true, orient: "horizontal", left: "center", bottom: 4,
        itemHeight: 96, itemWidth: 11, precision: 2, textStyle: { color: X.INK3, fontSize: 10 },
        inRange: { color: ["#9BBBD4", "#E4E9EE", "#FFFFFF", "#F0DCD1", "#D9A08F"] }
      },
      series: [{ type: "heatmap", data: data, itemStyle: { borderColor: "#fff", borderWidth: 1.5, borderRadius: 3 } }]
    }, true);
    pushLog({
      key: "wb.log.corr",
      code: "df.corr(numeric_only=True)",
      df: state.df
    });
  }

  function renderHistChart() {
    var frame = viewFrame();
    var nums = frame.numericColumns();
    if (!nums.length) { X.toast(T.t("wb.noNumCol")); return; }
    var col = $("aggCol").value && nums.indexOf($("aggCol").value) >= 0 ? $("aggCol").value : nums[0];
    var values = [];
    for (var i = 0; i < frame.length; i++) {
      var v = frame.data[col][i];
      if (typeof v === "number" && isFinite(v)) values.push(v);
    }
    if (!values.length) { X.toast(T.t("wb.noNumCol")); return; }
    var h = histogram(values, 12);
    X.chart("wbChart").setOption({
      tooltip: { trigger: "axis" },
      grid: { left: 8, right: 20, top: 30, bottom: 8, containLabel: true },
      xAxis: { type: "category", data: h.bins.map(function (b) { return X.fmt(b, 2); }),
               axisLabel: { fontSize: 10, color: X.INK3, rotate: 30 } },
      yAxis: { type: "value", name: "count" },
      series: [{
        type: "bar", barWidth: "92%",
        data: h.counts.map(function (c, i) { return { value: c, itemStyle: { color: X.withAlpha(X.PALETTE[i % 10], 0.8), borderRadius: [4, 4, 0, 0] } }; })
      }]
    }, true);
    pushLog({
      key: "wb.log.hist",
      args: [col],
      code: 'df["' + col + '"].plot.hist(bins=12)',
      df: state.df
    });
  }

  function renderDescribeTable() {
    var res = viewFrame().describe();
    var frame = res.frame;
    var shell = $("statsTableShell");
    if (!res.numericColumns.length) { shell.style.display = "none"; return; }
    shell.style.display = "";
    var html = "<thead><tr><th>statistic</th>";
    res.numericColumns.forEach(function (c) { html += "<th class='num'>" + esc(c) + "</th>"; });
    html += "</tr></thead><tbody>";
    for (var i = 0; i < frame.length; i++) {
      html += "<tr><td>" + esc(frame.data.statistic[i]) + "</td>";
      res.numericColumns.forEach(function (c) {
        var v = frame.data[c][i];
        html += "<td class='num'>" + (v === null ? "NaN" : X.fmt(v, 3)) + "</td>";
      });
      html += "</tr>";
    }
    html += "</tbody>";
    $("statsTable").innerHTML = html;
  }

  /* -------------------------------------------------------------- health */
  function renderHealth() {
    var host = $("healthGrid");
    if (!host) return;
    var df = viewFrame();
    var total = df.length;
    var rows = df.columns.map(function (c, i) {
      var filled = 0, seen = Object.create(null), nuni = 0;
      for (var r = 0; r < total; r++) {
        var v = df.data[c][r];
        if (v !== null && v !== undefined && v !== "") {
          filled++;
          var k = String(v);
          if (!seen[k]) { seen[k] = 1; nuni++; }
        }
      }
      return { col: c, type: df.dtypes[c], filled: filled, nuni: nuni,
               color: X.PALETTE[i % X.PALETTE.length] };
    });

    var cells = 0, filledCells = 0;
    rows.forEach(function (r) { cells += total; filledCells += r.filled; });
    var completeness = cells ? (filledCells / cells * 100) : 0;
    var dupes = total - df.dropDuplicates().length;
    var uniqueTotal = rows.reduce(function (a, r) { return a + r.nuni; }, 0);

    host.innerHTML = rows.map(function (r) {
      var pct = total ? (r.filled / total * 100) : 0;
      return '<div class="health-row">' +
        '<span class="h-name" title="' + esc(r.col) + '">' + esc(r.col) + "</span>" +
        '<span class="h-type">' + esc(r.type) + "</span>" +
        '<span class="health-bar"><i style="width:' + pct.toFixed(1) + "%;background:" + r.color + '"></i></span>' +
        '<span class="h-pct">' + X.fmt(pct, 1) + "%</span>" +
        '<span class="h-nuni">' + r.nuni + "</span>" +
      "</div>";
    }).join("");

    $("healthMeta").innerHTML =
      "<span class='meta-pill'>" + esc(T.t("wb.health.complete")) + ": <b>" + X.fmt(completeness, 1) + "%</b></span>" +
      "<span class='meta-pill'>" + esc(T.t("wb.health.missing")) + ": <b>" + (cells - filledCells) + "</b></span>" +
      "<span class='meta-pill'>" + esc(T.t("wb.health.dupes")) + ": <b>" + dupes + "</b></span>" +
      "<span class='meta-pill'>" + esc(T.t("wb.health.unique")) + ": <b>" + uniqueTotal + "</b></span>";
  }

  /* ----------------------------------------------------------- operation */
  function apply(newDf, logKey, logArgs, code, toastKey) {
    state.df = newDf;
    /* the frame changed: a stale view projection would hide columns of the
       new result set, so fall back to "all columns" */
    state.colSelection = Object.create(null);
    pushLog({ key: logKey, args: logArgs || [], code: code, df: newDf });
    syncControls();
    renderAll();
    if (toastKey) X.toast(T.t(toastKey));
  }

  function wrapError(fn) {
    return function () {
      try { fn.apply(null, arguments); }
      catch (e) { X.toast(T.t("wb.toast.error") + (e && e.message ? e.message : e)); }
    };
  }

  /* ------------------------------------------------------------- render */
  function renderAll() {
    renderTable();
    renderStats();
    renderHealth();
    renderLog();
    renderChart();
  }

  /* ------------------------------------------------------------ bindings */
  function init() {
    /* --- data source --- */
    $("dsSelect").addEventListener("change", function () { loadDefault(this.value); });
    $("btnReload").addEventListener("click", function () { loadDefault($("dsSelect").value); });

    var fileInput = $("fileInput"), dropZone = $("dropZone");
    dropZone.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) parseFile(fileInput.files[0]);
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.style.borderColor = X.PALETTE[0]; });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.style.borderColor = ""; });
    });
    dropZone.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) parseFile(f);
    });

    $("btnParsePaste").addEventListener("click", wrapError(function () {
      var text = $("pasteArea").value.trim();
      if (!text) { X.toast(T.t("wb.err.empty")); return; }
      var res = global.Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
      if (!res.data || !res.data.length) { X.toast(T.t("wb.err.norows")); return; }
      loadRecords(res.data, "pasted.csv");
      X.toast(T.t("wb.toast.pasted"));
    }));

    /* --- transform --- */
    $("btnFilter").addEventListener("click", wrapError(function () {
      var expr = $("filterExpr").value.trim();
      if (!expr) { X.toast(T.t("wb.err.query")); return; }
      apply(state.df.query(expr), "wb.log.filter", [], 'df.query("' + expr + '")', "wb.toast.filtered");
    }));
    $("btnClearFilter").addEventListener("click", function () {
      $("filterExpr").value = "";
      state.df = state.original;
      state.colSelection = Object.create(null);
      state.log = [];
      pushLog({ key: "wb.log.restore", code: 'df = pd.read_csv("<current source>")', df: state.df }, true);
      syncControls();
      renderAll();
      X.toast(T.t("wb.toast.reset"));
    });

    $("btnSortAsc").addEventListener("click", wrapError(function () { doSort(true); }));
    $("btnSortDesc").addEventListener("click", wrapError(function () { doSort(false); }));

    $("colChips").addEventListener("click", wrapError(function (e) {
      var chip = e.target && e.target.closest ? e.target.closest(".chip") : null;
      if (!chip) return;
      var col = chip.getAttribute("data-col");
      if (!col) return;
      var turningOff = state.colSelection[col] !== false;
      if (turningOff) {
        var stillOn = state.df.columns.filter(function (c) {
          return c !== col && state.colSelection[c] !== false;
        });
        if (!stillOn.length) { X.toast(T.t("wb.err.lastcol")); return; }
      }
      state.colSelection[col] = !turningOff;
      chip.classList.toggle("on");
      renderAll();
      X.toast(T.t("wb.toast.cols"));
    }));

    $("btnDropna").addEventListener("click", function () {
      apply(state.df.dropna(), "wb.log.dropna", [], "df.dropna()", "wb.toast.na");
    });
    $("btnFillna").addEventListener("click", function () {
      apply(state.df.fillna("mean"), "wb.log.fillna", [], "df.fillna(df.mean(numeric_only=True))", "wb.toast.na");
    });
    $("btnDropdup").addEventListener("click", function () {
      apply(state.df.dropDuplicates(), "wb.log.dropdup", [], "df.drop_duplicates()", "wb.toast.dup");
    });
    $("btnNewCol").addEventListener("click", wrapError(function () {
      var name = $("newColName").value.trim();
      var expr = $("newColExpr").value.trim();
      if (!name || !expr) { X.toast(T.t("wb.err.nameexpr")); return; }
      apply(state.df.assign(name, expr), "wb.log.assign", [name],
            'df.assign(' + name + '=lambda df: df.eval("' + expr + '"))',
            "wb.toast.newcol");
    }));

    /* --- group / pivot --- */
    $("btnGroup").addEventListener("click", wrapError(function () {
      var sel = $("groupBy");
      var keys = [];
      for (var i = 0; i < sel.options.length; i++) if (sel.options[i].selected) keys.push(sel.options[i].value);
      if (!keys.length) { X.toast(T.t("wb.err.groupby")); return; }
      var col = $("aggCol").value, func = $("aggFunc").value;
      var out = state.df.groupAgg(keys, col, func);
      apply(out, "wb.log.group", [keys.join("+"), func, col],
            'df.groupby([' + keys.map(function (k) { return '"' + k + '"'; }).join(", ") + '])["' + col + '"].' + func + '().reset_index()',
            "wb.toast.grouped");
    }));
    $("btnPivot").addEventListener("click", wrapError(function () {
      var idx = $("pivotIndex").value, cols = $("pivotCols").value, vals = $("pivotValues").value;
      if (!idx || !cols || !vals) { X.toast(T.t("wb.err.pivot")); return; }
      var func = $("aggFunc").value;
      var piv = state.df.pivotTable(idx, cols, vals, func);
      apply(piv.frame, "wb.log.pivot", [idx, cols],
            'df.pivot_table(index="' + idx + '", columns="' + cols + '", values="' + vals + '", aggfunc="' + func + '")',
            "wb.toast.pivot");
    }));
    $("btnReset").addEventListener("click", function () {
      $("filterExpr").value = "";
      loadDefault($("dsSelect").value);
      X.toast(T.t("wb.toast.reset"));
    });

    /* --- chart controls --- */
    $("chartType").addEventListener("change", function () {
      renderChart();
      pushLog({
        key: "wb.log.plot",
        args: [this.value],
        code: 'df.plot(kind="' + this.value + '")',
        df: state.df
      });
    });
    var indSel = $("chartIndicator");
    indSel.addEventListener("change", function () {
      state.chartIndicator = this.value;
      renderChart();
    });
    $("groupBy").addEventListener("change", function () { state.groupTouched = true; });
    $("headN").addEventListener("change", function () { renderTable(); });
    $("btnSummary").addEventListener("click", function () {
      renderDescribeTable();
      pushLog({ key: "wb.log.describe", code: "df.describe()", df: state.df });
    });
    $("btnValueCounts").addEventListener("click", wrapError(function () {
      var objs = state.df.objectColumns();
      var col = objs.length ? objs[0] : state.df.columns[0];
      var vc = state.df.valueCounts(col, 20);
      state.df = vc;
      state.colSelection = Object.create(null);
      pushLog({
        key: "wb.log.valuecounts",
        args: [col],
        code: 'df["' + col + '"].value_counts()',
        df: vc
      });
      syncControls();
      renderStats();
      renderTable();
      $("chartType").value = "bar";
      renderChart();
      X.toast(T.t("wb.toast.grouped"));
    }));
    $("btnCorr").addEventListener("click", function () { renderCorrChart(); });
    $("btnHist").addEventListener("click", function () { renderHistChart(); });
    $("btnExport").addEventListener("click", function () {
      X.download("nqpf_result.csv", state.df.toCSV());
      pushLog({
        key: "wb.log.export",
        code: 'df.to_csv("nqpf_result.csv", index=False)',
        df: state.df
      });
      X.toast(T.t("wb.toast.exported"));
    });

    /* dropping a file anywhere else must not navigate away from the page */
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) { e.preventDefault(); });

    /* start from the default dataset */
    loadDefault("long");

    window.addEventListener("resize", X.debounce(function () {
      if ($("view-workbench").classList.contains("active")) X.resizeAll();
    }, 160));
  }

  function doSort(ascending) {
    var by = $("sortCol").value;
    if (!by) { X.toast(T.t("wb.err.column")); return; }
    apply(state.df.sortValues(by, ascending), "wb.log.sort", [by, ascending ? "↑" : "↓"],
          'df.sort_values("' + by + '", ascending=' + (ascending ? "True" : "False") + ")",
          "wb.toast.sorted");
  }

  function parseFile(file) {
    if (!global.Papa) { X.toast(T.t("wb.err.plugin")); return; }
    global.Papa.parse(file, {
      header: true, dynamicTyping: true, skipEmptyLines: true,
      complete: function (results) {
        loadRecords(results.data, file.name);
      },
      error: function (err) { X.toast(T.t("wb.toast.error") + err.message); }
    });
  }

  /* re-render everything after a language switch */
  function refresh() {
    syncControls();
    renderAll();
    var shell = $("statsTableShell");
    if (shell && shell.style.display !== "none") renderDescribeTable();
  }

  global.WORKBENCH = { init: init, refresh: refresh };
})(window);
