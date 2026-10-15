/* Minimal DOM + ECharts stand-in so that the *shipped* overview.js and
   workbench.js can be executed head-less inside quickjs.
   It records every setOption() call, so a test can assert that charts were
   really produced from data, and it keeps event handlers so that user
   interactions can be replayed. */

var __setOptionCount = 0;
var __lastOptions = {};

function ClassList() { this._set = {}; }
ClassList.prototype.add = function (c) { this._set[c] = true; };
ClassList.prototype.remove = function (c) { delete this._set[c]; };
ClassList.prototype.contains = function (c) { return !!this._set[c]; };
ClassList.prototype.toggle = function (c, on) {
  if (on === undefined) on = !this._set[c];
  if (on) this._set[c] = true; else delete this._set[c];
  return !!this._set[c];
};

function El(tag, id) {
  this.tagName = String(tag || "div").toUpperCase();
  this.id = id || "";
  this.children = [];
  this.style = {};
  this.classList = new ClassList();
  this.attributes = {};
  this._handlers = {};
  this._html = "";
  this._text = "";
  this.value = "";
  this.options = [];
  this.files = null;
  this.isConnected = true;
  this.scrollTop = 0;
  this.scrollHeight = 0;
}

El.prototype.addEventListener = function (type, fn) {
  (this._handlers[type] || (this._handlers[type] = [])).push(fn);
};
El.prototype.fire = function (type, ev) {
  var hs = this._handlers[type] || [];
  var payload = ev || { target: this, preventDefault: function () {} };
  for (var i = 0; i < hs.length; i++) hs[i].call(this, payload);
};
El.prototype.click = function () { this.fire("click"); };
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i >= 0) this.children.splice(i, 1);
};
El.prototype.setAttribute = function (k, v) { this.attributes[k] = v; };
El.prototype.getAttribute = function (k) {
  return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null;
};
El.prototype.querySelectorAll = function () { return []; };
El.prototype.closest = function () { return null; };

Object.defineProperty(El.prototype, "innerHTML", {
  get: function () { return this._html; },
  set: function (html) {
    this._html = String(html);
    /* naive <option> harvest so <select> elements behave */
    this.options = [];
    var re = /<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g;
    var m;
    while ((m = re.exec(this._html))) {
      this.options.push({ value: m[1], text: m[2], selected: false });
    }
    if (this.options.length && this.value === "") this.value = this.options[0].value;
  }
});

Object.defineProperty(El.prototype, "textContent", {
  get: function () { return this._text; },
  set: function (t) { this._text = String(t); }
});

var __registry = {};
var document = {
  readyState: "complete",
  documentElement: new El("html"),
  body: new El("body"),
  createElement: function (t) { return new El(t); },
  getElementById: function (id) {
    if (!__registry[id]) __registry[id] = new El("div", id);
    return __registry[id];
  },
  querySelectorAll: function () { return []; },
  addEventListener: function () {}
};

var navigator = { language: "zh-CN" };
var localStorage = {
  _v: {},
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(this._v, k) ? this._v[k] : null; },
  setItem: function (k, v) { this._v[k] = String(v); }
};

var setTimeout = function () { return 0; };
var clearTimeout = function () {};
var console = { log: function () {}, warn: function () {}, error: function () {} };

var echarts = {
  init: function (el) {
    return {
      _dom: el,
      setOption: function (option) {
        __setOptionCount++;
        __lastOptions[el.id] = option;
      },
      resize: function () {},
      dispose: function () {},
      clear: function () {},
      isDisposed: function () { return false; },
      getDom: function () { return el; }
    };
  },
  registerTheme: function () {}
};

/* minimal CSV parser stand-in (enough for the paste/upload code path) */
var Papa = {
  parse: function (input, cfg) {
    var text = typeof input === "string" ? input : "";
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ""; });
    if (!lines.length) return { data: [] };
    var header = lines.shift().split(",");
    var data = lines.map(function (line) {
      var cells = line.split(",");
      var rec = {};
      header.forEach(function (h, i) {
        var v = cells[i] === undefined ? "" : cells[i];
        rec[h] = (cfg && cfg.dynamicTyping && v !== "" && !isNaN(Number(v))) ? Number(v) : v;
      });
      return rec;
    });
    return { data: data };
  }
};

var window = {
  document: document,
  navigator: navigator,
  localStorage: localStorage,
  echarts: echarts,
  Papa: Papa,
  addEventListener: function () {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console,
  __setOptionCount: function () { return __setOptionCount; },
  __lastOptions: function () { return __lastOptions; }
};
