/* Executes overview.js head-less and reports what the charts received. */
(function () {
  var out = { errors: [], missing: [] };

  function seriesLen(id, si) {
    var o = __lastOptions[id];
    if (!o || !o.series) return -1;
    var s = o.series[si || 0];
    if (!s) return -1;
    if (s.data) return s.data.length;
    if (s.links) return s.links.length;
    return -1;
  }

  try {
    window.I18N.restore();
    out.lang = window.I18N.lang();
    window.OVERVIEW.render();
  } catch (e) {
    out.errors.push(String((e && e.stack) || e));
  }

  var ids = ["chartTrend", "chartSpillover", "chartRadar", "chartScatter", "chartHeat",
             "chartRank", "chartRace", "chartCorr", "chartRose", "chartFlow", "chartCompare",
             "chartScore", "chartEnergy", "chartJobs",
             "kpiSpark0", "kpiSpark1", "kpiSpark2", "kpiSpark3"];
  ids.forEach(function (id) {
    if (!__lastOptions[id]) out.missing.push(id);
  });

  /* the "all indicators" grid renders one mini chart per indicator */
  var briefCount = 0;
  for (var b = 0; b < 11; b++) if (__lastOptions["briefSpark" + b]) briefCount++;
  out.briefCards = briefCount;

  out.setOptionCount = __setOptionCount;
  out.lens = {
    trend0: seriesLen("chartTrend", 0),
    trend1: seriesLen("chartTrend", 1),
    spilloverLinks: seriesLen("chartSpillover", 0),
    radarRegions: seriesLen("chartRadar", 0),
    scatterSeries: (__lastOptions.chartScatter && __lastOptions.chartScatter.series
      ? __lastOptions.chartScatter.series.length : -1),
    heatCells: seriesLen("chartHeat", 0),
    rankBars: seriesLen("chartRank", 0),
    raceOptions: (__lastOptions.chartRace && __lastOptions.chartRace.options
      ? __lastOptions.chartRace.options.length : -1),
    corrCells: seriesLen("chartCorr", 0),
    roseSlices: seriesLen("chartRose", 0),
    flow0: seriesLen("chartFlow", 0),
    compareSeries: (__lastOptions.chartCompare && __lastOptions.chartCompare.series
      ? __lastOptions.chartCompare.series.length : -1)
  };

  out.scoreValue = (__lastOptions.chartScore && __lastOptions.chartScore.series)
    ? __lastOptions.chartScore.series[0].data[0].value : null;
  out.energySeriesCount = __lastOptions.chartEnergy
    ? __lastOptions.chartEnergy.series.length : -1;
  out.jobsSeriesCount = __lastOptions.chartJobs
    ? __lastOptions.chartJobs.series.length : -1;
  out.briefSparkPoints = __lastOptions.briefSpark0
    ? __lastOptions.briefSpark0.series[0].data.length : -1;

  /* a couple of concrete data spot-checks */
  var trend = __lastOptions.chartTrend;
  out.trendFirst = trend && trend.series && trend.series[0] ? trend.series[0].data[0] : null;
  out.trendLast = trend && trend.series && trend.series[0]
    ? trend.series[0].data[trend.series[0].data.length - 1] : null;
  var kpiHtml = document.getElementById("kpiVal0").innerHTML;
  out.kpiValueHtml = kpiHtml;

  /* switch language and render again: nothing should break */
  try {
    window.I18N.set("en");
    window.OVERVIEW.render();
    out.enLang = window.I18N.lang();
    out.enTrendName = __lastOptions.chartTrend.series[0].name;
    out.enKpiHtml = document.getElementById("kpiVal0").innerHTML;
  } catch (e2) {
    out.errors.push("en: " + String((e2 && e2.stack) || e2));
  }

  return JSON.stringify(out);
})();
