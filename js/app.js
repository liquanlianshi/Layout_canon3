/* ==========================================================================
   app.js — bootstrapping: view routing, language switching, resize wiring.
   ========================================================================== */
(function (global) {
  "use strict";

  var X = global.NQPFX, T = global.I18N;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function switchView(name) {
    each(document.querySelectorAll(".view"), function (v) {
      v.classList.toggle("active", v.id === "view-" + name);
    });
    each(document.querySelectorAll(".tab"), function (t) {
      t.classList.toggle("active", t.getAttribute("data-view") === name);
    });
    /* containers that were display:none need a resize once they become visible */
    X.resizeAll();
    setTimeout(function () { X.resizeAll(); }, 80);
  }

  function bindNav() {
    each(document.querySelectorAll(".tab"), function (tab) {
      tab.addEventListener("click", function () { switchView(tab.getAttribute("data-view")); });
    });
    each(document.querySelectorAll("[data-view-link]"), function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        switchView(el.getAttribute("data-view-link"));
      });
    });
  }

  function bindLang() {
    each(document.querySelectorAll(".lang-switch button"), function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-lang");
        each(document.querySelectorAll(".lang-switch button"), function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        T.set(lang);
        global.OVERVIEW.render();
        global.WORKBENCH.refresh();
        X.resizeAll();
      });
    });
  }

  function syncLangButtons() {
    each(document.querySelectorAll(".lang-switch button"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === T.lang());
    });
  }

  function boot() {
    X.registerTheme();
    T.restore();
    syncLangButtons();
    global.OVERVIEW.render();
    global.WORKBENCH.init();
    bindNav();
    bindLang();
    window.addEventListener("resize", X.debounce(function () { X.resizeAll(); }, 220));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
