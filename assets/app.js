/* Ruta Pokémon — progreso y riel.
   Sin dependencias. El progreso vive en el navegador de quien lee. */
(function () {
  "use strict";

  var KEY = "ruta-pokemon:v1";
  var stages = Array.prototype.slice.call(document.querySelectorAll(".stage"));
  var cells = document.getElementById("cells");
  var cellsLbl = document.getElementById("cells-lbl");
  var pillCount = document.getElementById("pill-count");
  var jump = document.getElementById("jump");
  var railFill = document.getElementById("rail-fill");
  var route = document.getElementById("route");

  /* ---------- estado ---------- */

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ventana privada o dato corrupto: arrancamos del HTML */ }
    return null;
  }

  var done = {};
  var saved = read();
  if (saved && typeof saved === "object") {
    done = saved;
  } else {
    stages.forEach(function (s) {
      if (s.classList.contains("done")) done[s.dataset.id] = true;
    });
  }

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* sin persistencia */ }
  }

  /* ---------- las 12 celdas del medidor ---------- */

  stages.forEach(function () {
    var c = document.createElement("span");
    c.className = "cell";
    cells.appendChild(c);
  });
  var cellEls = Array.prototype.slice.call(cells.children);

  /* ---------- pintar ---------- */

  function firstPending() {
    for (var i = 0; i < stages.length; i++) {
      if (!done[stages[i].dataset.id]) return stages[i];
    }
    return null;
  }

  function paint() {
    var n = 0;
    stages.forEach(function (s, i) {
      var on = !!done[s.dataset.id];
      s.classList.toggle("done", on);
      cellEls[i].classList.toggle("on", on);
      var btn = s.querySelector(".mark");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.querySelector(".mark-t").textContent = on ? "CLEARED" : "MARK";
      if (on) n++;
    });
    var total = stages.length;
    cellsLbl.textContent = n + " / " + total + " CLEARED";
    pillCount.textContent = n + " / " + total;

    var next = firstPending();
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

  stages.forEach(function (st) {
    st.querySelector(".mark").addEventListener("click", function () {
      var turningOn = !done[st.dataset.id];
      done[st.dataset.id] = turningOn;
      write();
      paint();
      if (turningOn) {
        st.classList.remove("just-done");
        void st.offsetWidth;                 // reinicia la animación
        st.classList.add("just-done");
      }
    });
    st.addEventListener("animationend", function (e) {
      if (e.animationName === "hop") st.classList.remove("just-done");
    });
  });

  jump.addEventListener("click", function () {
    var id = jump.dataset.target;
    if (!id) return;
    var el = document.querySelector('.stage[data-id="' + id + '"]');
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  /* ---------- el riel sigue al scroll ----------
     Es progreso real de lectura, no una animación decorativa: la línea marca
     hasta dónde llegaste en la ruta. Se recalcula en rAF, nunca en el listener. */

  var ticking = false;

  function drawRail() {
    ticking = false;
    if (!route || !railFill) return;
    var r = route.getBoundingClientRect();
    var mid = window.innerHeight * 0.5;
    var pct = (mid - r.top) / r.height;
    pct = Math.max(0, Math.min(1, pct));
    railFill.style.height = (pct * 100) + "%";

    /* Una parada queda "alcanzada" cuando el riel ya pasó su punto. */
    var reach = r.top + r.height * pct;
    stages.forEach(function (st) {
      var d = st.getBoundingClientRect().top + 10;
      st.classList.toggle("reached", d <= reach);
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(drawRail);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  paint();
  drawRail();
})();
