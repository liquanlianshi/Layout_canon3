/* ==========================================================================
   core.js — shared palette, formatters, ECharts theme, toast helper.
   No build step, no modules: everything hangs off window.NQPFX.
   ========================================================================== */
(function (global) {
  "use strict";

  /* --- vivid but low-saturation categorical palette (kept in sync with CSS) */
  var PALETTE = ["#D9A08F", "#7FB0A8", "#D8C8A8", "#A9A3CE", "#D8A8B6",
                 "#A6C48F", "#9BBBD4", "#CBA894", "#C3B58C", "#9FBFB4"];

  var INK = "#33302C", INK2 = "#6E675F", INK3 = "#A79E93", LINE = "#EDE6DB", LINE2 = "#E1D8CA";

  /* ------------------------------------------------------------- numbers */
  function isNum(v) {
    return typeof v === "number" ? isFinite(v)
      : (v !== null && v !== undefined && v !== "" && isFinite(Number(v)));
  }

  function fmt(v, digits) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v !== "number" || !isFinite(v)) return String(v);
    var d = digits === undefined ? autoDigits(v) : digits;
    var s = Math.abs(v) >= 1000
      ? v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
      : v.toFixed(d);
    return s;
  }

  function autoDigits(v) {
    var a = Math.abs(v);
    if (a === 0) return 0;
    if (a >= 1000) return 0;
    if (a >= 100) return 1;
    if (a >= 10) return 2;
    if (a >= 1) return 2;
    return 3;
  }

  function pct(v, digits) {
    if (!isNum(v)) return "—";
    return fmt(Number(v), digits === undefined ? 1 : digits) + "%";
  }

  function bytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(2) + " MB";
  }

  /* ------------------------------------------------------------ ECharts */
  function registerTheme() {
    if (!global.echarts || global.__nqpfTheme) return;
    global.echarts.registerTheme("nqpf", {
      color: PALETTE,
      backgroundColor: "transparent",
      textStyle: { fontFamily: '"Inter","Segoe UI","Microsoft YaHei","PingFang SC",sans-serif', color: INK2 },
      title: {
        textStyle: { color: INK, fontSize: 14, fontWeight: 600 },
        subtextStyle: { color: INK3, fontSize: 11.5 }
      },
      legend: { textStyle: { color: INK2, fontSize: 11.5 }, itemWidth: 10, itemHeight: 10, icon: "roundRect" },
      tooltip: {
        backgroundColor: "rgba(255,255,255,.97)",
        borderColor: LINE2, borderWidth: 1,
        textStyle: { color: INK, fontSize: 12 },
        extraCssText: "box-shadow:0 12px 30px -14px rgba(70,60,48,.4);border-radius:10px;padding:9px 12px;"
      },
      grid: { left: 10, right: 16, top: 42, bottom: 8, containLabel: true },
      categoryAxis: {
        axisLine: { lineStyle: { color: LINE2 } },
        axisTick: { show: false },
        axisLabel: { color: INK3, fontSize: 11 },
        splitLine: { show: false }
      },
      valueAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: INK3, fontSize: 11 },
        splitLine: { lineStyle: { color: LINE, type: "dashed" } }
      },
      line: { symbolSize: 6, smooth: true, lineStyle: { width: 2.4 } },
      bar: { itemStyle: { borderRadius: [5, 5, 0, 0] } },
      pie: { itemStyle: { borderColor: "#fff", borderWidth: 2 } }
    });
    global.__nqpfTheme = true;
  }

  /* --------------------------------------------------------------- toast */
  var toastEl = null, toastTimer = null;
  function toast(msg, ms) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 2200);
  }

  /* ----------------------------------------------------- gradient helper */
  function linearGrad(color, topAlpha, bottomAlpha) {
    return {
      type: "linear", x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: withAlpha(color, topAlpha) },
        { offset: 1, color: withAlpha(color, bottomAlpha) }
      ]
    };
  }

  function withAlpha(hex, a) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  /* --------------------------------------------------------- chart utils */
  var instances = {};
  function chart(domId) {
    var el = document.getElementById(domId);
    if (!el) return null;
    registerTheme();
    var inst = instances[domId];
    /* the container may have been replaced by a re-render: rebuild the instance */
    if (inst && (inst.isDisposed() || !el.isConnected || inst.getDom() !== el)) {
      try { inst.dispose(); } catch (e) {}
      inst = null;
      delete instances[domId];
    }
    if (!inst) instances[domId] = global.echarts.init(el, "nqpf", { renderer: "canvas" });
    return instances[domId];
  }
  function resizeAll() {
    Object.keys(instances).forEach(function (k) {
      try { instances[k].resize(); } catch (e) {}
    });
  }
  function disposeAll() {
    Object.keys(instances).forEach(function (k) {
      try { instances[k].dispose(); } catch (e) {}
      delete instances[k];
    });
  }

  /* ------------------------------------------------------------ misc ui */
  function download(filename, text) {
    var blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 120);
    };
  }

  global.NQPFX = {
    PALETTE: PALETTE, INK: INK, INK2: INK2, INK3: INK3, LINE: LINE, LINE2: LINE2,
    isNum: isNum, fmt: fmt, pct: pct, bytes: bytes,
    registerTheme: registerTheme, chart: chart, resizeAll: resizeAll, disposeAll: disposeAll,
    toast: toast, linearGrad: linearGrad, withAlpha: withAlpha,
    download: download, debounce: debounce
  };
})(window);
