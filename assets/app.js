/* Pokémon route — progress, rail and keyboard navigation.
   No dependencies. Everything a reader marks stays in their own browser. */
(function () {
  "use strict";

  /* v2: v1 stored plain booleans. A stop now has three states, so old saves
     are migrated once — true becomes "cleared" — instead of being discarded. */
  var KEY = "pokemon-route:v2";
  var OLD_KEY = "ruta-pokemon:v1";

  var NOT = 0, PLAYING = 1, DONE = 2;
  var LABEL = ["NOT STARTED", "PLAYING", "CLEARED"];

  var stages = Array.prototype.slice.call(document.querySelectorAll(".stage"));
  var cells = document.getElementById("cells");
  var cellsLbl = document.getElementById("cells-lbl");
  var hoursLbl = document.getElementById("hours-lbl");
  var pillCount = document.getElementById("pill-count");
  var jump = document.getElementById("jump");
  var railFill = document.getElementById("rail-fill");
  var route = document.getElementById("route");
  var help = document.getElementById("help");
  var screenHours = document.getElementById("screen-hours");

  /* ---------- hours, read off the page itself ----------
     The estimates already sit in each stop's meta line, so nothing is
     duplicated here: edit the HTML and the totals follow. */

  function hoursOf(stage) {
    var meta = stage.querySelector(".stage-meta");
    var m = meta && meta.textContent.match(/~?\s*(\d+)\s*H\b/i);
    return m ? parseInt(m[1], 10) : 0;
  }
  var HOURS = stages.map(hoursOf);
  var TOTAL_HOURS = HOURS.reduce(function (a, b) { return a + b; }, 0);
  if (screenHours) screenHours.textContent = "~" + TOTAL_HOURS;

  /* ---------- console per stop, also read off the page ---------- */

  function consoleOf(stage) {
    var b = stage.querySelector(".stage-meta b");
    return b ? b.textContent.trim() : "";
  }
  var SHORT = {
    "GAME BOY": "GB",
    "GAME BOY COLOR": "GBC",
    "GAME BOY ADVANCE": "GBA",
    "NINTENDO DS": "DS",
    "NINTENDO 3DS": "3DS",
    "NINTENDO SWITCH": "SWITCH"
  };

  /* ---------- state ---------- */

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
      var old = localStorage.getItem(OLD_KEY);
      if (old) {
        var was = JSON.parse(old), out = {};
        Object.keys(was).forEach(function (k) { if (was[k]) out[k] = DONE; });
        return out;
      }
    } catch (e) { /* private window or corrupt data: start clean */ }
    return null;
  }

  var state = read() || {};

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* no persistence */ }
  }

  function stateOf(st) { return state[st.dataset.id] || NOT; }

  /* ---------- the meter, grouped by console ----------
     Twelve cells, so every stop stays individually readable, clustered into
     the six hardware eras so the same control also tells the hardware story.
     One control with two readings, rather than two controls showing one. */

  var cellEls = [];
  (function buildMeter() {
    if (!cells) return;
    var group = null, last = null;
    stages.forEach(function (st, i) {
      var c = consoleOf(st);
      if (c !== last) {
        group = document.createElement("span");
        group.className = "cell-group";
        group.dataset.console = SHORT[c] || c;
        cells.appendChild(group);
        last = c;
      }
      var cell = document.createElement("span");
      cell.className = "cell";
      cell.style.setProperty("--era", st.style.getPropertyValue("--era"));
      group.appendChild(cell);
      cellEls[i] = cell;
    });
  })();

  /* ---------- paint ---------- */

  function firstUnfinished() {
    for (var i = 0; i < stages.length; i++) {
      if (stateOf(stages[i]) !== DONE) return stages[i];
    }
    return null;
  }

  function paint() {
    var cleared = 0, played = 0;

    stages.forEach(function (st, i) {
      var s = stateOf(st);
      st.classList.toggle("done", s === DONE);
      st.classList.toggle("playing", s === PLAYING);
      if (cellEls[i]) {
        cellEls[i].classList.toggle("on", s === DONE);
        cellEls[i].classList.toggle("half", s === PLAYING);
      }

      var btn = st.querySelector(".mark");
      btn.querySelector(".mark-t").textContent = LABEL[s];
      btn.setAttribute("aria-label",
        st.querySelector("h3").textContent + " — " + LABEL[s] + ". Activate to change.");

      if (s === DONE) { cleared++; played += HOURS[i]; }
    });

    var total = stages.length;
    if (cellsLbl) cellsLbl.textContent = cleared + " / " + total + " CLEARED";
    if (hoursLbl) hoursLbl.textContent = "~" + played + " OF ~" + TOTAL_HOURS + " HOURS";
    if (pillCount) pillCount.textContent = cleared + " / " + total;

    var next = firstUnfinished();
    if (next) {
      jump.disabled = false;
      jump.textContent = "NEXT >";
      jump.dataset.target = next.dataset.id;
    } else {
      jump.disabled = true;
      jump.textContent = "ROUTE CLEARED";
      delete jump.dataset.target;
    }
  }

  /* ---------- marking ---------- */

  function cycle(st) {
    var next = (stateOf(st) + 1) % 3;
    if (next === NOT) delete state[st.dataset.id];
    else state[st.dataset.id] = next;
    write();
    paint();
    if (next === DONE) {
      st.classList.remove("just-done");
      void st.offsetWidth;                    // restart the animation
      st.classList.add("just-done");
    }
  }

  stages.forEach(function (st) {
    st.querySelector(".mark").addEventListener("click", function () { cycle(st); });
    st.addEventListener("animationend", function (e) {
      if (e.animationName === "hop") st.classList.remove("just-done");
    });
  });

  function goTo(el) {
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    var btn = el.querySelector(".mark");
    if (btn) btn.focus({ preventScroll: true });
  }

  jump.addEventListener("click", function () {
    var id = jump.dataset.target;
    if (id) goTo(document.querySelector('.stage[data-id="' + id + '"]'));
  });

  /* ---------- keyboard ----------
     j and k walk the route, like a d-pad. The arrow keys are deliberately
     left alone: hijacking them would break ordinary scrolling. */

  function nearestIndex() {
    var mid = window.innerHeight / 2, best = 0, bestD = Infinity;
    stages.forEach(function (st, i) {
      var r = st.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function typing(e) {
    var t = e.target;
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
    var k = e.key;

    if (k === "?") {
      e.preventDefault();
      if (help) help.hidden = !help.hidden;
      return;
    }
    if (k === "Escape" && help && !help.hidden) { help.hidden = true; return; }

    if (k === "j" || k === "J") {
      e.preventDefault();
      goTo(stages[Math.min(stages.length - 1, nearestIndex() + 1)]);
    } else if (k === "k" || k === "K") {
      e.preventDefault();
      goTo(stages[Math.max(0, nearestIndex() - 1)]);
    } else if (k === "x" || k === "X") {
      e.preventDefault();
      cycle(stages[nearestIndex()]);
    } else if (k === "n" || k === "N") {
      e.preventDefault();
      goTo(firstUnfinished());
    }
  });

  if (help) {
    var closeBtn = help.querySelector(".help-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { help.hidden = true; });
  }

  /* ---------- the rail follows the scroll ----------
     Real reading progress rather than decoration: the line marks how far
     along the route you are, and each marker lights once it passes. */

  var ticking = false;

  function drawRail() {
    ticking = false;
    if (!route || !railFill) return;
    var r = route.getBoundingClientRect();
    var pct = Math.max(0, Math.min(1, (window.innerHeight * 0.5 - r.top) / r.height));
    railFill.style.height = (pct * 100) + "%";

    var reach = r.top + r.height * pct;
    stages.forEach(function (st) {
      st.classList.toggle("reached", st.getBoundingClientRect().top + 10 <= reach);
    });
  }

  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(drawRail); }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  paint();
  drawRail();
})();
