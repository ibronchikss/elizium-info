(function () {
  "use strict";

  var root = document.documentElement;
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var reduce = !!(mqReduce && mqReduce.matches);
  var mqFine = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
  var fine = !!(mqFine && mqFine.matches);

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function safe(fn) { try { fn(); } catch (e) { } }
  function isLight() { return root.getAttribute("data-theme") === "light"; }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeOutBack(x) { var c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function sizeCanvas(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }

  function TileField(w, h, ox, oy) {
    var cols = w < 640 ? 7 : 13;
    var T = Math.ceil(w / cols);
    var rows = Math.ceil(h / T);
    var maxd = 1;
    this.T = T;
    this.tiles = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var d = Math.hypot(c * T + T / 2 - ox, r * T + T / 2 - oy);
        if (d > maxd) maxd = d;
        this.tiles.push({ x: c * T, y: r * T, d: d, j: Math.random() });
      }
    }
    for (var i = 0; i < this.tiles.length; i++) this.tiles[i].d /= maxd;
  }
  TileField.prototype.draw = function (ctx, p, mode, fill, stroke) {
    var T = this.T;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    for (var i = 0; i < this.tiles.length; i++) {
      var t = this.tiles[i];
      var local = clamp((p - (t.d * 0.62 + t.j * 0.2)) / 0.3, 0, 1);
      var s = mode === "cover" ? easeInOut(local) : 1 - easeInOut(local);
      if (s <= 0.002) continue;
      var size = T * s + (s > 0.995 ? 1 : 0);
      var x = t.x + (T - size) / 2;
      var y = t.y + (T - size) / 2;
      ctx.fillRect(x, y, size, size);
      if (s < 0.995) ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    }
  };

  function wipeColors() {
    return isLight()
      ? { fill: "#f6efdb", stroke: "rgba(20,160,149,0.45)" }
      : { fill: "#061513", stroke: "rgba(92,224,207,0.4)" };
  }

  function runWipe(mode, ox, oy, ms, done) {
    var cv = el("canvas", "fx-wipe");
    cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);
    var s = sizeCanvas(cv);
    var tf = new TileField(s.w, s.h, ox, oy);
    var col = wipeColors();
    var t0 = 0;
    function frame(now) {
      if (!t0) t0 = now;
      var p = clamp((now - t0) / ms, 0, 1);
      s.ctx.clearRect(0, 0, s.w, s.h);
      tf.draw(s.ctx, p * 1.12, mode, col.fill, col.stroke);
      if (p < 1) requestAnimationFrame(frame);
      else {
        if (mode === "reveal" && cv.parentNode) cv.parentNode.removeChild(cv);
        if (done) done(cv);
      }
    }
    if (mode === "reveal") {
      s.ctx.fillStyle = col.fill;
      s.ctx.fillRect(0, 0, s.w, s.h);
    }
    requestAnimationFrame(frame);
    return cv;
  }

  var asmObserver = null;
  var asmStarted = false;
  var pendingAsm = [];

  function tagAsm() {
    var sets = [
      [".hz-copy h1", "big"], [".hz-name", "big"], [".hz-copy p", ""], [".hz-video", "big"], [".hz-stat", ""],
      [".mq", "wide"], [".about-section .section-heading p", ""], [".bt", ""], [".world-banner", ""],
      [".hq-card", ""], [".hq-head .hq-all", ""], [".faq-links-head", ""], [".social-card", ""],
      [".product-card", ""], [".shop-toolbar", ""], [".page-intro", ""], [".breadcrumbs", ""],
      [".feature-card", ""], [".qa-tools", ""], [".qa-group", ""], [".qa-support", ""],
      [".rules-toc", ""], [".rules-intro", ""], [".rule-head", ""], [".rule-highlight", ""],
      [".rules-outro", ""], [".info-panel", ""], [".wiki-grid > *", ""], [".site-footer", "flat"],
      ["main .eyebrow", ""]
    ];
    var out = [];
    sets.forEach(function (pair) {
      var list = document.querySelectorAll(pair[0]);
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        if (n.hasAttribute("data-asm") || n.closest("[data-asm]") && n.closest("[data-asm]") !== n && pair[1] !== "big") continue;
        n.setAttribute("data-asm", pair[1] || "x");
        var big = pair[1] === "big", wide = pair[1] === "wide", flat = pair[1] === "flat";
        n.style.setProperty("--ax", (wide ? rnd(-220, 220) : flat ? 0 : rnd(big ? -110 : -50, big ? 110 : 50)).toFixed(0) + "px");
        n.style.setProperty("--ay", (flat ? 30 : rnd(big ? 40 : 34, big ? 110 : 90)).toFixed(0) + "px");
        n.style.setProperty("--ar", (flat || wide ? 0 : rnd(-7, 7)).toFixed(1) + "deg");
        n.style.setProperty("--as", flat ? "1" : (big ? rnd(0.82, 0.92) : rnd(0.9, 0.96)).toFixed(2));
        out.push(n);
      }
    });
    return out;
  }

  function bgClipText(node) {
    var cs = window.getComputedStyle(node);
    return cs.webkitBackgroundClip === "text" || cs.backgroundClip === "text";
  }

  function splitHeadings() {
    var heads = document.querySelectorAll("main h1, .section-heading h2, .hq-head h2, .world-banner h2");
    var out = [];
    for (var i = 0; i < heads.length; i++) {
      var h = heads[i];
      if (h.hasAttribute("data-asm") || bgClipText(h)) continue;
      var walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) {
        if (!n.nodeValue.trim() || n.parentNode !== h) continue;
        nodes.push(n);
      }
      var idx = 0;
      var label = h.textContent.replace(/\s+/g, " ").trim();
      nodes.forEach(function (tn) {
        var frag = document.createDocumentFragment();
        var parts = tn.nodeValue.split(/(\s+)/);
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = el("span", "fx-w");
          w.setAttribute("aria-hidden", "true");
          for (var k = 0; k < part.length; k++) {
            var c = el("span", "fx-ch", part.charAt(k));
            c.style.setProperty("--i", idx++);
            c.style.setProperty("--cx", rnd(-26, 26).toFixed(0) + "px");
            c.style.setProperty("--cy", rnd(18, 58).toFixed(0) + "px");
            c.style.setProperty("--cr", rnd(-24, 24).toFixed(0) + "deg");
            w.appendChild(c);
          }
          frag.appendChild(w);
        });
        tn.parentNode.replaceChild(frag, tn);
      });
      if (nodes.length) {
        h.classList.add("fx-split");
        h.setAttribute("aria-label", label);
        out.push(h);
      }
    }
    return out;
  }

  function startAsm() {
    if (asmStarted) return;
    asmStarted = true;
    if (!asmObserver) { revealAll(); return; }
    pendingAsm.forEach(function (n) { asmObserver.observe(n); });
  }

  function revealAll() {
    pendingAsm.forEach(function (n) {
      n.classList.add("asm-in");
    });
  }

  function setupAsm() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var items = splitHeadings().concat(tagAsm());
    if (!items.length) return;
    pendingAsm = items;
    root.classList.add("asm-on");
    void document.body.offsetHeight;
    asmObserver = new IntersectionObserver(function (entries) {
      var vis = entries.filter(function (e) { return e.isIntersecting; });
      vis.sort(function (a, b) {
        var ra = a.boundingClientRect, rb = b.boundingClientRect;
        return ra.top - rb.top || ra.left - rb.left;
      });
      vis.forEach(function (e, i) {
        var n = e.target;
        var d = Math.min(i * 80, 640);
        asmObserver.unobserve(n);
        if (n.classList.contains("fx-split")) {
          n.style.setProperty("--hd", d + "ms");
          n.classList.add("asm-in");
          return;
        }
        n.style.setProperty("--ad", d + "ms");
        n.classList.add("asm-in");
        setTimeout(function () {
          n.removeAttribute("data-asm");
          n.classList.remove("asm-in");
          n.style.removeProperty("--ad");
        }, 1250 + d);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
  }

  function bootIntro() {
    root.classList.add("boot-run");
    var ov = el("div");
    ov.id = "fx-boot";
    ov.setAttribute("role", "presentation");
    var cv = el("canvas");
    cv.setAttribute("aria-hidden", "true");
    var ui = el("div", "fx-boot-ui");
    var word = el("img", "fx-boot-word");
    word.src = "assets/images/elezium-wordmark.png";
    word.alt = "";
    word.width = 1118;
    word.height = 225;
    var bar = el("div", "fx-boot-bar");
    bar.setAttribute("aria-hidden", "true");
    var segs = [];
    for (var b = 0; b < 24; b++) { var sg = el("i"); bar.appendChild(sg); segs.push(sg); }
    var meta = el("div", "fx-boot-meta");
    var lab = el("span", null, "Сборка мира");
    var pct = el("span", null, "0%");
    meta.appendChild(lab);
    meta.appendChild(pct);
    ui.appendChild(word);
    ui.appendChild(bar);
    ui.appendChild(meta);
    var skip = el("button", "fx-boot-skip", "Пропустить");
    skip.type = "button";
    ov.appendChild(cv);
    ov.appendChild(ui);
    ov.appendChild(skip);
    document.body.appendChild(ov);
    try { localStorage.setItem("elezium-intro", "1"); } catch (e) { }

    var s = sizeCanvas(cv);
    var W = s.w, H = s.h, ctx = s.ctx;
    var cx = W / 2, cy = H * 0.4;
    var N = 16;
    var cell = Math.min(W * 0.62, H * 0.5) / (2 * N + 1);
    var stops = [[0, [242, 255, 253]], [0.25, [163, 242, 230]], [0.6, [92, 224, 207]], [1, [26, 167, 156]]];
    function grad(t) {
      for (var i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
          var a = stops[i - 1], c = stops[i], k = (t - a[0]) / (c[0] - a[0]);
          return [a[1][0] + (c[1][0] - a[1][0]) * k, a[1][1] + (c[1][1] - a[1][1]) * k, a[1][2] + (c[1][2] - a[1][2]) * k];
        }
      }
      return stops[stops.length - 1][1];
    }
    var cells = [];
    var far = Math.hypot(W, H) / 2;
    for (var gy = -N; gy <= N; gy++) {
      for (var gx = -N; gx <= N; gx++) {
        var u = Math.abs(gx) / N, v = Math.abs(gy) / N;
        var q = Math.pow(u, 0.52) + Math.pow(v, 0.52);
        if (q > 1) continue;
        var ang = rnd(0, Math.PI * 2), rr = rnd(0.4, 1) * far;
        var col = grad(q);
        var shade = rnd(0.88, 1.06);
        cells.push({
          tx: cx + gx * cell, ty: cy + gy * cell,
          sx: cx + Math.cos(ang) * rr, sy: cy + Math.sin(ang) * rr,
          sr: rnd(-4, 4), ss: rnd(0.3, 1.9),
          dl: q * 0.72 + rnd(0, 0.28), du: rnd(0.7, 1.0),
          r: col[0] * shade, g: col[1] * shade, b: col[2] * shade,
          vx: gx, vy: gy, tw: rnd(0, 6.28), q: q
        });
      }
    }
    var specks = [];
    for (var sp = 0; sp < 60; sp++) specks.push({ x: rnd(0, W), y: rnd(0, H), v: rnd(10, 40), s: rnd(2, 4), a: rnd(0.15, 0.5) });
    var tiles = new TileField(W, H, cx, cy);

    var tAssemble = 2.0, tExit = 2.75, exitDur = 1.05;
    var t0 = 0, last = 0, done = false, exiting = false, offset = 0;
    var filled = -1;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(failTimer);
      window.removeEventListener("keydown", onKey);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      root.classList.remove("boot-on", "boot-run");
      document.dispatchEvent(new Event("fx:boot-done"));
      startAsm();
    }
    function onKey(e) { if (e.key === "Escape" || e.key === "Esc") skipNow(); }
    function skipNow() {
      if (done) return;
      var now = (performance.now() - t0) / 1000 + offset;
      if (now < tExit) offset += tExit - now;
    }
    skip.addEventListener("click", skipNow);
    window.addEventListener("keydown", onKey);
    var failTimer = setTimeout(finish, 9000);

    function frame(now) {
      if (done) return;
      if (!t0) t0 = now;
      var t = (now - t0) / 1000 + offset;
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
      last = now;
      ctx.clearRect(0, 0, W, H);

      var p = clamp((t - tExit) / exitDur, 0, 1);
      if (t >= tExit && !exiting) {
        exiting = true;
        ov.classList.add("out");
        lab.textContent = "Готово";
      }

      if (exiting) {
        tiles.draw(ctx, p * 1.12, "reveal", "#030808", "rgba(92,224,207,0.35)");
      }

      ctx.fillStyle = "rgba(92,224,207,1)";
      for (var i = 0; i < specks.length; i++) {
        var k = specks[i];
        k.y -= k.v * dt;
        if (k.y < -6) { k.y = H + 6; k.x = rnd(0, W); }
        ctx.globalAlpha = k.a * (exiting ? 0 : 1);
        ctx.fillRect(k.x, k.y, k.s, k.s);
      }
      ctx.globalAlpha = 1;

      var flash = clamp((t - tAssemble) / 0.7, 0, 1);
      var pulse = t > tAssemble ? 1 + Math.sin(clamp((t - tAssemble) / 0.7, 0, 1) * Math.PI) * 0.06 : 1;
      var pr = clamp(t / (tAssemble + 0.2), 0, 1);
      var shown = Math.floor(pr * 100);
      pct.textContent = shown + "%";
      var fillN = Math.floor(pr * segs.length);
      if (fillN !== filled) {
        for (var z = 0; z < segs.length; z++) segs[z].className = z < fillN ? "on" : "";
        filled = fillN;
      }
      if (t > 1.0) word.classList.add("show");

      for (var c = 0; c < cells.length; c++) {
        var ce = cells[c];
        var lp = clamp((t - ce.dl) / ce.du, 0, 1);
        if (lp <= 0) continue;
        var e = easeOutBack(lp);
        var x = ce.sx + (ce.tx - ce.sx) * e;
        var y = ce.sy + (ce.ty - ce.sy) * e;
        var sc = (ce.ss + (1 - ce.ss) * e) * pulse;
        var rot = ce.sr * (1 - e);
        var al = Math.min(1, lp * 3);
        if (lp >= 1) {
          var tw = 0.94 + 0.06 * Math.sin(t * 3 + ce.tw);
          ctx.fillStyle = "rgb(" + (ce.r * tw | 0) + "," + (ce.g * tw | 0) + "," + (ce.b * tw | 0) + ")";
        } else {
          ctx.fillStyle = "rgb(" + (ce.r | 0) + "," + (ce.g | 0) + "," + (ce.b | 0) + ")";
        }
        if (p > 0) {
          var m = Math.hypot(ce.vx, ce.vy) || 1;
          var push = p * p * far * 0.6;
          x += ce.vx / m * push;
          y += ce.vy / m * push;
          sc *= 1 + p * 0.7;
          al *= 1 - clamp(p * 1.25, 0, 1);
        }
        if (al <= 0.01) continue;
        var sz = (cell - 1.5) * sc;
        ctx.globalAlpha = al;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        if (sz > 6) {
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          ctx.fillRect(-sz / 2, -sz / 2, sz, Math.max(1.5, sz * 0.12));
          ctx.fillRect(-sz / 2, -sz / 2, Math.max(1.5, sz * 0.12), sz);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (flash > 0 && flash < 1) {
        var R = cell * N * (0.5 + 2.4 * flash);
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, "rgba(220,255,250," + (0.55 * (1 - flash)) + ")");
        g.addColorStop(1, "rgba(92,224,207,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }

      if (p >= 1) { finish(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function runReveal() {
    root.classList.add("wipe-run");
    var cv = runWipe("reveal", window.innerWidth / 2, window.innerHeight / 2, 700, null);
    root.classList.remove("wipe-in");
    try { sessionStorage.removeItem("fx-wipe"); } catch (e) { }
    return cv;
  }

  function interceptLinks() {
    var busy = false;
    document.addEventListener("click", function (e) {
      if (busy || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.protocol !== location.protocol || u.host !== location.host) return;
      if (!/(\.html?|\/)$/.test(u.pathname)) return;
      if (u.pathname === location.pathname) return;
      busy = true;
      e.preventDefault();
      try { sessionStorage.setItem("fx-wipe", "1"); } catch (err) { }
      var href = a.href;
      runWipe("cover", e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2, 420, function () {
        location.href = href;
      });
      setTimeout(function () {
        busy = false;
        var w = document.querySelector(".fx-wipe");
        if (w && w.parentNode) w.parentNode.removeChild(w);
      }, 3500);
    });
    window.addEventListener("pageshow", function (ev) {
      if (!ev.persisted) return;
      busy = false;
      var list = document.querySelectorAll(".fx-wipe");
      for (var i = 0; i < list.length; i++) list[i].parentNode.removeChild(list[i]);
    });
  }

  var toastEl = null, toastTimer = null;
  function toast(text) {
    if (!toastEl) {
      toastEl = el("div");
      toastEl.id = "fx-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = "";
    toastEl.appendChild(el("i"));
    toastEl.appendChild(el("span", null, text));
    void toastEl.offsetWidth;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("on"); }, 2200);
  }

  var parts = [];
  var dustCtx = null, dustW = 0, dustH = 0, dustCv = null, dustRunning = false;
  var mouse = { x: -999, y: -999 };

  function burst(x, y, n, power) {
    if (!dustCtx) return;
    for (var i = 0; i < n; i++) {
      var a = rnd(0, Math.PI * 2), sp = rnd(60, 220) * (power || 1);
      parts.push({
        shard: true, x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90,
        s: rnd(3, 7), life: 0, max: rnd(0.55, 1.0), rot: rnd(0, 6.28), vr: rnd(-8, 8), c: Math.random() < 0.3 ? 1 : 0
      });
    }
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    wakeDust();
  }

  function initDust() {
    if (reduce) return;
    dustCv = el("canvas");
    dustCv.id = "fx-dust";
    dustCv.setAttribute("aria-hidden", "true");
    document.body.appendChild(dustCv);
    var s = sizeCanvas(dustCv);
    dustCtx = s.ctx;
    dustW = s.w;
    dustH = s.h;
    var count = clamp(Math.round(dustW / 40), 16, 40);
    for (var i = 0; i < count; i++) {
      parts.push({
        shard: false, x: rnd(0, dustW), y: rnd(0, dustH), vy: -rnd(8, 26), ph: rnd(0, 6.28),
        s: [2, 2, 3, 3, 4][Math.floor(Math.random() * 5)], a: rnd(0.18, 0.6), tw: rnd(0.6, 1.6), c: Math.random() < 0.25 ? 1 : 0, ox: 0, oy: 0
      });
    }
    window.addEventListener("resize", function () {
      var r = sizeCanvas(dustCv);
      dustCtx = r.ctx; dustW = r.w; dustH = r.h;
    });
    var lastSpark = 0;
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      mouse.x = e.clientX; mouse.y = e.clientY;
      var now = performance.now();
      if (now - lastSpark > 55) {
        lastSpark = now;
        parts.push({
          shard: true, x: e.clientX, y: e.clientY, vx: rnd(-30, 30), vy: rnd(-40, 10),
          s: rnd(2, 4), life: 0, max: rnd(0.35, 0.6), rot: 0, vr: 0, c: 0, soft: true
        });
        wakeDust();
      }
    }, { passive: true });
    root.addEventListener("mouseleave", function () { mouse.x = mouse.y = -999; });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) wakeDust(); });
    wakeDust();
  }

  var lastT = 0;
  function wakeDust() {
    if (dustRunning || !dustCtx || document.hidden) return;
    dustRunning = true;
    lastT = 0;
    requestAnimationFrame(dustFrame);
  }
  function dustFrame(now) {
    if (document.hidden) { dustRunning = false; return; }
    var dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;
    var light = isLight();
    var c0 = light ? "20,160,149" : "92,224,207";
    var c1 = light ? "11,111,103" : "163,242,230";
    dustCtx.clearRect(0, 0, dustW, dustH);
    var keep = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.shard) {
        p.life += dt;
        if (p.life >= p.max) continue;
        p.vy += (p.soft ? 40 : 520) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        var k = 1 - p.life / p.max;
        dustCtx.globalAlpha = k * (light ? 0.8 : 0.95);
        dustCtx.fillStyle = "rgb(" + (p.c ? c1 : c0) + ")";
        dustCtx.save();
        dustCtx.translate(p.x, p.y);
        dustCtx.rotate(p.rot);
        dustCtx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        dustCtx.restore();
        keep.push(p);
        continue;
      }
      p.y += p.vy * dt;
      p.ph += dt * p.tw;
      var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 19600) {
        var d = Math.sqrt(d2) || 1, f = (140 - d) / 140;
        p.ox += dx / d * f * 140 * dt;
        p.oy += dy / d * f * 140 * dt;
      }
      p.ox *= 0.96;
      p.oy *= 0.96;
      if (p.y < -10) { p.y = dustH + 10; p.x = rnd(0, dustW); }
      var al = p.a * (0.55 + 0.45 * Math.sin(p.ph));
      dustCtx.globalAlpha = al * (light ? 0.75 : 1);
      dustCtx.fillStyle = "rgb(" + (p.c ? c1 : c0) + ")";
      dustCtx.fillRect(p.x + Math.sin(p.ph) * 10 + p.ox, p.y + p.oy, p.s, p.s);
      keep.push(p);
    }
    dustCtx.globalAlpha = 1;
    parts = keep;
    requestAnimationFrame(dustFrame);
  }

  function initGlow() {
    if (reduce || !fine) return;
    var g = el("div");
    g.id = "fx-glow";
    g.setAttribute("aria-hidden", "true");
    document.body.appendChild(g);
    var x = 0, y = 0, tx = 0, ty = 0, run = false;
    function loop() {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      g.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) requestAnimationFrame(loop);
      else run = false;
    }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      g.classList.add("on");
      if (!run) { run = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { g.classList.remove("on"); });
  }

  function initXp() {
    var box = el("div");
    box.id = "fx-xp";
    box.setAttribute("aria-hidden", "true");
    var lv = el("div", null, "0");
    lv.id = "fx-xp-lv";
    var bar = el("div");
    bar.id = "fx-xp-bar";
    var segs = [];
    for (var i = 0; i < 20; i++) { var s = el("i"); bar.appendChild(s); segs.push(s); }
    box.appendChild(lv);
    box.appendChild(bar);
    document.body.appendChild(box);
    var ticking = false, last = -1;
    function update() {
      ticking = false;
      var max = Math.max(1, root.scrollHeight - window.innerHeight);
      var pr = clamp((window.pageYOffset || root.scrollTop || 0) / max, 0, 1);
      box.classList.toggle("on", pr > 0.004 && max > 240);
      var v = pr * 20, full = Math.floor(v), half = v - full > 0.5;
      var key = full * 2 + (half ? 1 : 0);
      if (key === last) return;
      last = key;
      for (var j = 0; j < segs.length; j++) segs[j].className = j < full ? "f" : (j === full && half ? "h" : "");
      lv.textContent = String(Math.round(pr * 100));
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function initTilt() {
    if (reduce || !fine) return;
    var sel = ".bt, .hq-card, .product-card, .feature-card, .social-card";
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var t = e.target.closest && e.target.closest(sel);
      var prev = document.querySelector(".fx-tilting");
      if (prev && prev !== t) { prev.classList.remove("fx-tilting"); prev.style.removeProperty("--rx"); prev.style.removeProperty("--ry"); }
      if (!t) return;
      var r = t.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      var amp = t.classList.contains("product-card") ? 5 : 7;
      t.style.setProperty("--rx", ((0.5 - py) * amp).toFixed(2) + "deg");
      t.style.setProperty("--ry", ((px - 0.5) * amp).toFixed(2) + "deg");
      t.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      t.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      t.classList.add("fx-tilting");
    }, { passive: true });
    root.addEventListener("mouseleave", function () {
      var prev = document.querySelector(".fx-tilting");
      if (prev) prev.classList.remove("fx-tilting");
    });
  }

  function countUp(node, to, ms) {
    if (reduce) { node.textContent = String(to); return; }
    var t0 = 0;
    function step(now) {
      if (!t0) t0 = now;
      var p = clamp((now - t0) / ms, 0, 1);
      node.textContent = String(Math.round(to * easeOutCubic(p)));
      if (p < 1) requestAnimationFrame(step);
    }
    node.textContent = "0";
    requestAnimationFrame(step);
  }

  function initTimeline() {
    var tl = document.querySelector(".tl");
    if (!tl) return;
    var DAY = 86400000;
    function parse(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
    var s1 = parse(tl.getAttribute("data-s1")), e1 = parse(tl.getAttribute("data-e1")), s2 = parse(tl.getAttribute("data-s2"));
    var d1 = Math.round((e1 - s1) / DAY) + 1;
    var gap = Math.max(1, Math.round((s2 - e1) / DAY) - 1);
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    var d2 = Math.max(1, Math.round((today - s2) / DAY) + 1);
    tl.style.setProperty("--d1", d1);
    tl.style.setProperty("--dg", gap);
    tl.style.setProperty("--d2", d2);
    var n1 = tl.querySelector(".tl-d1"), n2 = tl.querySelector(".tl-d2");
    if (n1) n1.textContent = String(d1);
    if (n2) n2.textContent = String(d2);
    function go() {
      tl.classList.add("is-in");
      if (n1) countUp(n1, d1, 1200);
      if (n2) countUp(n2, d2, 1600);
    }
    if (!("IntersectionObserver" in window)) { go(); return; }
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { io.disconnect(); setTimeout(go, 250); }
    }, { threshold: 0.4 });
    io.observe(tl);
  }

  function initCopy() {
    function copy(value) {
      function fallback() {
        var a = document.createElement("textarea");
        a.value = value;
        a.setAttribute("readonly", "");
        a.style.position = "fixed";
        a.style.opacity = "0";
        document.body.appendChild(a);
        a.select();
        try { document.execCommand("copy"); } catch (e) { }
        document.body.removeChild(a);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).catch(fallback);
      else fallback();
    }
    document.addEventListener("click", function (e) {
      var own = e.target.closest && e.target.closest("[data-fx-copy]");
      var main = e.target.closest && e.target.closest("[data-copy-ip]");
      if (!own && !main) return;
      if (own) copy(own.getAttribute("data-fx-copy"));
      toast("IP скопирован: vanillatech.site");
      burst(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2, 18, 1.2);
    });
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a, button, input, textarea, summary, label, [data-fx-copy], [data-copy-ip]")) return;
      if (e.pointerType === "touch") return;
      burst(e.clientX, e.clientY, 7, 0.8);
    });
  }

  function initKonami() {
    var seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    var pos = 0;
    window.addEventListener("keydown", function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = k === seq[pos] ? pos + 1 : (k === seq[0] ? 1 : 0);
      if (pos === seq.length) {
        pos = 0;
        toast("Секретный блок найден ✦");
        for (var i = 0; i < 14; i++) {
          (function (n) { setTimeout(function () { burst(rnd(0, window.innerWidth), rnd(0, window.innerHeight * 0.5), 10, 1.1); }, n * 90); })(i);
        }
      }
    });
  }

  function initReplay() {
    var host = document.querySelector(".footer-bottom");
    if (!host) return;
    var b = el("button", "fx-replay", "↻ Пересобрать сайт");
    b.type = "button";
    b.addEventListener("click", function () {
      try { localStorage.removeItem("elezium-intro"); } catch (e) { }
      location.href = location.pathname + "?intro";
    });
    host.appendChild(b);
  }

  function ready() {
    safe(setupAsm);
    safe(initTimeline);
    safe(initXp);
    safe(initCopy);
    safe(initKonami);
    safe(initReplay);
    safe(initTilt);
    safe(initGlow);
    safe(initDust);

    var booting = root.classList.contains("boot-on");
    if (booting && !reduce) {
      try { bootIntro(); } catch (e) { root.classList.remove("boot-on", "boot-run"); startAsm(); }
    } else {
      root.classList.remove("boot-on");
      if (root.classList.contains("wipe-in") && !reduce) {
        safe(runReveal);
        setTimeout(startAsm, 260);
      } else {
        root.classList.remove("wipe-in");
        startAsm();
      }
    }
    if (!reduce) safe(interceptLinks);
    setTimeout(function () { if (!asmStarted) startAsm(); }, 10000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
