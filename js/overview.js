/* ==========================================================================
   overview.js — the "visualisation overview" view.
   Every chart on this page is COMPUTED from the default dataset
   (window.NQPF): means, indices, standardisation, correlations and a
   least-squares regression are derived at runtime, not hard-coded.
   ========================================================================== */
(function (global) {
  "use strict";

  var D = global.NQPF, X = global.NQPFX, T = global.I18N;

  var YEARS = D.years;
  var REGIONS = D.regions;
  var IND = {};
  D.indicators.forEach(function (i) { IND[i.key] = i; });

  /* NQPF dimension: technology, digital, green, efficiency, human capital */
  var NQPF_KEYS = ["rd_intensity", "patents_per10k", "digital_share", "clean_energy", "labor_prod"];
  /* Social development dimension: income, jobs, education, connectivity, less energy per unit GDP */
  var SOC_KEYS = ["income", "new_jobs", "edu_years", "internet"];
  var SOC_INV = ["energy_intensity"];

  /* ------------------------------------------------------------- helpers */
  function label(key) { return T.indicatorLabel(IND[key]); }
  function rn(r) { return T.region(r); }

  function meanByYear(key) {
    return YEARS.map(function (_, yi) {
      var s = 0;
      REGIONS.forEach(function (r) { s += D.series[key][r][yi]; });
      return s / REGIONS.length;
    });
  }

  function toIndex(values, invert) {
    var base = values[0];
    return values.map(function (v) { return invert ? (base / v * 100) : (v / base * 100); });
  }

  function compositeIndex(keys, invKeys) {
    var acc = YEARS.map(function () { return 0; });
    keys.concat(invKeys || []).forEach(function (k) {
      var inv = (invKeys || []).indexOf(k) >= 0;
      toIndex(meanByYear(k), inv).forEach(function (v, i) { acc[i] += v; });
    });
    var n = keys.length + (invKeys || []).length;
    return acc.map(function (v) { return v / n; });
  }

  function pearson(a, b) {
    var n = Math.min(a.length, b.length), xs = [], ys = [];
    for (var i = 0; i < n; i++) {
      if (isFinite(a[i]) && isFinite(b[i])) { xs.push(a[i]); ys.push(b[i]); }
    }
    var m = xs.length;
    if (m < 3) return null;
    var mx = xs.reduce(function (p, q) { return p + q; }, 0) / m;
    var my = ys.reduce(function (p, q) { return p + q; }, 0) / m;
    var num = 0, dx = 0, dy = 0;
    for (var k = 0; k < m; k++) {
      var u = xs[k] - mx, v = ys[k] - my;
      num += u * v; dx += u * u; dy += v * v;
    }
    if (dx === 0 || dy === 0) return null;
    return num / Math.sqrt(dx * dy);
  }

  /* min-max standardisation across regions for one year -> 0..100 */
  function standardiseYear(key, yi) {
    var vals = REGIONS.map(function (r) { return D.series[key][r][yi]; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var out = {};
    REGIONS.forEach(function (r, i) {
      out[r] = mx === mn ? 50 : (vals[i] - mn) / (mx - mn) * 100;
    });
    return out;
  }

  function linearFit(pts) {
    var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    var denom = n * sxx - sx * sx;
    if (denom === 0) return null;
    var b = (n * sxy - sx * sy) / denom;
    return { a: (sy - b * sx) / n, b: b };
  }

  /* ------------------------------------------------------------ KPI cards */
  var SPARKS = {};
  function sparkOption(values, color) {
    return {
      animation: true,
      grid: { left: 2, right: 2, top: 6, bottom: 2 },
      xAxis: { type: "category", show: false, boundaryGap: false, data: YEARS },
      yAxis: { type: "value", show: false, scale: true },
      tooltip: { show: false },
      series: [{
        type: "line", data: values, smooth: true, symbol: "none",
        lineStyle: { width: 2, color: color },
        areaStyle: { color: X.linearGrad(color, 0.34, 0.02) }
      }]
    };
  }

  function renderKpis() {
    var cards = [
      { key: "labor_prod", color: X.PALETTE[0] },
      { key: "digital_share", color: X.PALETTE[1] },
      { key: "income", color: X.PALETTE[5] },
      { key: "energy_intensity", color: X.PALETTE[3], invert: true }
    ];
    var host = document.getElementById("kpiRow");
    host.innerHTML = cards.map(function (c, i) {
      return '' +
        '<div class="kpi" style="--k-accent:' + c.color + '">' +
          '<div class="kpi-label">' + label(c.key) + '</div>' +
          '<div class="kpi-value" id="kpiVal' + i + '"></div>' +
          '<div class="kpi-foot">' +
            '<span class="delta" id="kpiDelta' + i + '"></span>' +
            '<div class="kpi-spark" id="kpiSpark' + i + '"></div>' +
          '</div>' +
        '</div>';
    }).join("");

    cards.forEach(function (c, i) {
      var mean = meanByYear(c.key);
      var last = mean[mean.length - 1], first = mean[0];
      var chg = (last - first) / first * 100;
      var ind = IND[c.key];
      document.getElementById("kpiVal" + i).innerHTML =
        X.fmt(last, last >= 1000 ? 0 : 2) + '<span class="unit">' + T.unit(ind) + '</span>';
      var el = document.getElementById("kpiDelta" + i);
      var good = c.invert ? chg < 0 : chg > 0;
      el.className = "delta " + (good ? "up" : "down");
      el.textContent = (chg >= 0 ? "+" : "") + X.fmt(chg, 1) + "% " + T.t("kpi.vs2015");
      X.chart("kpiSpark" + i).setOption(sparkOption(mean, c.color), true);
    });
  }

  /* --------------------------------------------------------- 1. trend = */
  function renderTrend() {
    var nqpf = compositeIndex(NQPF_KEYS, []);
    var soc = compositeIndex(SOC_KEYS, SOC_INV);
    X.chart("chartTrend").setOption({
      tooltip: { trigger: "axis", valueFormatter: function (v) { return X.fmt(v, 1); } },
      legend: { right: 6, top: 0 },
      grid: { left: 8, right: 18, top: 46, bottom: 6, containLabel: true },
      xAxis: { type: "category", boundaryGap: false, data: YEARS },
      yAxis: { type: "value", scale: true, name: "2015 = 100", nameTextStyle: { color: X.INK3, fontSize: 11 } },
      series: [
        {
          name: T.lang() === "en" ? "NQPF index" : "新质生产力指数",
          type: "line", data: nqpf.map(function (v) { return +v.toFixed(2); }),
          symbolSize: 7, lineStyle: { width: 3, color: X.PALETTE[0] },
          itemStyle: { color: X.PALETTE[0] },
          areaStyle: { color: X.linearGrad(X.PALETTE[0], 0.30, 0.02) }
        },
        {
          name: T.lang() === "en" ? "Social development index" : "社会发展指数",
          type: "line", data: soc.map(function (v) { return +v.toFixed(2); }),
          symbolSize: 7, lineStyle: { width: 3, color: X.PALETTE[1] },
          itemStyle: { color: X.PALETTE[1] },
          areaStyle: { color: X.linearGrad(X.PALETTE[1], 0.30, 0.02) }
        }
      ]
    }, true);
  }

  /* ------------------------------------------------------ 2. spillover = */
  function renderSpillover() {
    var drivers = [
      { key: "rd_intensity", name: T.lang() === "en" ? "R&D input" : "研发投入" },
      { key: "digital_share", name: T.lang() === "en" ? "Digital tech" : "数字技术" },
      { key: "clean_energy", name: T.lang() === "en" ? "Green energy" : "绿色能源" },
      { key: "edu_years", name: T.lang() === "en" ? "Talent" : "人才红利" }
    ];
    var outcomes = [
      { key: "labor_prod", name: T.lang() === "en" ? "Productivity" : "劳动生产率" },
      { key: "income", name: T.lang() === "en" ? "Income" : "居民收入" },
      { key: "new_jobs", name: T.lang() === "en" ? "Jobs" : "就业增长" },
      { key: "internet", name: T.lang() === "en" ? "Connectivity" : "数字普惠" }
    ];

    /* panel data: one observation per region-year */
    function panel(key) {
      var out = [];
      REGIONS.forEach(function (r) {
        for (var yi = 0; yi < YEARS.length; yi++) out.push(D.series[key][r][yi]);
      });
      return out;
    }

    var nodes = [], links = [];
    drivers.forEach(function (d) { nodes.push({ name: d.name, itemStyle: { color: X.PALETTE[0] } }); });
    outcomes.forEach(function (o) { nodes.push({ name: o.name, itemStyle: { color: X.PALETTE[1] } }); });

    drivers.forEach(function (d, di) {
      outcomes.forEach(function (o, oi) {
        var r = pearson(panel(d.key), panel(o.key));
        var w = Math.max(0, r === null ? 0 : r);          /* only positive spillovers */
        if (w > 0.05) {
          links.push({
            source: di, target: drivers.length + oi, value: +(w * 100).toFixed(1),
            lineStyle: { color: X.withAlpha(X.PALETTE[1], 0.30), opacity: 0.55 }
          });
        }
      });
    });

    X.chart("chartSpillover").setOption({
      tooltip: { trigger: "item", triggerOn: "mousemove",
        formatter: function (p) {
          if (p.dataType === "edge") {
            var from = nodes[p.data.source] ? nodes[p.data.source].name : p.data.source;
            var to = nodes[p.data.target] ? nodes[p.data.target].name : p.data.target;
            return from + " → " + to + "<br/>r = " + X.fmt(p.data.value / 100, 2);
          }
          return p.name;
        } },
      series: [{
        type: "sankey",
        left: 4, right: 96, top: 10, bottom: 10,
        nodeWidth: 13, nodeGap: 16,
        emphasis: { focus: "adjacency" },
        label: { color: X.INK2, fontSize: 11.5 },
        lineStyle: { curveness: 0.5 },
        data: nodes,
        links: links
      }]
    }, true);
  }

  /* ---------------------------------------------------------- 3. radar = */
  var radarRegions = ["北京", "广东", "贵州"];
  var RADAR_KEYS = ["rd_intensity", "patents_per10k", "digital_share", "labor_prod", "clean_energy", "income"];

  function renderRadarChips() {
    var host = document.getElementById("radarChips");
    host.innerHTML = REGIONS.map(function (r, i) {
      var on = radarRegions.indexOf(r) >= 0;
      return '<span class="chip' + (on ? " on" : "") + '" data-region="' + r + '" style="' +
        (on ? "border-color:" + X.PALETTE[i % 10] + ";" : "") + '">' + rn(r) + "</span>";
    }).join("");
    host.onclick = function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      var r = chip.getAttribute("data-region");
      var at = radarRegions.indexOf(r);
      if (at >= 0) { if (radarRegions.length > 1) radarRegions.splice(at, 1); }
      else { if (radarRegions.length >= 4) radarRegions.shift(); radarRegions.push(r); }
      renderRadarChips();
      renderRadar();
    };
  }

  function renderRadar() {
    var yi = YEARS.length - 1;
    var std = {};
    RADAR_KEYS.forEach(function (k) { std[k] = standardiseYear(k, yi); });

    X.chart("chartRadar").setOption({
      tooltip: {},
      legend: { bottom: 0, icon: "roundRect" },
      radar: {
        center: ["50%", "46%"], radius: "62%",
        indicator: RADAR_KEYS.map(function (k) { return { name: label(k), max: 100 }; }),
        axisName: { color: X.INK2, fontSize: 11 },
        splitLine: { lineStyle: { color: X.LINE } },
        splitArea: { areaStyle: { color: ["#FFFFFF", "#FCFAF6"] } },
        axisLine: { lineStyle: { color: X.LINE } }
      },
      series: [{
        type: "radar", symbolSize: 5,
        areaStyle: { opacity: 0.16 },
        data: radarRegions.map(function (r, i) {
          return {
            name: rn(r),
            value: RADAR_KEYS.map(function (k) { return +std[k][r].toFixed(1); }),
            lineStyle: { width: 2.4, color: X.PALETTE[REGIONS.indexOf(r) % 10] },
            itemStyle: { color: X.PALETTE[REGIONS.indexOf(r) % 10] }
          };
        })
      }]
    }, true);
  }

  /* -------------------------------------------------------- 4. scatter = */
  function renderScatter() {
    var pts = [], maxDigital = 0;
    REGIONS.forEach(function (r) {
      for (var yi = 0; yi < YEARS.length; yi++) {
        var xv = D.series.rd_intensity[r][yi];
        var yv = D.series.labor_prod[r][yi];
        var sv = D.series.digital_share[r][yi];
        maxDigital = Math.max(maxDigital, sv);
        pts.push([xv, yv, sv, r, YEARS[yi]]);
      }
    });
    var byRegion = REGIONS.map(function (r) {
      return {
        name: rn(r),
        type: "scatter",
        data: pts.filter(function (p) { return p[3] === r; }).map(function (p) { return [p[0], p[1], p[2], p[4]]; }),
        symbolSize: function (d) { return 7 + (d[2] / maxDigital) * 26; },
        itemStyle: { color: X.PALETTE[REGIONS.indexOf(r) % 10], opacity: 0.74 }
      };
    });
    var fit = linearFit(pts.map(function (p) { return [p[0], p[1]]; }));
    var xs = pts.map(function (p) { return p[0]; });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var trendName = T.lang() === "en" ? "Trend" : "趋势线";
    if (fit) {
      byRegion.push({
        name: trendName,
        type: "line", showSymbol: false, silent: true,
        data: [[xMin, fit.a + fit.b * xMin], [xMax, fit.a + fit.b * xMax]],
        lineStyle: { color: X.PALETTE[7], width: 2, type: "dashed" },
        itemStyle: { color: X.PALETTE[7] },
        tooltip: { show: false }
      });
    }

    X.chart("chartScatter").setOption({
      tooltip: {
        trigger: "item",
        formatter: function (p) {
          if (p.seriesName === trendName) return "";
          return p.seriesName + " · " + p.data[3] + "<br/>" +
            label("rd_intensity") + ": " + X.fmt(p.data[0], 2) + T.unit(IND.rd_intensity) + "<br/>" +
            label("labor_prod") + ": " + X.fmt(p.data[1], 1) + T.unit(IND.labor_prod) + "<br/>" +
            label("digital_share") + ": " + X.fmt(p.data[2], 1) + T.unit(IND.digital_share);
        }
      },
      legend: { type: "scroll", right: 4, top: 0, itemWidth: 9, itemHeight: 9 },
      grid: { left: 8, right: 18, top: 48, bottom: 4, containLabel: true },
      xAxis: { type: "value", name: label("rd_intensity"), scale: true,
               nameLocation: "middle", nameGap: 28, nameTextStyle: { color: X.INK3, fontSize: 11 } },
      yAxis: { type: "value", name: label("labor_prod"), scale: true,
               nameTextStyle: { color: X.INK3, fontSize: 11 } },
      series: byRegion
    }, true);
  }

  /* ----------------------------------------------------------- 5. heat = */
  function renderHeat() {
    var yi = YEARS.length - 1;
    var keys = ["rd_intensity", "patents_per10k", "digital_share", "labor_prod",
                "clean_energy", "income", "hightech", "edu_years", "internet"];
    var std = {};
    keys.forEach(function (k) { std[k] = standardiseYear(k, yi); });
    var data = [];
    REGIONS.forEach(function (r, ri) {
      keys.forEach(function (k, ki) {
        data.push([ki, ri, +std[k][r].toFixed(1)]);
      });
    });

    X.chart("chartHeat").setOption({
      tooltip: {
        formatter: function (p) {
          return rn(REGIONS[p.data[1]]) + " · " + label(keys[p.data[0]]) + "<br/>" + X.fmt(p.data[2], 1);
        }
      },
      grid: { left: 6, right: 14, top: 10, bottom: 48, containLabel: true },
      xAxis: { type: "category", data: keys.map(label), splitArea: { show: true },
               axisLabel: { rotate: 38, fontSize: 10, color: X.INK3 } },
      yAxis: { type: "category", data: REGIONS.map(rn), splitArea: { show: true },
               axisLabel: { fontSize: 11, color: X.INK2 } },
      visualMap: {
        min: 0, max: 100, calculable: true, orient: "horizontal",
        left: "center", bottom: 4, itemHeight: 96, itemWidth: 11,
        textStyle: { color: X.INK3, fontSize: 10 },
        inRange: { color: ["#FBF6EF", "#EAD9C6", "#D9A08F", "#A9A3CE", "#7FB0A8"] }
      },
      series: [{
        type: "heatmap", data: data,
        label: { show: true, fontSize: 9.5, color: "#5C5349", formatter: function (p) { return Math.round(p.data[2]); } },
        itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(70,60,48,.25)" } }
      }]
    }, true);
  }

  /* ----------------------------------------------------------- 6. rank = */
  function renderRank() {
    var yi = YEARS.length - 1;
    var rows = REGIONS.map(function (r) { return { r: r, v: D.series.hightech[r][yi] }; })
                      .sort(function (a, b) { return a.v - b.v; });
    X.chart("chartRank").setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" },
        formatter: function (ps) { return ps[0].name + "<br/>" + label("hightech") + ": " + X.fmt(ps[0].value, 0); } },
      grid: { left: 6, right: 40, top: 10, bottom: 4, containLabel: true },
      xAxis: { type: "value", axisLabel: { formatter: function (v) {
        return v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(Math.round(v));
      } } },
      yAxis: { type: "category", data: rows.map(function (d) { return rn(d.r); }), axisLabel: { fontSize: 11 } },
      series: [{
        type: "bar", barWidth: 13,
        data: rows.map(function (d, i) {
          return { value: d.v, itemStyle: { color: X.PALETTE[i % 10], borderRadius: [0, 5, 5, 0] } };
        }),
        label: { show: true, position: "right", fontSize: 10.5, color: X.INK2,
                 formatter: function (p) { return X.fmt(p.value, 0); } }
      }]
    }, true);
  }

  /* ---------------------------------------------------------- 7. race = */
  function renderRace() {
    function orderedNames(yi) {
      return REGIONS.slice().map(function (r) { return { name: rn(r), value: D.series.digital_share[r][yi] }; })
                    .sort(function (a, b) { return a.value - b.value; }).map(function (d) { return d.name; });
    }

    X.chart("chartRace").setOption({
      baseOption: {
        timeline: {
          axisType: "category", autoPlay: true, playInterval: 1100, loop: true,
          data: YEARS.map(String), bottom: 0, left: 14, right: 14,
          lineStyle: { color: X.LINE2 }, itemStyle: { color: X.PALETTE[4] },
          checkpointStyle: { color: X.PALETTE[0], borderColor: "rgba(217,160,143,.4)" },
          controlStyle: { color: X.PALETTE[0], borderColor: X.PALETTE[0] },
          label: { color: X.INK3, fontSize: 10.5 }
        },
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" },
          formatter: function (ps) { return ps[0].name + ": " + X.fmt(ps[0].value, 2) + "%"; } },
        grid: { left: 6, right: 44, top: 40, bottom: 44, containLabel: true },
        xAxis: { type: "value", max: 65, axisLabel: { formatter: "{value}%" } },
        yAxis: { type: "category", data: orderedNames(0), axisLabel: { fontSize: 11 } },
        series: [{
          type: "bar", barWidth: 12, realtimeSort: true,
          label: { show: true, position: "right", fontSize: 10.5, color: X.INK2,
                   formatter: function (p) { return X.fmt(p.value, 1) + "%"; } }
        }]
      },
      options: YEARS.map(function (year, yi) {
        var ordered = REGIONS.slice().map(function (r) { return { r: r, v: D.series.digital_share[r][yi] }; })
                                .sort(function (a, b) { return a.v - b.v; });
        return {
          title: { text: String(year), right: 14, top: 4, textStyle: { fontSize: 20, color: X.PALETTE[0], fontWeight: 700 } },
          yAxis: { data: ordered.map(function (d) { return rn(d.r); }) },
          series: [{
            data: ordered.map(function (d) {
              return { value: +d.v.toFixed(2), itemStyle: { color: X.PALETTE[REGIONS.indexOf(d.r) % 10], borderRadius: [0, 5, 5, 0] } };
            })
          }]
        };
      })
    }, true);
  }

  /* ---------------------------------------------------------- 8. corr = */
  function renderCorr() {
    var keys = D.indicators.map(function (i) { return i.key; });
    function panel(key) {
      var out = [];
      REGIONS.forEach(function (r) {
        for (var yi = 0; yi < YEARS.length; yi++) out.push(D.series[key][r][yi]);
      });
      return out;
    }
    var data = [], pairs = [];
    keys.forEach(function (a, i) {
      keys.forEach(function (b, j) {
        var r = pearson(panel(a), panel(b));
        var v = r === null ? 0 : r;
        data.push([i, j, +v.toFixed(3)]);
        if (i < j) pairs.push({ a: a, b: b, r: v });
      });
    });

    X.chart("chartCorr").setOption({
      tooltip: {
        formatter: function (p) {
          return label(keys[p.data[0]]) + "  ×  " + label(keys[p.data[1]]) + "<br/>r = " + p.data[2].toFixed(3);
        }
      },
      grid: { left: 6, right: 14, top: 10, bottom: 56, containLabel: true },
      xAxis: { type: "category", data: keys.map(label), splitArea: { show: true },
               axisLabel: { rotate: 40, fontSize: 10, color: X.INK3 } },
      yAxis: { type: "category", data: keys.map(label), splitArea: { show: true },
               axisLabel: { fontSize: 10, color: X.INK3 } },
      visualMap: {
        min: -1, max: 1, calculable: true, orient: "horizontal", left: "center", bottom: 4,
        itemHeight: 96, itemWidth: 11, precision: 2,
        textStyle: { color: X.INK3, fontSize: 10 },
        inRange: { color: ["#9BBBD4", "#E4E9EE", "#FFFFFF", "#F0DCD1", "#D9A08F"] }
      },
      series: [{
        type: "heatmap", data: data,
        label: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 1.5, borderRadius: 3 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: "rgba(70,60,48,.25)" } }
      }]
    }, true);
  }

  /* ---------------------------------------------------------- 9. rose = */
  function renderRose() {
    var yi = YEARS.length - 1;
    var rows = REGIONS.map(function (r) { return { name: rn(r), value: +D.series.clean_energy[r][yi].toFixed(2) }; })
                      .sort(function (a, b) { return b.value - a.value; });
    X.chart("chartRose").setOption({
      tooltip: { trigger: "item", formatter: function (p) { return p.name + "<br/>" + X.fmt(p.value, 2) + "%"; } },
      legend: { type: "scroll", bottom: 0, itemWidth: 9, itemHeight: 9 },
      series: [{
        type: "pie", roseType: "area", radius: ["24%", "72%"], center: ["50%", "44%"],
        data: rows.map(function (d, i) { return { name: d.name, value: d.value, itemStyle: { color: X.PALETTE[i % 10] } }; }),
        label: { fontSize: 10.5, color: X.INK2, formatter: "{b}\n{c}%" },
        labelLine: { length: 8, length2: 8, lineStyle: { color: X.LINE2 } },
        itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 }
      }]
    }, true);
  }

  /* ---------------------------------------------------------- 10. flow = */
  function renderFlow() {
    var income = meanByYear("income");
    var digital = meanByYear("digital_share");
    X.chart("chartFlow").setOption({
      tooltip: { trigger: "axis" },
      legend: { right: 4, top: 0 },
      grid: { left: 8, right: 14, top: 44, bottom: 4, containLabel: true },
      xAxis: { type: "category", boundaryGap: false, data: YEARS },
      yAxis: [
        { type: "value", name: label("income"), scale: true, nameTextStyle: { color: X.INK3, fontSize: 11 },
          axisLabel: { formatter: function (v) { return v >= 10000 ? (v / 10000) + "w" : v; } } },
        { type: "value", name: label("digital_share"), scale: true, nameTextStyle: { color: X.INK3, fontSize: 11 },
          axisLabel: { formatter: "{value}%" }, splitLine: { show: false } }
      ],
      series: [
        { name: label("income"), type: "line", smooth: true, symbolSize: 6,
          data: income.map(function (v) { return +v.toFixed(0); }),
          lineStyle: { width: 2.8, color: X.PALETTE[5] }, itemStyle: { color: X.PALETTE[5] },
          areaStyle: { color: X.linearGrad(X.PALETTE[5], 0.28, 0.02) } },
        { name: label("digital_share"), type: "line", smooth: true, symbolSize: 6, yAxisIndex: 1,
          data: digital.map(function (v) { return +v.toFixed(2); }),
          lineStyle: { width: 2.8, color: X.PALETTE[1] }, itemStyle: { color: X.PALETTE[1] } }
      ]
    }, true);
  }

  /* ------------------------------------------------------- 11. compare = */
  function renderCompare() {
    var keys = ["rd_intensity", "patents_per10k", "digital_share", "labor_prod",
                "clean_energy", "income", "hightech", "edu_years"];
    var rows = keys.map(function (k) {
      var m = meanByYear(k);
      return { k: k, first: m[0], last: m[m.length - 1] };
    });
    X.chart("chartCompare").setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" },
        formatter: function (ps) {
          var i = ps[0].dataIndex, row = rows[i];
          return row.k ? label(row.k) + "<br/>" + ps[0].marker + "2015: " + X.fmt(row.first, 2) +
                 "<br/>" + ps[1].marker + "2024: " + X.fmt(row.last, 2) +
                 "<br/>×" + X.fmt(row.last / row.first, 2) : "";
        } },
      legend: { right: 4, top: 0 },
      grid: { left: 8, right: 18, top: 44, bottom: 4, containLabel: true },
      xAxis: { type: "category", data: rows.map(function (r) { return label(r.k); }),
               axisLabel: { rotate: 26, fontSize: 10, color: X.INK3 } },
      yAxis: { type: "value", name: "2015 = 100", nameTextStyle: { color: X.INK3, fontSize: 11 } },
      series: [
        { name: "2015", type: "bar", barWidth: 12,
          data: rows.map(function (r) { return 100; }),
          itemStyle: { color: X.PALETTE[2], borderRadius: [5, 5, 0, 0] } },
        { name: "2024", type: "bar", barWidth: 12,
          data: rows.map(function (r) { return +(r.last / r.first * 100).toFixed(1); }),
          itemStyle: { color: X.PALETTE[0], borderRadius: [5, 5, 0, 0] },
          label: { show: true, position: "top", fontSize: 10, color: X.INK2,
                   formatter: function (p) { return "×" + X.fmt(p.value / 100, 1); } } }
      ]
    }, true);
  }

  /* -------------------------------------------------- brief: all indic. */
  function renderBrief() {
    var host = document.getElementById("briefGrid");
    if (!host) return;
    host.innerHTML = D.indicators.map(function (ind, i) {
      return '<div class="brief-item">' +
        '<div class="brief-name">' + label(ind.key) + "</div>" +
        '<div class="brief-value" id="briefVal' + i + '"></div>' +
        '<div class="brief-foot">' +
          '<span class="brief-delta" id="briefDelta' + i + '"></span>' +
          '<div class="brief-spark" id="briefSpark' + i + '"></div>' +
        "</div>" +
      "</div>";
    }).join("");

    D.indicators.forEach(function (ind, i) {
      var vals = meanByYear(ind.key);
      var first = vals[0], last = vals[vals.length - 1];
      var chg = (last - first) / first * 100;
      var good = ind.dir === "down" ? chg < 0 : chg > 0;
      document.getElementById("briefVal" + i).innerHTML =
        X.fmt(last, last >= 1000 ? 0 : 2) + '<span class="unit">' + T.unit(ind) + "</span>";
      var delta = document.getElementById("briefDelta" + i);
      delta.className = "brief-delta " + (good ? "up" : "down");
      delta.textContent = (chg >= 0 ? "+" : "") + X.fmt(chg, 1) + "%";
      var color = X.PALETTE[i % X.PALETTE.length];
      X.chart("briefSpark" + i).setOption({
        animation: false,
        grid: { left: 1, right: 1, top: 4, bottom: 2 },
        xAxis: { type: "category", show: false, boundaryGap: false, data: YEARS },
        yAxis: { type: "value", show: false, scale: true },
        tooltip: { show: false },
        series: [{
          type: "line", data: vals.map(function (v) { return +v.toFixed(3); }),
          smooth: true, symbol: "none",
          lineStyle: { width: 2, color: color },
          areaStyle: { color: X.linearGrad(color, 0.42, 0.02) }
        }]
      }, true);
    });
  }

  /* ------------------------------------------------------- score (gauge) */
  function renderScore() {
    var nqpf = compositeIndex(NQPF_KEYS, []);
    var latest = nqpf[nqpf.length - 1];
    var lowest = nqpf[0], highest = nqpf[0];
    for (var i = 1; i < nqpf.length; i++) {
      if (nqpf[i] < lowest) lowest = nqpf[i];
      if (nqpf[i] > highest) highest = nqpf[i];
    }
    X.chart("chartScore").setOption({
      series: [{
        type: "gauge",
        startAngle: 205, endAngle: -25,
        /* both ends derive from the data, so the arc is always well framed */
        min: Math.max(0, Math.floor(lowest / 10) * 10 - 10),
        max: Math.ceil(highest / 10) * 10 + 10,
        center: ["50%", "58%"], radius: "86%",
        progress: { show: true, width: 16, roundCap: true, itemStyle: { color: X.PALETTE[0] } },
        axisLine: { lineStyle: { width: 16, color: [[1, "rgba(110,103,95,.16)"]] } },
        axisTick: { distance: -20, length: 4, lineStyle: { color: "rgba(110,103,95,.35)" } },
        splitLine: { distance: -24, length: 9, lineStyle: { color: "rgba(110,103,95,.35)" } },
        axisLabel: { distance: -14, color: X.INK3, fontSize: 10 },
        pointer: { width: 4, length: "62%", itemStyle: { color: X.PALETTE[3] } },
        anchor: { show: true, size: 12, itemStyle: { color: X.PALETTE[3] } },
        title: { offsetCenter: [0, "36%"], color: X.INK3, fontSize: 12 },
        detail: {
          valueAnimation: true, offsetCenter: [0, "66%"], fontSize: 30, fontWeight: 700,
          color: X.INK, formatter: function (v) { return X.fmt(v, 1); }
        },
        data: [{
          value: +latest.toFixed(1),
          name: T.lang() === "en" ? "NQPF index 2024" : "新质生产力指数 2024"
        }]
      }]
    }, true);
  }

  /* ------------------------------------------------- energy intensity = */
  function renderEnergy() {
    var picks = ["北京", "广东", "贵州"];
    var series = picks.map(function (r) {
      var color = X.PALETTE[REGIONS.indexOf(r) % 10];
      return {
        name: rn(r), type: "line", smooth: true, symbolSize: 5,
        data: D.series.energy_intensity[r].map(function (v) { return +v.toFixed(3); }),
        lineStyle: { width: 2.6, color: color },
        itemStyle: { color: color }
      };
    });
    series.push({
      name: T.lang() === "en" ? "National average" : "全国均值",
      type: "line", smooth: true, symbolSize: 6, z: 5,
      data: meanByYear("energy_intensity").map(function (v) { return +v.toFixed(3); }),
      lineStyle: { width: 3, color: X.PALETTE[0], type: "dashed" },
      itemStyle: { color: X.PALETTE[0] },
      areaStyle: { color: X.linearGrad(X.PALETTE[0], 0.20, 0.01) }
    });
    X.chart("chartEnergy").setOption({
      tooltip: { trigger: "axis" },
      legend: { type: "scroll", right: 4, top: 0, itemWidth: 9, itemHeight: 9 },
      grid: { left: 8, right: 18, top: 44, bottom: 4, containLabel: true },
      xAxis: { type: "category", boundaryGap: false, data: YEARS },
      yAxis: { type: "value", scale: true, name: label("energy_intensity"),
               nameTextStyle: { color: X.INK3, fontSize: 10.5 } },
      series: series
    }, true);
  }

  /* ------------------------------------------- jobs x high-tech firms = */
  function renderJobs() {
    var hightech = meanByYear("hightech").map(function (v) { return Math.round(v); });
    var jobs = meanByYear("new_jobs").map(function (v) { return +v.toFixed(1); });
    X.chart("chartJobs").setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { right: 4, top: 0, itemWidth: 9, itemHeight: 9 },
      grid: { left: 8, right: 14, top: 44, bottom: 4, containLabel: true },
      xAxis: { type: "category", data: YEARS },
      yAxis: [
        { type: "value", name: label("hightech"), nameTextStyle: { color: X.INK3, fontSize: 10.5 },
          axisLabel: { formatter: function (v) { return v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(Math.round(v)); } } },
        { type: "value", name: label("new_jobs"), scale: true, nameTextStyle: { color: X.INK3, fontSize: 10.5 },
          splitLine: { show: false } }
      ],
      series: [
        { name: label("hightech"), type: "bar", barWidth: 14, data: hightech,
          itemStyle: { color: X.withAlpha(X.PALETTE[0], .78), borderRadius: [6, 6, 0, 0] } },
        { name: label("new_jobs"), type: "line", yAxisIndex: 1, smooth: true, symbolSize: 6, data: jobs,
          lineStyle: { width: 2.8, color: X.PALETTE[1] }, itemStyle: { color: X.PALETTE[1] } }
      ]
    }, true);
  }

  /* ------------------------------------------------------------- render */
  function render() {
    if (!document.getElementById("view-overview")) return;
    renderKpis();
    renderBrief();
    renderTrend();
    renderScore();
    renderSpillover();
    renderRadarChips();
    renderRadar();
    renderScatter();
    renderHeat();
    renderRank();
    renderRace();
    renderCorr();
    renderRose();
    renderFlow();
    renderEnergy();
    renderJobs();
    renderCompare();
  }

  global.OVERVIEW = { render: render };

  window.addEventListener("resize", X.debounce(function () {
    if (document.getElementById("view-overview").classList.contains("active")) X.resizeAll();
  }, 160));
})(window);
