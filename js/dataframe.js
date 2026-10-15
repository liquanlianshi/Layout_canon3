/* ==========================================================================
   dataframe.js — a tiny, dependency-free re-implementation of the most used
   pandas operations, running in the browser:

     DataFrame            : construction, dtype inference, head/tail
     .query(expr)         : boolean filtering  (df[df.x > 1])
     .sortValues(by, asc) : sort_values()
     .select(cols)        : df[[...]]
     .dropna()            : dropna()
     .fillna(mode)        : fillna(mean | 0)
     .dropDuplicates()    : drop_duplicates()
     .assign(name, expr)  : assign()
     .groupAgg(...)       : groupby(...).agg(...)
     .pivotTable(...)     : pivot_table()
     .describe()          : describe()
     .valueCounts(col)    : value_counts()
     .corr()              : corr() -> Pearson matrix
     .toCSV() / .shape    : export & shape

   Expressions are parsed by a small hand-written recursive-descent parser
   (NO eval / new Function), supporting:
       columns, numbers, strings, + - * / %, comparisons, and / or / not,
       functions: abs round min max sqrt log exp len int float,  x in [..]
   ========================================================================== */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------ tokenizer */
  var OPERATORS = ["<=", ">=", "==", "!=", "**", "+", "-", "*", "/", "%", "<", ">", "(", ")", "[", "]", ",", ".", "&", "|", "~", "!"];

  function tokenize(src) {
    var i = 0, out = [], s = String(src);
    function isIdStart(ch) { return /[A-Za-z_\u4e00-\u9fff]/.test(ch); }
    function isIdBody(ch) { return /[A-Za-z0-9_\u4e00-\u9fff]/.test(ch); }
    while (i < s.length) {
      var ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      /* number */
      if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(s[i + 1] || ""))) {
        var j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        if (s[j] === "e" || s[j] === "E") { j++; if (s[j] === "+" || s[j] === "-") j++; while (j < s.length && /[0-9]/.test(s[j])) j++; }
        out.push({ t: "num", v: parseFloat(s.slice(i, j)) });
        i = j; continue;
      }
      /* string */
      if (ch === "'" || ch === '"') {
        var q = ch, k = i + 1, buf = "";
        while (k < s.length && s[k] !== q) {
          if (s[k] === "\\") { buf += s[k + 1]; k += 2; } else { buf += s[k]; k++; }
        }
        if (k >= s.length) throw new Error("Unterminated string");
        out.push({ t: "str", v: buf });
        i = k + 1; continue;
      }
      /* identifier / keyword */
      if (isIdStart(ch)) {
        var m = i;
        while (m < s.length && isIdBody(s[m])) m++;
        var word = s.slice(i, m);
        var lower = word.toLowerCase();
        if (lower === "and") out.push({ t: "op", v: "and" });
        else if (lower === "or") out.push({ t: "op", v: "or" });
        else if (lower === "not") out.push({ t: "op", v: "not" });
        else if (lower === "in") out.push({ t: "op", v: "in" });
        else if (lower === "true") out.push({ t: "bool", v: true });
        else if (lower === "false") out.push({ t: "bool", v: false });
        else if (lower === "null" || lower === "none") out.push({ t: "null", v: null });
        else out.push({ t: "id", v: word });
        i = m; continue;
      }
      /* operator */
      var matched = null;
      for (var o = 0; o < OPERATORS.length; o++) {
        if (s.substr(i, OPERATORS[o].length) === OPERATORS[o]) { matched = OPERATORS[o]; break; }
      }
      if (matched) { out.push({ t: "op", v: matched }); i += matched.length; continue; }
      throw new Error("Unexpected character: " + ch);
    }
    out.push({ t: "eof" });
    return out;
  }

  /* --------------------------------------------------------------- parser */
  function parse(tokens) {
    var pos = 0;
    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }
    function expect(v) {
      var t = next();
      if (t.t !== "op" || t.v !== v) throw new Error("Expected '" + v + "'");
      return t;
    }
    function isOp(v) { var t = peek(); return t.t === "op" && t.v === v; }

    function parseOr() {
      var node = parseAnd();
      while (isOp("or") || isOp("|")) { next(); node = { t: "bin", op: "or", l: node, r: parseAnd() }; }
      return node;
    }
    function parseAnd() {
      var node = parseNot();
      while (isOp("and") || isOp("&")) { next(); node = { t: "bin", op: "and", l: node, r: parseNot() }; }
      return node;
    }
    function parseNot() {
      if (isOp("not") || isOp("~") || isOp("!")) { next(); return { t: "un", op: "not", e: parseNot() }; }
      return parseCompare();
    }
    function parseCompare() {
      var node = parseAdd();
      while (peek().t === "op" && ["==", "!=", "<", "<=", ">", ">=", "in"].indexOf(peek().v) >= 0) {
        var op = next().v;
        var right = (op === "in") ? parseAdd() : parseAdd();
        node = { t: "bin", op: op, l: node, r: right };
      }
      return node;
    }
    function parseAdd() {
      var node = parseMul();
      while (isOp("+") || isOp("-")) { var op = next().v; node = { t: "bin", op: op, l: node, r: parseMul() }; }
      return node;
    }
    function parseMul() {
      var node = parseUnary();
      while (isOp("*") || isOp("/") || isOp("%")) { var op = next().v; node = { t: "bin", op: op, l: node, r: parseUnary() }; }
      return node;
    }
    function parseUnary() {
      if (isOp("-")) { next(); return { t: "un", op: "-", e: parseUnary() }; }
      if (isOp("+")) { next(); return parseUnary(); }
      return parsePrimary();
    }
    function parsePrimary() {
      var t = peek();
      if (t.t === "num" || t.t === "str" || t.t === "bool" || t.t === "null") { next(); return { t: "lit", v: t.v }; }
      if (t.t === "op" && t.v === "(") { next(); var e = parseOr(); expect(")"); return e; }
      if (t.t === "op" && t.v === "[") {
        next(); var items = [];
        if (!isOp("]")) {
          items.push(parseOr());
          while (isOp(",")) { next(); items.push(parseOr()); }
        }
        expect("]");
        return { t: "list", items: items };
      }
      if (t.t === "id") {
        next();
        /* df['col'] or df.col -> column reference */
        if (isOp("[")) {
          next();
          var inner = next();
          if (inner.t !== "str" && inner.t !== "id") throw new Error("Column name expected");
          expect("]");
          return { t: "col", name: String(inner.v) };
        }
        if (isOp(".")) {
          next();
          var member = next();
          if (member.t !== "id") throw new Error("Attribute name expected");
          /* function call on a namespace is not supported -> treat as column */
          if (isOp("(")) return parseCall("__ns__");
          return { t: "col", name: String(member.v) };
        }
        if (isOp("(")) return parseCall(t.v);
        /* bare identifier inside a list literal context may be a string value */
        return { t: "col", name: t.v };
      }
      throw new Error("Unexpected token in expression");
    }
    function parseCall(name) {
      expect("(");
      var args = [];
      if (!isOp(")")) {
        args.push(parseOr());
        while (isOp(",")) { next(); args.push(parseOr()); }
      }
      expect(")");
      return { t: "call", name: String(name).toLowerCase(), args: args };
    }
    var ast = parseOr();
    if (peek().t !== "eof") throw new Error("Unexpected trailing input in expression");
    return ast;
  }

  /* ------------------------------------------------------------ evaluator */
  var FUNCS = {
    abs: Math.abs, round: function (x, d) { var f = Math.pow(10, d || 0); return Math.round(x * f) / f; },
    sqrt: Math.sqrt, log: Math.log, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
    min: Math.min, max: Math.max,
    len: function (x) { return x === null || x === undefined ? 0 : String(x).length; },
    int: function (x) { return parseInt(x, 10); },
    float: function (x) { return parseFloat(x); },
    lower: function (x) { return String(x).toLowerCase(); },
    upper: function (x) { return String(x).toUpperCase(); }
  };

  function toNum(v) {
    if (v === null || v === undefined || v === "") return NaN;
    if (typeof v === "number") return v;
    return Number(v);
  }

  function looseEq(a, b) {
    var na = toNum(a), nb = toNum(b);
    if (!isNaN(na) && !isNaN(nb)) return na === nb;
    return String(a) === String(b);
  }

  function evalNode(node, row) {
    switch (node.t) {
      case "lit": return node.v;
      case "list": return node.items.map(function (n) { return evalNode(n, row); });
      case "col":
        if (Object.prototype.hasOwnProperty.call(row, node.name)) return row[node.name];
        throw new Error("Unknown column: " + node.name);
      case "un":
        if (node.op === "not") return !truthy(evalNode(node.e, row));
        return -toNum(evalNode(node.e, row));
      case "call": {
        var fn = FUNCS[node.name];
        if (!fn) throw new Error("Unknown function: " + node.name);
        var args = node.args.map(function (a) { return evalNode(a, row); });
        return fn.apply(null, args);
      }
      case "bin": {
        var op = node.op;
        if (op === "and") return truthy(evalNode(node.l, row)) && truthy(evalNode(node.r, row));
        if (op === "or") return truthy(evalNode(node.l, row)) || truthy(evalNode(node.r, row));
        var a = evalNode(node.l, row), b = evalNode(node.r, row);
        switch (op) {
          case "+": return toNum(a) + toNum(b);
          case "-": return toNum(a) - toNum(b);
          case "*": return toNum(a) * toNum(b);
          case "/": {
            var d = toNum(b);
            return d === 0 ? NaN : toNum(a) / d;
          }
          case "%": return toNum(a) % toNum(b);
          case "==": return looseEq(a, b);
          case "!=": return !looseEq(a, b);
          case "<": return orderedCompare(a, b) === -1;
          case "<=": var cLe = orderedCompare(a, b); return cLe === -1 || cLe === 0;
          case ">": return orderedCompare(a, b) === 1;
          case ">=": var cGe = orderedCompare(a, b); return cGe === 0 || cGe === 1;
          case "in": return Array.isArray(b) ? b.some(function (x) { return looseEq(a, x); }) : String(b).indexOf(String(a)) >= 0;
        }
        throw new Error("Unsupported operator " + op);
      }
    }
    throw new Error("Bad expression node");
  }

  /* -1 / 0 / 1, or null when the pair is not orderable at all.
     pandas semantics: any comparison involving NaN/missing is False. */
  function orderedCompare(a, b) {
    var missing = a === null || a === undefined || a === "" ||
                  b === null || b === undefined || b === "";
    var na = toNum(a), nb = toNum(b);
    if (!isNaN(na) && !isNaN(nb)) return na < nb ? -1 : (na > nb ? 1 : 0);
    if (missing) return null;
    var sa = String(a), sb = String(b);
    return sa < sb ? -1 : (sa > sb ? 1 : 0);
  }

  function truthy(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return !isNaN(v) && v !== 0;
    var s = String(v).toLowerCase();
    return !(s === "" || s === "0" || s === "false" || s === "nan");
  }

  function compileExpr(src) {
    var ast = parse(tokenize(src));
    return function (row) { return evalNode(ast, row); };
  }

  /* ---------------------------------------------------------- aggregators */
  /* loop-based min/max: safe for very large columns where
     Math.max.apply(null, bigArray) would exceed the argument limit */
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

  function clean(vals) {
    return vals.filter(function (v) { return v !== null && v !== undefined && v !== "" && !isNaN(toNum(v)); })
               .map(function (v) { return toNum(v); });
  }
  var AGG = {
    sum: function (v) { return clean(v).reduce(function (a, b) { return a + b; }, 0); },
    mean: function (v) { var c = clean(v); return c.length ? c.reduce(function (a, b) { return a + b; }, 0) / c.length : null; },
    max: function (v) { var c = clean(v); return c.length ? maxOf(c) : null; },
    min: function (v) { var c = clean(v); return c.length ? minOf(c) : null; },
    count: function (v) { return clean(v).length; },
    median: function (v) { return percentile(clean(v), 0.5); },
    std: function (v) {
      var c = clean(v);
      if (c.length < 2) return null;
      var m = c.reduce(function (a, b) { return a + b; }, 0) / c.length;
      var s = c.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0);
      return Math.sqrt(s / (c.length - 1));
    },
    nunique: function (v) {
      var seen = Object.create(null), n = 0;
      v.forEach(function (x) { var k = String(x); if (!seen[k]) { seen[k] = 1; n++; } });
      return n;
    }
  };

  function percentile(sortedOrNot, p) {
    var a = sortedOrNot.slice().sort(function (x, y) { return x - y; });
    if (!a.length) return null;
    var idx = (a.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return a[lo];
    return a[lo] + (a[hi] - a[lo]) * (idx - lo);
  }

  /* ------------------------------------------------------------ DataFrame */
  function DataFrame(records) {
    records = records || [];
    var cols = [], seen = Object.create(null);
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      for (var k in rec) {
        if (Object.prototype.hasOwnProperty.call(rec, k) && !seen[k]) { seen[k] = 1; cols.push(k); }
      }
    }
    this.columns = cols;
    this.length = records.length;
    this.data = Object.create(null);
    this.dtypes = Object.create(null);
    for (var c = 0; c < cols.length; c++) {
      var name = cols[c], arr = new Array(this.length);
      var numericish = true, sawNumber = false;
      for (var r = 0; r < this.length; r++) {
        var v = records[r][name];
        arr[r] = v;
        if (v === null || v === undefined || v === "") continue;
        if (isNumeric(v)) sawNumber = true; else numericish = false;
      }
      var dtype = (numericish && sawNumber) ? "number" : "object";
      for (var r2 = 0; r2 < this.length; r2++) {
        var vv = arr[r2];
        if (vv === undefined) { arr[r2] = null; continue; }
        if (dtype === "number" && (vv === null || vv === "")) arr[r2] = null;
        else if (dtype === "number") arr[r2] = Number(vv);
      }
      this.data[name] = arr;
      this.dtypes[name] = dtype;
    }
  }

  function isNumeric(v) {
    if (typeof v === "number") return isFinite(v);
    if (typeof v === "string" && v.trim() !== "") return isFinite(Number(v));
    return false;
  }

  DataFrame.prototype.shape = function () { return [this.length, this.columns.length]; };
  DataFrame.prototype.numericColumns = function () {
    var self = this;
    return this.columns.filter(function (c) { return self.dtypes[c] === "number"; });
  };
  DataFrame.prototype.objectColumns = function () {
    var self = this;
    return this.columns.filter(function (c) { return self.dtypes[c] === "object"; });
  };

  /* internal: build a DataFrame from an explicit column map */
  function fromColumns(cols, map, dtypes) {
    var df = Object.create(DataFrame.prototype);
    df.columns = cols.slice();
    df.data = map;
    df.dtypes = dtypes || Object.create(null);
    df.length = cols.length ? (map[cols[0]] || []).length : 0;
    return df;
  }
  DataFrame.fromColumns = fromColumns;

  DataFrame.prototype.rowAt = function (i) {
    var rec = Object.create(null);
    for (var c = 0; c < this.columns.length; c++) rec[this.columns[c]] = this.data[this.columns[c]][i];
    return rec;
  };

  DataFrame.prototype.toRecords = function () {
    var out = new Array(this.length);
    for (var i = 0; i < this.length; i++) out[i] = this.rowAt(i);
    return out;
  };

  DataFrame.prototype.take = function (indexes) {
    var map = Object.create(null), cols = this.columns;
    for (var c = 0; c < cols.length; c++) {
      var src = this.data[cols[c]], dst = new Array(indexes.length);
      for (var i = 0; i < indexes.length; i++) dst[i] = src[indexes[i]];
      map[cols[c]] = dst;
    }
    return fromColumns(cols, map, this.dtypes);
  };

  DataFrame.prototype.head = function (n) {
    n = Math.max(0, Math.min(n === undefined ? 10 : n, this.length));
    var idx = []; for (var i = 0; i < n; i++) idx.push(i);
    return this.take(idx);
  };
  DataFrame.prototype.tail = function (n) {
    n = Math.max(0, Math.min(n === undefined ? 10 : n, this.length));
    var idx = []; for (var i = this.length - n; i < this.length; i++) idx.push(i);
    return this.take(idx);
  };

  DataFrame.prototype.select = function (cols) {
    var map = Object.create(null), dtypes = Object.create(null);
    cols.forEach(function (c) { map[c] = this.data[c].slice(); dtypes[c] = this.dtypes[c]; }, this);
    return fromColumns(cols, map, dtypes);
  };

  DataFrame.prototype.query = function (expr) {
    var fn = compileExpr(expr), idx = [];
    for (var i = 0; i < this.length; i++) {
      if (truthy(fn(this.rowAt(i)))) idx.push(i);
    }
    return this.take(idx);
  };

  DataFrame.prototype.sortValues = function (by, ascending) {
    ascending = ascending !== false;
    var col = this.data[by];
    if (!col) throw new Error("Unknown column: " + by);
    var idx = [];
    for (var i = 0; i < this.length; i++) idx.push(i);
    var type = this.dtypes[by];
    idx.sort(function (a, b) {
      var x = col[a], y = col[b];
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      var d = type === "number" ? (x - y) : (String(x) < String(y) ? -1 : (String(x) > String(y) ? 1 : 0));
      return ascending ? d : -d;
    });
    return this.take(idx);
  };

  DataFrame.prototype.dropna = function () {
    var idx = [];
    for (var i = 0; i < this.length; i++) {
      var ok = true;
      for (var c = 0; c < this.columns.length; c++) {
        var v = this.data[this.columns[c]][i];
        if (v === null || v === undefined || v === "") { ok = false; break; }
      }
      if (ok) idx.push(i);
    }
    return this.take(idx);
  };

  DataFrame.prototype.fillna = function (mode) {
    var map = Object.create(null), dtypes = this.dtypes;
    for (var c = 0; c < this.columns.length; c++) {
      var name = this.columns[c], src = this.data[name];
      var dst = src.slice();
      if (dtypes[name] === "number") {
        var vals = clean(src);
        var fill = mode === "zero" ? 0 : (vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0);
        for (var i = 0; i < dst.length; i++) if (dst[i] === null || isNaN(dst[i])) dst[i] = fill;
      } else if (mode === "zero") {
        for (var j = 0; j < dst.length; j++) if (dst[j] === null || dst[j] === "") dst[j] = "0";
      }
      map[name] = dst;
    }
    return fromColumns(this.columns, map, dtypes);
  };

  DataFrame.prototype.dropDuplicates = function (subset) {
    var keys = subset && subset.length ? subset : this.columns;
    var seen = Object.create(null), idx = [];
    for (var i = 0; i < this.length; i++) {
      var k = keys.map(function (c) { return String(this.data[c][i]); }, this).join("\u0001");
      if (!seen[k]) { seen[k] = 1; idx.push(i); }
    }
    return this.take(idx);
  };

  DataFrame.prototype.assign = function (name, expr) {
    var fn = compileExpr(expr), map = Object.create(null), dtypes = Object.create(null);
    for (var c = 0; c < this.columns.length; c++) {
      var col = this.columns[c];
      map[col] = this.data[col].slice();
      dtypes[col] = this.dtypes[col];
    }
    var out = new Array(this.length), allNum = true, any = false;
    for (var i = 0; i < this.length; i++) {
      var v = fn(this.rowAt(i));
      if (typeof v === "number" && isFinite(v)) { any = true; } else if (v !== null && v !== undefined) { allNum = false; }
      out[i] = (typeof v === "number" && !isFinite(v)) ? null : v;
    }
    map[name] = out;
    dtypes[name] = (allNum && any) ? "number" : "object";
    var cols = this.columns.slice();
    if (cols.indexOf(name) < 0) cols.push(name);
    return fromColumns(cols, map, dtypes);
  };

  DataFrame.prototype.groupAgg = function (byKeys, aggCol, funcName) {
    var fn = AGG[funcName] || AGG.mean;
    var indexByKey = Object.create(null), order = [];
    for (var i = 0; i < this.length; i++) {
      var keyParts = byKeys.map(function (k) { return String(this.data[k][i]); }, this);
      var key = keyParts.join("\u0001");
      if (!indexByKey[key]) {
        indexByKey[key] = { keys: keyParts, vals: [] };
        order.push(key);
      }
      indexByKey[key].vals.push(this.data[aggCol] ? this.data[aggCol][i] : null);
    }
    var records = order.map(function (k) {
      var g = indexByKey[k], rec = Object.create(null);
      byKeys.forEach(function (b, bi) { rec[b] = g.keys[bi]; });
      rec[aggCol] = fn(g.vals);
      return rec;
    });
    return new DataFrame(records);
  };

  DataFrame.prototype.pivotTable = function (indexKey, colKey, valueKey, aggFuncName) {
    var fn = AGG[aggFuncName] || AGG.sum;
    var rowVals = [], colVals = [];
    var rSeen = Object.create(null), cSeen = Object.create(null);
    var bucket = Object.create(null);
    for (var i = 0; i < this.length; i++) {
      var r = String(this.data[indexKey][i]);
      var c = String(this.data[colKey][i]);
      if (!rSeen[r]) { rSeen[r] = 1; rowVals.push(r); }
      if (!cSeen[c]) { cSeen[c] = 1; colVals.push(c); }
      var k = r + "\u0001" + c;
      (bucket[k] || (bucket[k] = [])).push(this.data[valueKey] ? this.data[valueKey][i] : null);
    }
    var records = rowVals.map(function (r) {
      var rec = Object.create(null);
      rec[indexKey] = this.dtypes[indexKey] === "number" ? Number(r) : r;
      colVals.forEach(function (c) {
        var v = bucket[r + "\u0001" + c];
        rec[c] = v ? fn(v) : null;
      });
      return rec;
    }, this);
    return { frame: new DataFrame(records), rowVals: rowVals, colVals: colVals };
  };

  DataFrame.prototype.describe = function () {
    var nums = this.numericColumns();
    var stats = ["count", "mean", "std", "min", "25%", "50%", "75%", "max"];
    var records = stats.map(function (s) { var r = Object.create(null); r.statistic = s; return r; });
    nums.forEach(function (col) {
      var v = clean(this.data[col]);
      var mean = v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
      var sd = null;
      if (v.length > 1) {
        var acc = v.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0);
        sd = Math.sqrt(acc / (v.length - 1));
      }
      var vals = { count: v.length, mean: mean, std: sd, min: v.length ? minOf(v) : null,
                   "25%": percentile(v, .25), "50%": percentile(v, .5), "75%": percentile(v, .75),
                   max: v.length ? maxOf(v) : null };
      records.forEach(function (rec) { rec[col] = vals[rec.statistic]; });
    }, this);
    return { frame: new DataFrame(records), numericColumns: nums };
  };

  DataFrame.prototype.valueCounts = function (col, top) {
    var counts = Object.create(null), order = [];
    for (var i = 0; i < this.length; i++) {
      var k = String(this.data[col][i]);
      if (counts[k] === undefined) { counts[k] = 0; order.push(k); }
      counts[k]++;
    }
    var total = this.length || 1;
    var records = order.map(function (k) {
      var rec = Object.create(null);
      rec[col] = k;
      rec.count = counts[k];
      rec.percent = counts[k] / total * 100;
      return rec;
    });
    records.sort(function (a, b) { return b.count - a.count; });
    if (top) records = records.slice(0, top);
    return new DataFrame(records);
  };

  DataFrame.prototype.corr = function () {
    var nums = this.numericColumns();
    var matrix = [];
    for (var i = 0; i < nums.length; i++) {
      var row = [];
      for (var j = 0; j < nums.length; j++) {
        row.push(pearson(this.data[nums[i]], this.data[nums[j]]));
      }
      matrix.push(row);
    }
    return { columns: nums, matrix: matrix };
  };

  function pearson(a, b) {
    var xs = [], ys = [];
    for (var i = 0; i < a.length; i++) {
      var x = toNum(a[i]), y = toNum(b[i]);
      if (!isNaN(x) && !isNaN(y) && a[i] !== null && b[i] !== null) { xs.push(x); ys.push(y); }
    }
    var n = xs.length;
    if (n < 2) return null;
    var mx = xs.reduce(function (p, q) { return p + q; }, 0) / n;
    var my = ys.reduce(function (p, q) { return p + q; }, 0) / n;
    var num = 0, dx = 0, dy = 0;
    for (var k = 0; k < n; k++) {
      var a1 = xs[k] - mx, b1 = ys[k] - my;
      num += a1 * b1; dx += a1 * a1; dy += b1 * b1;
    }
    if (dx === 0 || dy === 0) return null;
    return num / Math.sqrt(dx * dy);
  }

  DataFrame.prototype.toCSV = function () {
    var cols = this.columns;
    function esc(v) {
      if (v === null || v === undefined) return "";
      var s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var lines = [cols.map(esc).join(",")];
    for (var i = 0; i < this.length; i++) {
      var out = [];
      for (var c = 0; c < cols.length; c++) out.push(esc(this.data[cols[c]][i]));
      lines.push(out.join(","));
    }
    return lines.join("\n");
  };

  /* memory estimate, mimic of df.info(memory_usage='deep') in a very rough way */
  DataFrame.prototype.memory = function () {
    var total = 0, cols = this.columns;
    for (var c = 0; c < cols.length; c++) {
      var t = this.dtypes[cols[c]];
      total += t === "number" ? 8 : 24;
    }
    return total * Math.max(this.length, 1);
  };

  global.NQPF_DF = { DataFrame: DataFrame, compile: compileExpr, AGG: AGG, percentile: percentile, isNumeric: isNumeric };
})(window);
