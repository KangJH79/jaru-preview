/* 천장형 시스템 에어컨 분해 그림 — 캔버스 2D로 그린다(사진 없이 코드로).
   아래에서 올려다본 등각 투영: 천장 패널의 얼굴(토출구 4개 · 흡입 그릴)이 보인다. 단위 1 = 약 10mm.
   new JaruAC(canvas, { labels: true })  →  .set(p)  p = 0~11(11단계 진행도)
   new JaruAC(canvas, { auto: true })    →  카드용: 분해·조립·시운전을 저절로 되풀이
   .start() / .stop() 으로 그리기 고리를 켜고 끈다(화면 밖에서는 멈춤). */
(function () {
  "use strict";
  var KX = 0.7071068, KY = 0.4082483, KZ = 0.8164966;
  var C = {
    ink: "#0c1422", line: "#7f95ab", soft: "#a9bacb",
    bottom: "#ffffff", sideA: "#e9f0f6", sideB: "#d6e2ec",
    inTop: "#c4d1dd", inA: "#b1c2d2", inB: "#bccad8",
    sky: "#7ccef4", sky2: "#3aa8e6", skyInk: "#0b5f9e",
    dirt: "#8a7a5a", slot: "#2a394d"
  };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mixc(a, b, t, al) {
    var A = hex(a), B = hex(b);
    return "rgba(" + Math.round(mix(A[0], B[0], t)) + "," + Math.round(mix(A[1], B[1], t)) + "," + Math.round(mix(A[2], B[2], t)) + "," + (al == null ? 1 : al) + ")";
  }
  function rgba(h, a) { var c = hex(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* k 단계(1~11) 동안의 세기 — 앞 20% 에 차오르고 끝 15% 에 빠진다 */
  function inStep(p, k) { return clamp((p - (k - 1)) / 0.2, 0, 1) * clamp((k - p) / 0.15, 0, 1); }
  function span(p, a, b) { return ease((p - a) / (b - a)); }

  function JaruAC(canvas, opt) {
    this.c = canvas;
    this.g = canvas.getContext("2d");
    this.o = opt || {};
    this.p = 0;
    this.t = 0;
    this.rot = 0;
    this.on = false;
    this.parts = [];
    this.rand = rng(7);
    var R = rng(11);
    this.specks = [];
    for (var i = 0; i < 120; i++) this.specks.push([R(), R(), R()]);
    this.labelsOn = !!this.o.labels;
    var self = this;
    this.resize();
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(function () { self.resize(); self.draw(); });
      this.ro.observe(canvas);
    }
    this.draw();
  }

  JaruAC.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, this.c.clientWidth), h = Math.max(1, this.c.clientHeight);
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.W = this.c.width;
    this.H = this.c.height;
    var labels = this.labelsOn && w > 380;
    this.showLabels = labels;
    var spanX = labels ? 250 : 160, spanY = 206;
    this.S = Math.min(this.W / spanX, this.H / spanY);
    this.ox = this.W * (labels ? 0.37 : 0.5);
    this.oy = this.H * 0.5 - 37 * this.S;            // 위(본체 윗면 -55) ~ 아래(분해된 패널 130)의 가운데
  };
  /* 분해 정도 ex(0~1) → 부품 높이(z) */
  JaruAC.prototype.zs = function (ex) {
    return { fan: mix(6, -36, ex), fil: mix(-1.6, -74, ex), pan: mix(-3, -112, ex) };
  };

  JaruAC.prototype.P = function (x, y, z) {
    return [this.ox + (y - x) * KX * this.S, this.oy - ((x + y) * KY + z * KZ) * this.S];
  };
  JaruAC.prototype.path = function (pts) {
    var g = this.g;
    g.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var q = this.P(pts[i][0], pts[i][1], pts[i][2]);
      if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]);
    }
    g.closePath();
  };
  JaruAC.prototype.poly = function (pts, fill, stroke, lw) {
    var g = this.g;
    this.path(pts);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = (lw || 1.1) * this.dpr; g.stroke(); }
  };
  JaruAC.prototype.sq = function (a, z) { return [[a, -a, z], [a, a, z], [-a, a, z], [-a, -a, z]]; };
  /* 여러 고리(바깥·안쪽 사각형)를 한 경로로 — evenodd 로 채우면 가운데가 뚫린다 */
  JaruAC.prototype.rings = function (rings, z) {
    var g = this.g;
    g.beginPath();
    for (var r = 0; r < rings.length; r++) {
      for (var i = 0; i < rings[r].length; i++) { var q = this.P(rings[r][i][0], rings[r][i][1], z); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
      g.closePath();
    }
  };
  JaruAC.prototype.line = function (a, b, stroke, lw) {
    var g = this.g, A = this.P(a[0], a[1], a[2]), B = this.P(b[0], b[1], b[2]);
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]);
    g.strokeStyle = stroke; g.lineWidth = (lw || 1) * this.dpr; g.stroke();
  };
  /* 상자: 보이는 면 = +x 옆면 · +y 옆면 · 아랫면 */
  JaruAC.prototype.box = function (x0, x1, y0, y1, z0, z1, fb, fa, fbb, stroke) {
    this.poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], fa, stroke);
    this.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], fbb, stroke);
    this.poly([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], fb, stroke);
  };
  JaruAC.prototype.circle = function (cx, cy, r, z, n) {
    var pts = [];
    n = n || 48;
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); }
    return pts;
  };
  /* 세운 원기둥: 아랫면 + 보이는 옆 띠(-45°~135°) */
  JaruAC.prototype.drum = function (r, z0, z1, side, bottom, stroke) {
    var g = this.g, a, i, top = [], bot = [];
    for (i = 0; i <= 24; i++) { a = (-45 + i * 7.5) * Math.PI / 180; bot.push([r * Math.cos(a), r * Math.sin(a), z0]); top.push([r * Math.cos(a), r * Math.sin(a), z1]); }
    this.poly(bot.concat(top.reverse()), side, stroke);
    this.poly(this.circle(0, 0, r, z0), bottom, stroke);
    return g;
  };

  JaruAC.prototype.set = function (p) {
    this.p = clamp(p, 0, 11);
    if (!this.on) this.draw();
  };
  JaruAC.prototype.start = function () {
    if (this.on) return;
    this.on = true;
    var self = this, last = performance.now();
    function tick(now) {
      if (!self.on) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      self.t += dt;
      self.step(dt);
      self.draw();
      self.raf = requestAnimationFrame(tick);
    }
    this.raf = requestAnimationFrame(tick);
  };
  JaruAC.prototype.stop = function () { this.on = false; if (this.raf) cancelAnimationFrame(this.raf); };

  /* 지금 상태(분해 정도·오염·시운전 등) */
  JaruAC.prototype.state = function () {
    var p = this.p, s = {};
    if (this.o.auto) {
      var k = this.t % 10;
      s.ex = k < 1.6 ? 0 : k < 3 ? ease((k - 1.6) / 1.4) : k < 6 ? 1 : k < 7.4 ? 1 - ease((k - 6) / 1.4) : 0;
      s.run = k < 1.4 || k > 7.6 ? 1 : 0;
      s.dCoil = s.dFan = s.dPanel = 0;
      s.scan = s.sprayA = s.sprayB = s.drain = s.coat = s.wipe = s.outdoor = s.done = 0;
      s.spin = s.ex > 0.98 ? 0.9 : 0;
      return s;
    }
    s.ex = span(p, 1, 1.85) * (1 - span(p, 7.1, 7.95));
    s.run = clamp((p - 9.05) / 0.25, 0, 1);
    s.dCoil = 1 - 0.55 * span(p, 2.1, 2.9) - 0.45 * span(p, 4.1, 4.9);
    s.dFan = 1 - span(p, 4.1, 4.9);
    s.dPanel = 1 - span(p, 6.1, 6.9);
    s.scan = inStep(p, 1);
    s.sprayA = inStep(p, 3);
    s.drain = inStep(p, 4);
    s.sprayB = inStep(p, 5);
    s.coat = inStep(p, 6);
    s.wipe = inStep(p, 7);
    s.outdoor = inStep(p, 9);
    s.done = clamp((p - 10.05) / 0.25, 0, 1);
    s.spin = 0;
    return s;
  };

  /* 물방울·먼지 알갱이 */
  JaruAC.prototype.step = function (dt) {
    var s = this.state(), R = this.rand, i, q;
    this.rot += dt * (s.run * 9 + s.spin);
    var emit = function (self, n, fn) { for (var k = 0; k < n; k++) self.parts.push(fn()); };
    var noz = [this.ox - 112 * this.S, this.oy + 96 * this.S];
    var self = this;
    if (s.sprayA > 0.05 && R() < s.sprayA) {
      emit(this, 3, function () {          // 열교환기 고리 위 아무 곳
        var side = Math.floor(R() * 4), l = mix(-36, 36, R()), w = 33.5;
        var pt = side === 0 ? [w, l] : side === 1 ? [-w, l] : side === 2 ? [l, w] : [l, -w];
        return self.spray(noz, self.P(pt[0], pt[1], 3), R);
      });
    }
    if (s.sprayB > 0.05 && R() < s.sprayB) {
      var z = this.zs(s.ex);
      var tB = R() < 0.6 ? this.P(-4, 4, z.fan) : this.P(-6, 6, z.fil);
      emit(this, 3, function () { return self.spray(noz, tB, R); });
    }
    if (s.scan > 0.2 && R() < 0.35) {
      q = this.P(mix(-60, 60, R()), mix(-60, 60, R()), mix(-30, 6, R()));
      this.parts.push({ k: "dust", x: q[0], y: q[1], vx: (R() - 0.5) * 6 * this.dpr, vy: (R() * 4 + 2) * this.dpr, life: 0, max: 2.6 + R() * 2, r: (0.6 + R() * 1.4) * this.dpr });
    }
    if (s.drain > 0.2 && R() < 0.5) {
      q = this.P(mix(-36, 36, R()), 38 - R() * 4, 3);
      var end = this.P(-30, 38, 2);
      this.parts.push({ k: "water", x: q[0], y: q[1], tx: end[0], ty: end[1], life: 0, max: 1.1 + R() * 0.6, r: (1.2 + R()) * this.dpr });
    }
    for (i = this.parts.length - 1; i >= 0; i--) {
      var p = this.parts[i];
      p.life += dt;
      if (p.life > p.max) { this.parts.splice(i, 1); continue; }
      if (p.k === "water") { var f = p.life / p.max; p.x = mix(p.x, p.tx, f * 0.08); p.y = mix(p.y, p.ty, f * 0.08); }
      else { p.x += p.vx * dt; p.y += p.vy * dt; }
    }
    if (this.parts.length > 420) this.parts.splice(0, this.parts.length - 420);
  };
  JaruAC.prototype.spray = function (noz, tgt, R) {
    var dx = tgt[0] - noz[0], dy = tgt[1] - noz[1], d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + (R() - 0.5) * 0.26, sp = d / (0.45 + R() * 0.25);
    return { k: "spray", x: noz[0], y: noz[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: d / sp * (0.95 + R() * 0.15), r: (1 + R()) * this.dpr };
  };

  JaruAC.prototype.draw = function () {
    var g = this.g, S = this.S, d = this.dpr, s = this.state(), i, a;
    g.clearRect(0, 0, this.W, this.H);
    g.lineJoin = "round";
    g.lineCap = "round";
    var zz = this.zs(s.ex), fanZ = zz.fan, filZ = zz.fil, panZ = zz.pan;

    /* 1) 본체(천장 속) — 반투명 천장 너머로 흐리게 */
    this.poly([[42, -42, 0], [42, 42, 0], [42, 42, 26], [42, -42, 26]], C.sideA, C.soft);
    this.poly([[-42, 42, 0], [42, 42, 0], [42, 42, 26], [-42, 42, 26]], C.sideB, C.soft);
    /* 2) 천장 판(구멍 뚫린 반투명 면 + 600mm 격자) */
    g.save();
    this.path(this.sq(150, 0));
    var hole = this.sq(42, 0).reverse();
    for (i = 0; i < hole.length; i++) { var q = this.P(hole[i][0], hole[i][1], hole[i][2]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
    g.closePath();
    var cg = this.P(0, 0, 0), grad = g.createRadialGradient(cg[0], cg[1], 40 * S, cg[0], cg[1], 150 * S);
    grad.addColorStop(0, "rgba(255,255,255,.78)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fill("evenodd");
    for (var gx = -150; gx <= 150; gx += 60) {
      for (var seg = -150; seg < 150; seg += 10) {
        var m1 = (Math.abs(gx) < 42 && Math.abs(seg + 5) < 42) ? 0 : 1;
        if (!m1) continue;
        var al = clamp(1 - Math.hypot(gx, seg + 5) / 150, 0, 1) * 0.22;
        if (al < 0.01) continue;
        this.line([gx, seg, 0], [gx, seg + 10, 0], "rgba(12,20,34," + al + ")", 1);
        this.line([seg, gx, 0], [seg + 10, gx, 0], "rgba(12,20,34," + al + ")", 1);
      }
    }
    g.restore();
    this.poly(this.sq(42, 0), null, C.line, 1.2);

    /* 3) 천장 구멍 안(본체 속): 안쪽 윗면·벽 → 열교환기(냉각핀) → 모터 */
    g.save();
    this.path(this.sq(42, 0));
    g.clip();
    this.poly(this.sq(42, 26), C.inTop, null);
    this.poly([[-42, -42, 0], [-42, 42, 0], [-42, 42, 26], [-42, -42, 26]], C.inA, C.soft);
    this.poly([[-42, -42, 0], [42, -42, 0], [42, -42, 26], [-42, -42, 26]], C.inB, C.soft);
    var coilFace = mixc("#e6eff6", "#cbbd98", s.dCoil);
    this.poly([[38, -38, 3], [38, 38, 3], [38, 38, 23], [38, -38, 23]], mixc("#dfe9f1", "#c2b58f", s.dCoil), C.soft);
    this.poly([[-38, 38, 3], [38, 38, 3], [38, 38, 23], [-38, 38, 23]], mixc("#d3e0ea", "#b8aa84", s.dCoil), C.soft);
    this.poly([[-29, -29, 3], [-29, 29, 3], [-29, 29, 23], [-29, -29, 23]], mixc("#c9d8e4", "#a99c78", s.dCoil), C.soft);
    this.poly([[-29, -29, 3], [29, -29, 3], [29, -29, 23], [-29, -29, 23]], mixc("#d0dde8", "#b1a37f", s.dCoil), C.soft);
    var ring = [this.sq(38, 3), this.sq(29, 3).reverse()];
    this.rings(ring, 3);
    g.fillStyle = coilFace;
    g.fill("evenodd");
    var finC = mixc("#7f9cb4", "#7a6a4b", s.dCoil, 0.75);
    for (a = -37; a <= 37; a += 2.2) {
      if (Math.abs(a) < 29) {
        this.line([29, a, 3], [38, a, 3], finC, 0.7); this.line([-29, a, 3], [-38, a, 3], finC, 0.7);
        this.line([a, 29, 3], [a, 38, 3], finC, 0.7); this.line([a, -29, 3], [a, -38, 3], finC, 0.7);
      } else {
        this.line([a, 29, 3], [a, 38, 3], finC, 0.7); this.line([a, -29, 3], [a, -38, 3], finC, 0.7);
      }
    }
    if (s.dCoil > 0.02) this.dust(function (u, v) { var side = Math.floor(u * 4), w = mix(29.5, 37.5, v), l = mix(-37, 37, (u * 4) % 1); return side === 0 ? [w, l, 3] : side === 1 ? [-w, l, 3] : side === 2 ? [l, w, 3] : [l, -w, 3]; }, s.dCoil);
    if (s.drain > 0.01) {
      g.save();
      g.globalAlpha = s.drain;
      this.rings(ring, 3);
      g.fillStyle = "rgba(58,168,230,.28)";
      g.fill("evenodd");
      g.restore();
    }
    if (s.coat > 0.01) this.sheen(ring, 3, s.coat, "rgba(124,206,244,.55)");
    this.drum(7, 14, 26, "#b9c7d4", "#d9e3ec", C.soft);
    g.restore();
    this.poly(this.sq(38, 3), null, "rgba(127,149,171,.6)", 0.9);

    /* 4) 송풍팬(터보팬) */
    var fanDirt = s.dFan;
    this.drum(23, fanZ, fanZ + 10, mixc("#e3ebf2", "#cfc3a3", fanDirt), mixc("#d5e0e9", "#bcae8a", fanDirt), C.line);
    var bladeC = mixc("#6f8aa2", "#6e5f42", fanDirt);
    for (i = 0; i < 9; i++) {
      var b0 = this.rot + i * Math.PI * 2 / 9, pts = [];
      for (var rr = 6; rr <= 22; rr += 2) { var aa = b0 + 0.6 * (rr - 6) / 16; pts.push(this.P(rr * Math.cos(aa), rr * Math.sin(aa), fanZ)); }
      g.beginPath();
      for (var j = 0; j < pts.length; j++) { if (j) g.lineTo(pts[j][0], pts[j][1]); else g.moveTo(pts[j][0], pts[j][1]); }
      g.strokeStyle = bladeC;
      g.lineWidth = 1.6 * d;
      g.stroke();
    }
    g.beginPath();
    var o1 = this.circle(0, 0, 23, fanZ, 48), i1 = this.circle(0, 0, 15, fanZ, 40).reverse();
    [o1, i1].forEach(function (pp) { pp.forEach(function (pt, k) { var q = this.P(pt[0], pt[1], pt[2]); if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }, this); g.closePath(); }, this);
    g.fillStyle = mixc("#f6f9fc", "#d8cdb0", fanDirt);
    g.fill("evenodd");
    g.strokeStyle = C.line;
    g.lineWidth = 1 * d;
    g.stroke();
    this.poly(this.circle(0, 0, 4.5, fanZ + 8, 24), "#c3d0dc", C.line, 0.9);
    if (fanDirt > 0.02) this.dust(function (u, v) { var ang = u * Math.PI * 2, rad = mix(15.5, 22.5, v); return [rad * Math.cos(ang), rad * Math.sin(ang), fanZ]; }, fanDirt);

    /* 5) 필터 */
    var fd = s.dFan;
    this.box(-27, 27, -27, 27, filZ, filZ + 1, mixc("#eef7fc", "#cfc4a6", fd), "#d5e1eb", "#c8d6e2", C.line);
    var meshC = mixc("#9cc6e0", "#9d8f6d", fd, 0.55);
    for (a = -25; a <= 25; a += 2.5) { this.line([a, -25, filZ], [a, 25, filZ], meshC, 0.6); this.line([-25, a, filZ], [25, a, filZ], meshC, 0.6); }
    this.poly(this.sq(25, filZ), null, C.line, 0.8);
    if (fd > 0.02) this.dust(function (u, v) { return [mix(-25, 25, u), mix(-25, 25, v), filZ]; }, fd);

    /* 6) 전면 패널 */
    var pd = s.dPanel;
    this.box(-47.5, 47.5, -47.5, 47.5, panZ, panZ + 3, mixc("#ffffff", "#e3dccb", pd * 0.7), C.sideA, C.sideB, C.ink);
    this.poly(this.sq(45, panZ), null, "rgba(12,20,34,.18)", 0.8);
    var slots = [[33.5, 42.5, -31, 31], [-42.5, -33.5, -31, 31], [-31, 31, 33.5, 42.5], [-31, 31, -42.5, -33.5]];
    var open = s.run;
    for (i = 0; i < 4; i++) {
      var sl = slots[i];
      this.poly([[sl[0], sl[2], panZ], [sl[1], sl[2], panZ], [sl[1], sl[3], panZ], [sl[0], sl[3], panZ]], C.slot, C.ink, 0.9);
      var vin = mix(1.6, 3.6, open), vw = mix(5.4, 2.4, open);
      if (i < 2) { var vx0 = (sl[0] + sl[1]) / 2 - vw / 2; this.poly([[vx0, sl[2] + vin, panZ], [vx0 + vw, sl[2] + vin, panZ], [vx0 + vw, sl[3] - vin, panZ], [vx0, sl[3] - vin, panZ]], "#c9d6e2", null); }
      else { var vy0 = (sl[2] + sl[3]) / 2 - vw / 2; this.poly([[sl[0] + vin, vy0, panZ], [sl[1] - vin, vy0, panZ], [sl[1] - vin, vy0 + vw, panZ], [sl[0] + vin, vy0 + vw, panZ]], "#c9d6e2", null); }
    }
    this.poly(this.sq(26, panZ), "#f4f7fa", C.ink, 0.9);
    for (a = -24; a <= 24; a += 3) this.line([a, -24, panZ], [a, 24, panZ], "rgba(12,20,34,.22)", 0.7);
    for (i = 0; i < 4; i++) {
      var sx = i < 2 ? 1 : -1, sy = i % 2 ? 1 : -1;
      this.poly([[sx * 44, sy * 44, panZ], [sx * 46.6, sy * 44, panZ], [sx * 46.6, sy * 46.6, panZ], [sx * 44, sy * 46.6, panZ]], "#e4ebf2", "rgba(12,20,34,.25)", 0.7);
    }
    if (pd > 0.02) this.dust(function (u, v) { return [mix(-46, 46, u), mix(-46, 46, v), panZ]; }, pd * 0.7);
    if (s.scan > 0.01) {
      var u = -47 + ((this.t * 0.55) % 1) * 84;
      g.save();
      this.path(this.sq(47.5, panZ));
      g.clip();
      g.globalAlpha = s.scan;
      this.poly([[u, -47.5, panZ], [u + 12, -47.5, panZ], [u + 12, 47.5, panZ], [u, 47.5, panZ]], "rgba(124,206,244,.38)", null);
      this.line([u + 12, -47.5, panZ], [u + 12, 47.5, panZ], "rgba(11,95,158,.7)", 1.4);
      g.restore();
    }
    if (s.wipe > 0.01) this.sheen([this.sq(47.5, panZ)], panZ, s.wipe, "rgba(255,255,255,.95)");

    /* 7) 바람(시운전) */
    if (s.run > 0.01) this.air(panZ, s.run);
    /* 8) 물방울·먼지 */
    for (i = 0; i < this.parts.length; i++) {
      var pp2 = this.parts[i], f = pp2.life / pp2.max, al2 = Math.sin(Math.PI * clamp(f, 0, 1));
      if (pp2.k === "spray") {
        g.strokeStyle = "rgba(58,168,230," + (0.85 * al2) + ")";
        g.lineWidth = pp2.r;
        g.beginPath(); g.moveTo(pp2.x, pp2.y); g.lineTo(pp2.x - pp2.vx * 0.018, pp2.y - pp2.vy * 0.018); g.stroke();
      } else {
        g.fillStyle = pp2.k === "water" ? "rgba(58,168,230," + (0.8 * al2) + ")" : "rgba(120,108,84," + (0.55 * al2) + ")";
        g.beginPath(); g.arc(pp2.x, pp2.y, pp2.r, 0, Math.PI * 2); g.fill();
      }
    }
    if (s.sprayA > 0.05 || s.sprayB > 0.05) this.nozzle(Math.max(s.sprayA, s.sprayB));
    if (s.coat > 0.05) this.sparkles([[-34, 20, 3], [20, -34, 3], [-10, 34, 3], [34, 8, 3], [-34, -14, 3]], s.coat, 5);
    if (s.wipe > 0.05) this.sparkles([[30, -30, panZ], [-20, 36, panZ], [8, 8, panZ]], s.wipe, 6);
    if (s.outdoor > 0.01) this.outdoor(s.outdoor);
    if (s.done > 0.01) { this.sparkles([[40, -40, panZ], [-44, 30, panZ], [-10, -46, panZ], [46, 20, panZ]], s.done, 7); this.badge(s.done); }
    if (this.showLabels && !this.o.auto) this.labels(s, fanZ, filZ, panZ);
  };

  /* 먼지 점(오염) — fn(u, v) → 3D 점, 미리 정한 자리 */
  JaruAC.prototype.dust = function (fn, amount) {
    var g = this.g, d = this.dpr;
    for (var i = 0; i < this.specks.length; i++) {
      var sp = this.specks[i];
      if (sp[2] > amount) continue;
      var q = fn(sp[0], sp[1]), P = this.P(q[0], q[1], q[2]);
      g.fillStyle = "rgba(110,96,70," + (0.35 + 0.4 * sp[2]) * amount + ")";
      g.beginPath(); g.arc(P[0], P[1], (0.7 + sp[2] * 1.3) * d, 0, Math.PI * 2); g.fill();
    }
  };
  /* 표면 위를 지나가는 빛띠 */
  JaruAC.prototype.sheen = function (rings, z, amount, color) {
    var g = this.g, k = (this.t * 0.7) % 1, u = mix(-70, 70, k);
    g.save();
    this.rings(rings, z);
    g.clip("evenodd");
    var A = this.P(u, u, z), B = this.P(u + 16, u + 16, z), lg = this.g.createLinearGradient(A[0], A[1], B[0], B[1]);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.5, color);
    lg.addColorStop(1, "rgba(255,255,255,0)");
    g.globalAlpha = amount;
    g.fillStyle = lg;
    g.fillRect(0, 0, this.W, this.H);
    g.restore();
  };
  JaruAC.prototype.sparkles = function (pts, amount, size) {
    var g = this.g, d = this.dpr;
    for (var i = 0; i < pts.length; i++) {
      var P = this.P(pts[i][0], pts[i][1], pts[i][2]), tw = 0.5 + 0.5 * Math.sin(this.t * 4 + i * 1.7), s = size * d * (0.6 + 0.6 * tw) * amount;
      g.fillStyle = "rgba(58,168,230," + (0.9 * amount) + ")";
      g.beginPath();
      g.moveTo(P[0], P[1] - s); g.quadraticCurveTo(P[0], P[1], P[0] + s, P[1]); g.quadraticCurveTo(P[0], P[1], P[0], P[1] + s); g.quadraticCurveTo(P[0], P[1], P[0] - s, P[1]); g.quadraticCurveTo(P[0], P[1], P[0], P[1] - s);
      g.fill();
    }
  };
  JaruAC.prototype.nozzle = function (amount) {
    var g = this.g, S = this.S, x = this.ox - 112 * S, y = this.oy + 96 * S, d = this.dpr;
    g.save();
    g.globalAlpha = amount;
    g.translate(x, y);
    g.rotate(-0.72);
    g.fillStyle = C.ink;
    g.beginPath(); g.roundRect ? g.roundRect(-46 * d, -4 * d, 46 * d, 8 * d, 4 * d) : g.rect(-46 * d, -4 * d, 46 * d, 8 * d); g.fill();
    g.fillStyle = C.sky2;
    g.beginPath(); g.moveTo(0, -5 * d); g.lineTo(9 * d, -2.5 * d); g.lineTo(9 * d, 2.5 * d); g.lineTo(0, 5 * d); g.fill();
    g.restore();
  };
  /* 토출구 4곳에서 나가는 바람 — 점선이 흘러간다 */
  JaruAC.prototype.air = function (panZ, amount) {
    var g = this.g, d = this.dpr, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], offs = [-20, 0, 20];
    g.save();
    g.setLineDash([7 * d, 9 * d]);
    g.lineDashOffset = -this.t * 60 * d;
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 3; j++) {
        var dx = dirs[i][0], dy = dirs[i][1], base = dx ? [dx * 38, offs[j], panZ] : [offs[j], dy * 38, panZ];
        g.beginPath();
        for (var k = 0; k <= 14; k++) {
          var t = k / 14, q = this.P(base[0] + dx * 70 * t, base[1] + dy * 70 * t, base[2] - 34 * Math.pow(t, 1.4));
          if (k) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]);
        }
        g.strokeStyle = "rgba(58,168,230," + (0.6 * amount * (j === 1 ? 1 : 0.65)) + ")";
        g.lineWidth = 1.6 * d;
        g.stroke();
      }
    }
    g.restore();
  };
  /* 실외기(선택) — 오른쪽에 정면 그림 */
  JaruAC.prototype.outdoor = function (amount) {
    var g = this.g, S = this.S, d = this.dpr, w = 66 * S, h = 50 * S, x = this.W - w - 14 * S, y = this.oy + 40 * S;
    if (!this.showLabels) { x = this.W - w - 8 * S; y = this.H - h - 10 * S; }
    g.save();
    g.globalAlpha = amount;
    g.translate(0, (1 - amount) * 10 * d);
    g.fillStyle = "#ffffff";
    g.strokeStyle = C.ink;
    g.lineWidth = 1.2 * d;
    g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 4 * d) : g.rect(x, y, w, h); g.fill(); g.stroke();
    var cx = x + w * 0.38, cy = y + h * 0.5, R = h * 0.36;
    for (var i = 1; i <= 4; i++) { g.beginPath(); g.arc(cx, cy, R * i / 4, 0, Math.PI * 2); g.strokeStyle = "rgba(12,20,34,.35)"; g.lineWidth = 0.9 * d; g.stroke(); }
    g.save(); g.translate(cx, cy); g.rotate(this.t * 3);
    for (i = 0; i < 3; i++) { g.rotate(Math.PI * 2 / 3); g.fillStyle = "rgba(58,168,230,.55)"; g.beginPath(); g.ellipse(R * 0.45, 0, R * 0.45, R * 0.16, 0, 0, Math.PI * 2); g.fill(); }
    g.restore();
    for (i = 0; i < 6; i++) { var ly = y + h * 0.2 + i * h * 0.12; g.beginPath(); g.moveTo(x + w * 0.7, ly); g.lineTo(x + w * 0.92, ly); g.strokeStyle = "rgba(12,20,34,.3)"; g.stroke(); }
    var bx = x + w - 4 * S, by = y - 2 * S;
    g.fillStyle = C.sky;
    g.beginPath(); g.arc(bx, by, 9 * S, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 1.8 * d;
    g.beginPath(); g.moveTo(bx - 4 * S, by); g.lineTo(bx - 1 * S, by + 3.4 * S); g.lineTo(bx + 4.6 * S, by - 3.6 * S); g.stroke();
    g.fillStyle = C.ink;
    g.font = "600 " + Math.round(11 * d) + "px 'Noto Sans KR', sans-serif";
    g.fillText("실외기", x, y + h + 16 * d);
    g.restore();
  };
  JaruAC.prototype.badge = function (amount) {
    var g = this.g, S = this.S, d = this.dpr, P = this.P(47, -47, -3), x = P[0] - 4 * S, y = P[1] - 30 * S, r = 13 * S * (0.7 + 0.3 * amount);
    g.save();
    g.globalAlpha = amount;
    g.fillStyle = C.ink;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.sky; g.lineWidth = 2.6 * d;
    g.beginPath(); g.moveTo(x - r * 0.42, y + r * 0.02); g.lineTo(x - r * 0.1, y + r * 0.34); g.lineTo(x + r * 0.46, y - r * 0.32); g.stroke();
    g.restore();
  };
  /* 부품 이름표(분해됐을 때) */
  JaruAC.prototype.labels = function (s, fanZ, filZ, panZ) {
    var g = this.g, d = this.dpr, S = this.S, p = this.p, al = clamp(s.ex * 1.4 - 0.2, 0, 1);
    var items = [
      { t: "열교환기(냉각핀)", a: [-35, 35, 3], hot: p >= 2 && p < 3 || p >= 5 && p < 6 },
      { t: "배수구 · 드레인 팬", a: [-36, 38, 1], hot: p >= 3 && p < 4, only: s.drain },
      { t: "송풍팬(터보팬)", a: [-15, 15, fanZ], hot: p >= 4 && p < 5 },
      { t: "필터", a: [-24, 24, filZ], hot: p >= 4 && p < 5 },
      { t: "전면 패널", a: [-46, 46, panZ], hot: p >= 6 && p < 7 }
    ];
    g.save();
    g.font = "600 " + Math.round(12.5 * d) + "px 'Noto Sans KR', sans-serif";
    g.textBaseline = "middle";
    var widest = 0;
    for (var w = 0; w < items.length; w++) widest = Math.max(widest, g.measureText(items[w].t).width);
    var lx = Math.min(this.ox + 96 * S, this.W - widest - 12 * d);   // 이름표가 오른쪽 끝에서 잘리지 않게
    for (var i = 0; i < items.length; i++) {
      var it = items[i], A = this.P(it.a[0], it.a[1], it.a[2]), a2 = it.only == null ? al : al * it.only;
      if (a2 < 0.01) continue;
      var ly = A[1] + (i === 1 ? 18 * S : 0);
      g.globalAlpha = a2;
      g.strokeStyle = it.hot ? C.skyInk : "rgba(12,20,34,.45)";
      g.lineWidth = (it.hot ? 1.4 : 1) * d;
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(lx - 30 * d, ly); g.lineTo(lx - 8 * d, ly); g.stroke();
      g.fillStyle = it.hot ? C.skyInk : C.ink;
      g.beginPath(); g.arc(A[0], A[1], 2.6 * d, 0, Math.PI * 2); g.fill();
      g.fillText(it.t, lx, ly);
    }
    g.restore();
  };

  window.JaruAC = JaruAC;
})();
