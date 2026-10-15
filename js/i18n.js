/* ==========================================================================
   i18n — Chinese / English dictionary.
   The assignment requires the site to be bilingual with identical content
   in both languages, so every visible string lives here.
   ========================================================================== */
(function (global) {
  "use strict";

  var DICT = {
    zh: {
      "brand.title": "新质生产力 × 社会发展",
      "brand.sub": "数据可视化研究平台",
      "nav.overview": "可视化总览",
      "nav.workbench": "数据分析工作台",
      "lang.zh": "中文",
      "lang.en": "EN",

      /* hero */
      "hero.kicker": "数据可视化 · 2024",
      "hero.title": "新质生产力如何重塑社会发展",
      "hero.sub": "10 个地区 · 11 项指标 · 2015–2024 年，用数据图形展示科技创新、数字经济与绿色发展对社会发展的带动作用。",
      "hero.t1": "科技创新",
      "hero.t2": "数字经济",
      "hero.t3": "绿色转型",
      "hero.t4": "人才红利",
      "hero.t5": "民生改善",
      "hero.cta": "进入工作台分析数据 →",

      /* KPI */
      "kpi.labor": "全员劳动生产率",
      "kpi.digital": "数字经济核心产业占比",
      "kpi.income": "居民人均可支配收入",
      "kpi.energy": "单位GDP能耗",
      "kpi.patents": "每万人发明专利授权量",
      "kpi.clean": "清洁能源装机占比",
      "kpi.vs2015": "较 2015 年",
      "kpi.latest": "2024 年全国均值",

      /* section titles */
      "sec.trend.title": "新质生产力指数 × 社会发展指数",
      "sec.trend.hint": "以 2015 = 100 标准化，全国均值",
      "sec.brief.title": "全部指标速览",
      "sec.brief.hint": "11 项指标 · 2015–2024 全国均值",
      "sec.score.title": "新质生产力指数仪表",
      "sec.score.hint": "2015 = 100 · 2024 读数",
      "sec.energy.title": "单位GDP能耗十年下降",
      "sec.energy.hint": "吨标准煤/万元 · 越低越好",
      "sec.jobs.title": "就业 × 高新技术企业",
      "sec.jobs.hint": "全国总量 · 双轴",
      "sec.spillover.title": "新质生产力要素 → 社会发展成效",
      "sec.spillover.hint": "全国 2024 年贡献流量（示意）",
      "sec.scatter.title": "研发投入强度 × 劳动生产率",
      "sec.scatter.hint": "气泡大小 = 数字经济占比 · 每点为一个地区·年份",
      "sec.radar.title": "地区多维能力雷达",
      "sec.radar.hint": "2024 年 · 选择地区对比",
      "sec.heat.title": "地区 × 指标 热力图",
      "sec.heat.hint": "2024 年标准化得分（0–100）",
      "sec.rank.title": "高新技术企业数排名",
      "sec.rank.hint": "单位：家",
      "sec.race.title": "数字经济占比 十年变迁",
      "sec.race.hint": "按年份播放 · %",
      "sec.corr.title": "指标相关性矩阵",
      "sec.corr.hint": "Pearson 相关系数 · 全国 2015–2024",
      "sec.rose.title": "绿色能源结构演进",
      "sec.rose.hint": "清洁能源装机占比 · 2024",
      "sec.flow.title": "收入增长 × 数字化水平",
      "sec.flow.hint": "双轴对比 · 全国均值",
      "sec.compare.title": "2015 vs 2024 关键指标对比",
      "sec.compare.hint": "归一化后对比（2015 = 100）",

      /* workbench */
      "wb.title": "数据分析工作台",
      "wb.sub": "上传、筛选、分组、聚合、透视、建模——每一张图都是数据算出来的。",
      "wb.step1": "数据源",
      "wb.step2": "数据操作",
      "wb.step3": "分组与聚合",
      "wb.step4": "可视化",
      "wb.step5": "操作记录",

      "wb.dataset": "默认数据集",
      "wb.dataset.long": "长表 · 新质生产力（1100 行）",
      "wb.dataset.wide": "宽表 · 地区 × 指标",
      "wb.dataset.custom": "自定义数据",
      "wb.load": "重新加载默认数据",
      "wb.upload": "上传 CSV / TSV",
      "wb.upload.hint": "拖拽文件到此处，或点击选择",
      "wb.paste": "粘贴数据",
      "wb.paste.ph": "year,region,value\n2020,北京,12.5",
      "wb.paste.apply": "解析粘贴数据",
      "wb.sample": "抽样行数 (head)",
      "wb.chartind": "图表指标",
      "wb.reset": "重置全部操作",
      "wb.export": "导出当前结果 CSV",

      "wb.filter": "筛选 (query)",
      "wb.filter.ph": "如 value > 50 and year >= 2020",
      "wb.filter.apply": "应用筛选",
      "wb.filter.clear": "清除筛选",
      "wb.sort": "排序 (sort_values)",
      "wb.sort.by": "排序列",
      "wb.sort.asc": "升序 ↑",
      "wb.sort.desc": "降序 ↓",
      "wb.cols": "选择列",
      "wb.dropna": "删除缺失值 dropna()",
      "wb.fillna": "填充缺失值 fillna(mean)",
      "wb.dropdup": "去重 drop_duplicates()",
      "wb.newname": "新列名",
      "wb.newexpr": "表达式",
      "wb.newexpr.ph": "如 value * 1.1 或 income / 10000",
      "wb.newcol": "计算新列 assign()",
      "wb.groupby": "分组字段 groupby",
      "wb.agg": "聚合方式 agg",
      "wb.agg.by": "聚合列",
      "wb.applygroup": "执行分组聚合",
      "wb.pivot": "透视表 pivot_table",
      "wb.pivot.index": "行索引",
      "wb.pivot.columns": "列索引",
      "wb.pivot.values": "数值列",
      "wb.pivot.apply": "生成透视表",
      "wb.charttype": "图表类型",
      "wb.summary": "统计描述 describe()",
      "wb.valuecounts": "频次统计 value_counts",
      "wb.corr": "相关性 corr()",
      "wb.hist": "分布直方图 hist()",
      "wb.line": "趋势折线图",
      "wb.bar": "分组柱状图",
      "wb.area": "堆积面积图",
      "wb.pie": "占比环形图",
      "wb.scatter": "散点图",
      "wb.box": "箱线图",
      "wb.chart.title": "可视化结果",
      "wb.dataview": "数据视图",
      "wb.result": "统计描述",
      "wb.rows": "行",
      "wb.cols.n": "列",
      "wb.memory": "内存",
      "wb.dtypes": "列类型",
      "wb.numeric": "数值列",

      "wb.health.title": "数据健康",
      "wb.health.complete": "完整度",
      "wb.health.missing": "缺失单元格",
      "wb.health.dupes": "重复行",
      "wb.health.unique": "唯一值合计",

      "wb.aggr.sum": "求和 sum",
      "wb.aggr.mean": "均值 mean",
      "wb.aggr.max": "最大值 max",
      "wb.aggr.min": "最小值 min",
      "wb.aggr.count": "计数 count",
      "wb.aggr.std": "标准差 std",
      "wb.aggr.median": "中位数 median",
      "wb.aggr.nunique": "唯一值 nunique",

      "wb.log.empty": "还没有操作。左侧任一操作都会记录在这里，并同步刷新图表。",
      "wb.log.op": "操作",
      "wb.log.rows": "行",
      "wb.noNumCol": "数据中没有数值列",

      "wb.err.empty": "数据为空，未解析到任何内容",
      "wb.err.norows": "未解析到数据行，请检查格式",
      "wb.err.query": "请先输入筛选表达式，例如 value > 50",
      "wb.err.nameexpr": "请同时填写新列名与表达式",
      "wb.err.groupby": "请至少选择一个分组字段",
      "wb.err.pivot": "请选择行索引、列索引与数值列",
      "wb.err.column": "请先选择排序列",
      "wb.err.plugin": "数据解析库未加载",
      "wb.err.lastcol": "至少要保留一列，不能全部取消",

      "wb.log.load": "加载默认数据",
      "wb.log.custom": "加载自定义数据",
      "wb.log.filter": "筛选",
      "wb.log.sort": "排序 {0} {1}",
      "wb.log.group": "分组聚合 {0} → {1}({2})",
      "wb.log.pivot": "透视表 {0} × {1}",
      "wb.log.assign": "新增列 {0}",
      "wb.log.dropna": "删除缺失值",
      "wb.log.fillna": "填充缺失值（均值）",
      "wb.log.dropdup": "删除重复行",
      "wb.log.describe": "统计描述",
      "wb.log.corr": "相关性矩阵",
      "wb.log.hist": "分布直方图：{0}",
      "wb.log.valuecounts": "频次统计 {0}",
      "wb.log.plot": "绘制为 {0}",
      "wb.log.export": "导出 CSV",
      "wb.log.restore": "恢复已加载数据",
      "wb.log.cols": "选择列：{0}",

      "wb.toast.loaded": "数据已加载",
      "wb.toast.filtered": "筛选完成",
      "wb.toast.sorted": "排序完成",
      "wb.toast.grouped": "分组聚合完成",
      "wb.toast.pivot": "透视表已生成",
      "wb.toast.newcol": "新列已创建",
      "wb.toast.reset": "已重置",
      "wb.toast.exported": "CSV 已导出",
      "wb.toast.error": "操作失败：",
      "wb.toast.pasted": "粘贴数据已解析",
      "wb.toast.cols": "列选择已更新",
      "wb.toast.na": "缺失值处理完成",
      "wb.toast.dup": "去重完成",

      "foot.demo": "演示数据说明：本页数据为教学演示用合成数据，非官方统计口径，仅用于展示分析流程与可视化方法。",
      "foot.stack": "ECharts 5.5 · PapaParse 5.4 · 纯静态离线运行",
      "foot.rights": "新质生产力与社发展 · 数据可视化课程作业"
    },

    en: {
      "brand.title": "New Quality Productive Forces × Social Development",
      "brand.sub": "Data visualisation research platform",
      "nav.overview": "Overview",
      "nav.workbench": "Analysis Workbench",
      "lang.zh": "中文",
      "lang.en": "EN",

      "hero.kicker": "DATA VISUALISATION · 2024",
      "hero.title": "How New Quality Productive Forces Reshape Social Development",
      "hero.sub": "10 regions · 11 indicators · 2015–2024. Data-driven graphics show how technology innovation, the digital economy and green transition lift social development.",
      "hero.t1": "Innovation",
      "hero.t2": "Digital economy",
      "hero.t3": "Green transition",
      "hero.t4": "Talent dividend",
      "hero.t5": "Living standards",
      "hero.cta": "Open the workbench →",

      "kpi.labor": "Labor Productivity",
      "kpi.digital": "Digital Economy Share of GDP",
      "kpi.income": "Per-capita Disposable Income",
      "kpi.energy": "Energy Intensity per GDP",
      "kpi.patents": "Invention Patents per 10k People",
      "kpi.clean": "Clean Energy Capacity Share",
      "kpi.vs2015": "vs. 2015",
      "kpi.latest": "National average, 2024",

      "sec.trend.title": "NQPF Index × Social Development Index",
      "sec.trend.hint": "Standardised, 2015 = 100 · national average",
      "sec.brief.title": "All Indicators at a Glance",
      "sec.brief.hint": "11 indicators · national average 2015–2024",
      "sec.score.title": "NQPF Index Gauge",
      "sec.score.hint": "2015 = 100 · 2024 reading",
      "sec.energy.title": "Energy Intensity Falling",
      "sec.energy.hint": "tce per 10k CNY · lower is better",
      "sec.jobs.title": "Jobs × High-tech Enterprises",
      "sec.jobs.hint": "National totals · dual axis",
      "sec.spillover.title": "NQPF Drivers → Social Development Outcomes",
      "sec.spillover.hint": "Contribution flows, 2024 (illustrative)",
      "sec.scatter.title": "R&D Intensity × Labor Productivity",
      "sec.scatter.hint": "Bubble size = digital economy share · one point per region-year",
      "sec.radar.title": "Regional Capability Radar",
      "sec.radar.hint": "2024 · compare selected regions",
      "sec.heat.title": "Region × Indicator Heatmap",
      "sec.heat.hint": "Standardised score 2024 (0–100)",
      "sec.rank.title": "High-tech Enterprises Ranking",
      "sec.rank.hint": "Unit: firms",
      "sec.race.title": "Digital Economy Share over a Decade",
      "sec.race.hint": "Animated by year · %",
      "sec.corr.title": "Indicator Correlation Matrix",
      "sec.corr.hint": "Pearson r · all regions 2015–2024",
      "sec.rose.title": "Green Energy Structure",
      "sec.rose.hint": "Clean energy capacity share · 2024",
      "sec.flow.title": "Income Growth × Digitalisation",
      "sec.flow.hint": "Dual axis · national average",
      "sec.compare.title": "2015 vs 2024 — Key Indicators",
      "sec.compare.hint": "Normalised comparison (2015 = 100)",

      "wb.title": "Data Analysis Workbench",
      "wb.sub": "Load, filter, group, aggregate, pivot and model — every chart is computed from your data.",
      "wb.step1": "Data source",
      "wb.step2": "Transform",
      "wb.step3": "Group & aggregate",
      "wb.step4": "Visualise",
      "wb.step5": "Operation log",

      "wb.dataset": "Default dataset",
      "wb.dataset.long": "Long / tidy · NQPF (1,100 rows)",
      "wb.dataset.wide": "Wide · region × indicator",
      "wb.dataset.custom": "Custom data",
      "wb.load": "Reload default data",
      "wb.upload": "Upload CSV / TSV",
      "wb.upload.hint": "Drop a file here, or click to browse",
      "wb.paste": "Paste data",
      "wb.paste.ph": "year,region,value\n2020,Beijing,12.5",
      "wb.paste.apply": "Parse pasted text",
      "wb.sample": "Rows to preview (head)",
      "wb.chartind": "Chart indicator",
      "wb.reset": "Reset all operations",
      "wb.export": "Export current result as CSV",

      "wb.filter": "Filter (query)",
      "wb.filter.ph": "e.g. value > 50 and year >= 2020",
      "wb.filter.apply": "Apply filter",
      "wb.filter.clear": "Clear filter",
      "wb.sort": "Sort (sort_values)",
      "wb.sort.by": "Sort by",
      "wb.sort.asc": "Ascending ↑",
      "wb.sort.desc": "Descending ↓",
      "wb.cols": "Select columns",
      "wb.dropna": "Drop missing dropna()",
      "wb.fillna": "Fill missing fillna(mean)",
      "wb.dropdup": "Drop duplicates drop_duplicates()",
      "wb.newname": "New column",
      "wb.newexpr": "Expression",
      "wb.newexpr.ph": "e.g. value * 1.1 or income / 10000",
      "wb.newcol": "Compute column assign()",
      "wb.groupby": "Group by",
      "wb.agg": "Aggregation agg",
      "wb.agg.by": "Aggregate column",
      "wb.applygroup": "Run group-by aggregation",
      "wb.pivot": "Pivot table",
      "wb.pivot.index": "Index",
      "wb.pivot.columns": "Columns",
      "wb.pivot.values": "Values",
      "wb.pivot.apply": "Build pivot table",
      "wb.charttype": "Chart type",
      "wb.summary": "Summary describe()",
      "wb.valuecounts": "Frequency value_counts",
      "wb.corr": "Correlation corr()",
      "wb.hist": "Distribution hist()",
      "wb.line": "Trend line",
      "wb.bar": "Grouped bar",
      "wb.area": "Stacked area",
      "wb.pie": "Donut share",
      "wb.scatter": "Scatter",
      "wb.box": "Box plot",
      "wb.chart.title": "Visualisation",
      "wb.dataview": "Data view",
      "wb.result": "Summary statistics",
      "wb.rows": "rows",
      "wb.cols.n": "cols",
      "wb.memory": "memory",
      "wb.dtypes": "Column dtypes",
      "wb.numeric": "Numeric columns",

      "wb.health.title": "Data health",
      "wb.health.complete": "Completeness",
      "wb.health.missing": "Missing cells",
      "wb.health.dupes": "Duplicate rows",
      "wb.health.unique": "Unique values (sum)",

      "wb.aggr.sum": "Sum",
      "wb.aggr.mean": "Mean",
      "wb.aggr.max": "Max",
      "wb.aggr.min": "Min",
      "wb.aggr.count": "Count",
      "wb.aggr.std": "Std",
      "wb.aggr.median": "Median",
      "wb.aggr.nunique": "N unique",

      "wb.log.empty": "No operations yet. Every action on the left is logged here and refreshes the charts.",
      "wb.log.op": "Operation",
      "wb.log.rows": "rows",
      "wb.noNumCol": "No numeric column in the data",

      "wb.err.empty": "The data is empty — nothing was parsed",
      "wb.err.norows": "No data rows parsed, please check the file format",
      "wb.err.query": "Enter a filter expression first, e.g. value > 50",
      "wb.err.nameexpr": "Provide both a column name and an expression",
      "wb.err.groupby": "Select at least one group-by field",
      "wb.err.pivot": "Select index, columns and values",
      "wb.err.column": "Select a column to sort by first",
      "wb.err.plugin": "The CSV parser library is not loaded",
      "wb.err.lastcol": "Keep at least one column selected",

      "wb.log.load": "Load default data",
      "wb.log.custom": "Load custom data",
      "wb.log.filter": "Filter",
      "wb.log.sort": "Sort by {0} {1}",
      "wb.log.group": "Group by {0} → {1}({2})",
      "wb.log.pivot": "Pivot table {0} × {1}",
      "wb.log.assign": "Assign column {0}",
      "wb.log.dropna": "Drop missing rows",
      "wb.log.fillna": "Fill missing (mean)",
      "wb.log.dropdup": "Drop duplicates",
      "wb.log.describe": "Summary statistics",
      "wb.log.corr": "Correlation matrix",
      "wb.log.hist": "Histogram of {0}",
      "wb.log.valuecounts": "Value counts of {0}",
      "wb.log.plot": "Plot as {0}",
      "wb.log.export": "Export CSV",
      "wb.log.restore": "Restore loaded data",
      "wb.log.cols": "Select columns: {0}",

      "wb.toast.loaded": "Data loaded",
      "wb.toast.filtered": "Filter applied",
      "wb.toast.sorted": "Sorted",
      "wb.toast.grouped": "Group-by aggregation done",
      "wb.toast.pivot": "Pivot table built",
      "wb.toast.newcol": "Column created",
      "wb.toast.reset": "Reset",
      "wb.toast.exported": "CSV exported",
      "wb.toast.error": "Failed: ",
      "wb.toast.pasted": "Pasted data parsed",
      "wb.toast.cols": "Column selection updated",
      "wb.toast.na": "Missing values handled",
      "wb.toast.dup": "Duplicates removed",

      "foot.demo": "Demo data notice: figures on this site are synthetic data for teaching purposes, not official statistics — used to demonstrate the analysis workflow and visualisation methods.",
      "foot.stack": "ECharts 5.5 · PapaParse 5.4 · fully static, offline",
      "foot.rights": "New Quality Productive Forces & Social Development — data visualisation coursework"
    }
  };

  /* Region names in ASCII, so the English UI stays readable. */
  var REGION_EN = {
    "北京": "Beijing", "上海": "Shanghai", "广东": "Guangdong", "江苏": "Jiangsu",
    "浙江": "Zhejiang", "山东": "Shandong", "四川": "Sichuan", "湖北": "Hubei",
    "陕西": "Shaanxi", "贵州": "Guizhou"
  };

  var current = "zh";

  var I18N = {
    t: function (key) {
      var d = DICT[current] || DICT.zh;
      return Object.prototype.hasOwnProperty.call(d, key) ? d[key] : key;
    },
    /* "{0} {1}"-style interpolation for parameterised log / error messages */
    fmt: function (key, args) {
      var s = I18N.t(key);
      (args || []).forEach(function (a, i) {
        s = s.split("{" + i + "}").join(String(a));
      });
      return s;
    },
    lang: function () { return current; },
    region: function (zhName) {
      if (current === "en") return REGION_EN[zhName] || zhName;
      return zhName;
    },
    indicatorLabel: function (ind) {
      return current === "en" ? ind.en : ind.zh;
    },
    unit: function (ind) {
      return current === "en" ? ind.unitEn : ind.unitZh;
    },
    set: function (lang) {
      current = lang === "en" ? "en" : "zh";
      try { localStorage.setItem("nqpf-lang", current); } catch (e) {}
      document.documentElement.setAttribute("lang", current === "en" ? "en" : "zh-CN");
      I18N.apply();
    },
    /* translate every [data-i18n] node, then let listeners re-render charts */
    apply: function () {
      var nodes = document.querySelectorAll("[data-i18n]");
      for (var i = 0; i < nodes.length; i++) {
        var key = nodes[i].getAttribute("data-i18n");
        var attr = nodes[i].getAttribute("data-i18n-attr");
        if (attr) nodes[i].setAttribute(attr, I18N.t(key));
        else nodes[i].textContent = I18N.t(key);
      }
      var phs = document.querySelectorAll("[data-i18n-ph]");
      for (var j = 0; j < phs.length; j++) {
        phs[j].setAttribute("placeholder", I18N.t(phs[j].getAttribute("data-i18n-ph")));
      }
    },
    restore: function () {
      var saved = null;
      try { saved = localStorage.getItem("nqpf-lang"); } catch (e) {}
      if (!saved) {
        saved = (navigator.language || "zh").toLowerCase().indexOf("zh") === 0 ? "zh" : "en";
      }
      I18N.set(saved);
    }
  };

  global.I18N = I18N;
})(window);
