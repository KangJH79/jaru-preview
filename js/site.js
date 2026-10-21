/* (주)자루서비스 홈페이지 시안 2 — 공용 스크립트
   GSAP·ScrollTrigger·Lenis 가 없으면(인터넷 끊김 등) 움직임 없이 정지 화면으로 보인다. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduce;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ease = function (t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  var lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* 부드러운 스크롤 */
  if (hasGsap && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function goTo(target) {
    var el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -64, duration: 1.2 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href*="#"]');
    if (!a) return;
    var url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === "#") return;
    var el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    closeMenu();
    goTo(el);
    try { history.replaceState(null, "", url.hash); } catch (err) { /* 미리보기 틀 안에서는 막힐 수 있음 */ }
  });

  /* 머리글: 내려가면 숨고 올라오면 보임 · 첫 화면 지나면 배경 */
  var hd = $(".hd"), quick = $(".quick"), mbar = $(".mbar"), lastY = 0;
  function onScroll() {
    var y = window.scrollY || 0;
    if (hd) {
      hd.classList.toggle("is-solid", y > 40);
      if (!document.body.classList.contains("menu-open")) {
        if (y > 160 && y > lastY + 4) hd.classList.add("is-hidden");
        else if (y < lastY - 4 || y < 160) hd.classList.remove("is-hidden");
      }
    }
    var past = y > window.innerHeight * 0.7;
    if (quick) quick.classList.toggle("is-on", past);
    if (mbar) mbar.classList.toggle("is-on", past);
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* 모바일 메뉴 */
  var menuBtn = $(".menu-btn");
  function closeMenu() {
    if (!document.body.classList.contains("menu-open")) return;
    document.body.classList.remove("menu-open");
    if (menuBtn) { menuBtn.setAttribute("aria-expanded", "false"); menuBtn.setAttribute("aria-label", "메뉴 열기"); }
    if (lenis) lenis.start();
    document.documentElement.style.overflow = "";
  }
  if (menuBtn) menuBtn.addEventListener("click", function () {
    var open = !document.body.classList.contains("menu-open");
    if (!open) return closeMenu();
    document.body.classList.add("menu-open");
    menuBtn.setAttribute("aria-expanded", "true");
    menuBtn.setAttribute("aria-label", "메뉴 닫기");
    hd.classList.remove("is-hidden");
    if (lenis) lenis.stop();
    document.documentElement.style.overflow = "hidden";
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMenu(); closeLightbox(); } });

  /* 나타나기 */
  var rvs = $$(".rv");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    rvs.forEach(function (el) { io.observe(el); });
  } else rvs.forEach(function (el) { el.classList.add("in"); });

  /* 화면에 보일 때만 돌리기 */
  function whenVisible(el, on, off, margin) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { on(); return; }
    new IntersectionObserver(function (es) { es.forEach(function (en) { en.isIntersecting ? on() : off(); }); }, { rootMargin: margin || "120px" }).observe(el);
  }

  /* ───── 첫 화면: 영상 + 먼지 ───── */
  var hero = $(".hero");
  if (hero) {
    var vid = $(".hero-video", hero), pauseBtn = $(".hero-pause", hero);
    if (vid) {
      var tall = window.matchMedia("(max-aspect-ratio: 4/5)").matches;
      vid.src = tall ? vid.dataset.tall : vid.dataset.wide;
      var showVid = function () { vid.classList.add("is-on"); };
      vid.addEventListener("playing", showVid, { once: true });
      if (!reduce) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else if (pauseBtn) pauseBtn.setAttribute("data-paused", "1");
      if (pauseBtn) pauseBtn.addEventListener("click", function () {
        if (vid.paused) { vid.play(); showVid(); pauseBtn.setAttribute("aria-label", "배경 영상 일시정지"); pauseBtn.removeAttribute("data-paused"); }
        else { vid.pause(); pauseBtn.setAttribute("aria-label", "배경 영상 재생"); pauseBtn.setAttribute("data-paused", "1"); }
      });
    }
    var dust = $(".dust", hero);
    if (dust && !reduce) heroDust(dust, hero);
    if (hasGsap) {
      gsap.from(".hero-title .line > span", { yPercent: 112, duration: 1.25, stagger: 0.13, ease: "expo.out", delay: 0.1 });
      gsap.from([".eyebrow", ".hero-lead", ".hero-cta", ".hero-trust"], { y: 26, opacity: 0, duration: 1, stagger: 0.09, delay: 0.45, ease: "power3.out" });
      gsap.to(".hero-inner", { yPercent: -14, opacity: 0.25, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".hero-media", { scale: 1.08, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    }
  }

  function heroDust(cv, host) {
    var g = cv.getContext("2d"), W = 0, H = 0, dpr = 1, ps = [], t = 0, run = false, last = 0;
    var mouse = { x: -9999, y: -9999 }, clean = 0;
    var n = window.innerWidth < 700 ? 50 : 120;
    var dot = document.createElement("canvas");
    dot.width = dot.height = 48;
    var dg = dot.getContext("2d"), rg = dg.createRadialGradient(24, 24, 0, 24, 24, 24);
    rg.addColorStop(0, "rgba(235,246,255,1)");
    rg.addColorStop(0.35, "rgba(190,226,250,.55)");
    rg.addColorStop(1, "rgba(124,206,244,0)");
    dg.fillStyle = rg;
    dg.fillRect(0, 0, 48, 48);
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = Math.round(cv.clientWidth * dpr);
      H = cv.height = Math.round(cv.clientHeight * dpr);
    }
    size();
    for (var i = 0; i < n; i++) ps.push({ x: Math.random() * W, y: Math.random() * H, z: 0.25 + Math.random() * 0.75, ph: Math.random() * 6.28, ox: 0, oy: 0 });
    window.addEventListener("resize", size);
    host.addEventListener("pointermove", function (e) { var r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * dpr; mouse.y = (e.clientY - r.top) * dpr; });
    host.addEventListener("pointerleave", function () { mouse.x = mouse.y = -9999; });
    window.addEventListener("scroll", function () { clean = clamp(window.scrollY / (host.offsetHeight * 0.75), 0, 1); }, { passive: true });
    function frame(now) {
      if (!run) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      t += dt;
      g.clearRect(0, 0, W, H);
      var R = 140 * dpr, suck = clean * clean;
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.x += (Math.sin(t * 0.3 + p.ph) * 7 + 5 + suck * 900) * p.z * dt * dpr;
        p.y += (Math.cos(t * 0.23 + p.ph) * 5 - 4 - suck * 520) * p.z * dt * dpr;
        if (p.x > W + 30) p.x = -30; if (p.x < -30) p.x = W + 30;
        if (p.y < -30) p.y = H + 30; if (p.y > H + 30) p.y = -30;
        var dx = p.x + p.ox - mouse.x, dy = p.y + p.oy - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R && d > 0.1) { var f = (1 - d / R) * 26 * dpr; p.ox += dx / d * f * dt * 8; p.oy += dy / d * f * dt * 8; }
        p.ox *= 0.94; p.oy *= 0.94;
        var s = (3 + p.z * 9) * dpr, a = (0.18 + p.z * 0.5) * (1 - clean) * (0.75 + 0.25 * Math.sin(t * 1.3 + p.ph));
        if (a <= 0.01) continue;
        g.globalAlpha = a;
        g.drawImage(dot, p.x + p.ox - s / 2, p.y + p.oy - s / 2, s, s);
      }
      g.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    whenVisible(host, function () { if (!run) { run = true; last = performance.now(); requestAnimationFrame(frame); } }, function () { run = false; }, "0px");
  }

  /* ───── 문장: 스크롤에 따라 단어가 밝아짐 ───── */
  var story = $(".story");
  if (story && hasGsap) {
    var words = [];
    $$("p", story).forEach(function (p) { split(p, words); });
    gsap.fromTo(words, { opacity: 0.14 }, { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: story, start: "top 70%", end: "bottom 55%", scrub: true } });
  }
  function split(node, out) {
    Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
      if (ch.nodeType === 3) {
        var frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          var s = document.createElement("span");
          s.className = "w";
          s.textContent = w;
          frag.appendChild(s);
          out.push(s);
        });
        ch.parentNode.replaceChild(frag, ch);
      } else if (ch.nodeType === 1) split(ch, out);
    });
  }

  /* ───── 숫자 띠: 스퀴지로 닦기 ───── */
  var wipe = $(".wipe");
  var counters = $$("[data-count]");
  function fmt(v, el) { var dec = +(el.dataset.dec || 0); return dec ? v.toFixed(dec) : Math.round(v).toLocaleString("ko-KR"); }
  function setCounts(scope, k) { $$("[data-count]", scope).forEach(function (el) { el.textContent = fmt(+el.dataset.count * k, el); }); }
  if (wipe && hasGsap) {
    wipe.classList.add("is-live");
    var stage = $(".wipe-stage", wipe), dropsBox = $(".drops", wipe), drops = [];
    for (var di = 0; di < 26; di++) {
      var dEl = document.createElement("i");
      dEl.className = "drop";
      var dx = 4 + Math.random() * 92, dy = 6 + Math.random() * 86, ds = 5 + Math.random() * 7;
      dEl.style.left = dx + "%";
      dEl.style.top = dy + "%";
      dEl.style.setProperty("--d", ds + "px");
      dropsBox.appendChild(dEl);
      drops.push({ el: dEl, x: dx });
    }
    setCounts(wipe, 0);
    ScrollTrigger.create({
      trigger: wipe, start: "top top", end: "bottom bottom", scrub: 0.4,
      onUpdate: function (st) {
        var k = st.progress, pos = clamp((k - 0.06) / 0.86, 0, 1) * 112 - 6;
        stage.style.setProperty("--wipe", pos.toFixed(2) + "%");
        setCounts(wipe, ease((k - 0.04) / 0.62));
        for (var i = 0; i < drops.length; i++) {
          var dd = drops[i], behind = pos - dd.x;
          if (behind <= 0) { dd.el.style.opacity = 0; continue; }
          dd.el.style.opacity = clamp(1 - behind / 34, 0, 1).toFixed(2);
          dd.el.style.transform = "translateY(" + (behind * 1.6).toFixed(1) + "px)";
        }
      }
    });
  } else if (counters.length) {
    /* 움직임 없음: 숫자는 처음부터 최종값 */
  }

  /* ───── 11단계 분해 그림 ───── */
  var s11 = $(".s11");
  if (s11 && window.JaruAC) {
    var acCanvas = $("#ac-canvas", s11), ac = new JaruAC(acCanvas, { labels: true });
    var items = $$(".s11-list li", s11), ticks = $$(".s11-ticks i", s11), stepNo = $(".s11-now b", s11), cur = -1;
    /* 넓은 화면: 11단계 이름을 작은 목록으로(지난 단계 ✓ · 지금 단계 강조) */
    var mini = document.createElement("ol");
    mini.className = "s11-mini";
    mini.setAttribute("aria-hidden", "true");
    items.forEach(function (li) {
      var h = li.querySelector("h3").cloneNode(true), opt = h.querySelector(".opt");
      if (opt) opt.textContent = "(선택)";
      var m = document.createElement("li");
      m.textContent = h.textContent.replace(/\s+/g, " ").trim();
      mini.appendChild(m);
    });
    var minis = Array.prototype.slice.call(mini.children);
    $(".s11-list", s11).after(mini);
    var showStep = function (i) {
      if (i === cur) return;
      cur = i;
      items.forEach(function (li, k) { li.classList.toggle("on", k === i); });
      ticks.forEach(function (tk, k) { tk.classList.toggle("on", k < i); tk.classList.toggle("now", k === i); });
      minis.forEach(function (m, k) { m.classList.toggle("done", k < i); m.classList.toggle("now", k === i); });
      if (stepNo) stepNo.textContent = String(i + 1).padStart(2, "0");
    };
    if (hasGsap) {
      s11.classList.add("is-live");
      showStep(0);
      ScrollTrigger.create({
        trigger: $(".s11-track", s11), start: "top top", end: "bottom bottom", scrub: 0.5,
        onUpdate: function (st) { var p = st.progress * 11; ac.set(p); showStep(Math.min(10, Math.floor(p))); }
      });
      whenVisible(acCanvas, function () { ac.start(); }, function () { ac.stop(); });
    } else {
      ac.set(10.6);
    }
  }
  $$("canvas[data-ac-auto]").forEach(function (cv) {
    if (!window.JaruAC) return;
    var a = new JaruAC(cv, { auto: true });
    if (reduce) { a.draw(); return; }
    whenVisible(cv, function () { a.start(); }, function () { a.stop(); });
  });

  /* ───── 작업 전·후 비교 ───── */
  $$("[data-ba]").forEach(function (box) {
    var frame = $(".ba", box), range = $(".ba-range", box), before = $(".ba-before", box), after = $(".ba-after", box), tabs = $$(".ba-tabs button", box);
    var set = function (v) { frame.style.setProperty("--pos", v + "%"); range.value = v; };
    range.addEventListener("input", function () { set(+range.value); });
    tabs.forEach(function (b) {
      b.addEventListener("click", function () {
        tabs.forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        before.src = b.dataset.before; before.alt = b.dataset.altBefore;
        after.src = b.dataset.after; after.alt = b.dataset.altAfter;
        hint();
      });
    });
    var hinted = false;
    function hint() {
      if (reduce || !window.gsap) return set(50);
      var o = { v: +range.value };
      gsap.timeline().to(o, { v: 82, duration: 0.9, ease: "power2.inOut", onUpdate: function () { set(o.v); } })
        .to(o, { v: 22, duration: 1.1, ease: "power2.inOut", onUpdate: function () { set(o.v); } })
        .to(o, { v: 50, duration: 0.8, ease: "power2.inOut", onUpdate: function () { set(o.v); } });
    }
    whenVisible(frame, function () { if (!hinted) { hinted = true; hint(); } }, function () {}, "-20%");
  });

  /* ───── 트럭마운트: 호스가 위층까지 ───── */
  var truck = $(".truck-fig");
  if (truck) {
    var hose = $("#hose", truck), meter = $("[data-meter]", truck), psi = $("[data-psi]"), needle = $(".gauge-needle", truck);
    var L = hose.getTotalLength();
    var paint = function (k) {
      hose.style.strokeDasharray = L;
      hose.style.strokeDashoffset = (L * (1 - k)).toFixed(1);
      if (meter) meter.textContent = Math.round(360 * k);
      if (psi) psi.textContent = (Math.round(3000 * ease(k) / 10) * 10).toLocaleString("ko-KR");
      if (needle) needle.style.transform = "rotate(" + (-120 + 240 * ease(k)) + "deg)";
      var tech = $(".tech", truck);
      if (tech) tech.style.opacity = clamp((k - 0.9) / 0.1, 0, 1);
    };
    if (hasGsap) {
      paint(0);
      ScrollTrigger.create({ trigger: truck, start: "top 78%", end: "bottom 40%", scrub: 0.6, onUpdate: function (st) { paint(st.progress); } });
    } else paint(1);
  }

  /* ───── 현장 영상: 보일 때만 받아서 재생 · 누르면 크게 ───── */
  $$(".reel").forEach(function (card) {
    var v = $("video", card);
    if (!v) return;
    whenVisible(card, function () {
      if (!v.src) v.src = v.dataset.src;
      if (!reduce) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
    }, function () { v.pause(); }, "200px");
    card.addEventListener("click", function () { openLightbox(v.dataset.src, $("h3", card).textContent, card); });
    card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); } });
  });
  var lb = null, lbBack = null;
  function openLightbox(src, cap, from) {
    closeLightbox();
    lbBack = from;
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", cap);
    lb.innerHTML = '<video autoplay muted loop playsinline controls></video><button class="lb-close" aria-label="닫기">✕</button><p class="lb-cap"></p>';
    $("video", lb).src = src;
    $(".lb-cap", lb).textContent = cap;
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-close")) closeLightbox(); });
    document.body.appendChild(lb);
    if (lenis) lenis.stop();
    $(".lb-close", lb).focus();
  }
  function closeLightbox() {
    if (!lb) return;
    lb.remove();
    lb = null;
    if (lenis) lenis.start();
    if (lbBack) lbBack.focus();
  }

  /* ───── 공간별 탭 ───── */
  $$("[data-spaces]").forEach(function (box) {
    var tabs = $$('[role="tab"]', box), panels = $$('[role="tabpanel"]', box);
    function sel(i, focus) {
      tabs.forEach(function (t, k) { t.setAttribute("aria-selected", k === i ? "true" : "false"); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach(function (p, k) { p.hidden = k !== i; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () {
        sel(i);
        var r = panels[i].getBoundingClientRect();     // 휴대폰: 목록 아래 패널이 화면 밖이면 보이게
        if (r.top > window.innerHeight * 0.75) goTo(panels[i]);
      });
      t.addEventListener("keydown", function (e) {
        var k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!k) return;
        e.preventDefault();
        sel((i + k + tabs.length) % tabs.length, true);
      });
    });
  });

  /* ───── 진행 순서 선 ───── */
  var flow = $(".flow4");
  if (flow && hasGsap) {
    var steps = $$("li", flow), line = $(".flow4-line", flow.parentNode);
    ScrollTrigger.create({
      trigger: flow, start: "top 75%", end: "bottom 55%", scrub: 0.4,
      onUpdate: function (st) {
        var k = st.progress;
        line.style.setProperty("--p", k.toFixed(3));
        steps.forEach(function (li, i) { li.classList.toggle("on", k >= i / (steps.length - 1) - 0.02); });
      }
    });
    line.style.setProperty("--p", 0);
  } else if (flow) $$("li", flow).forEach(function (li) { li.classList.add("on"); });

  /* ───── 전체 서비스 줄: 스크롤에 따라 좌우로 ───── */
  if (hasGsap) {
    $$(".krow").forEach(function (row, i) {
      var dir = i % 2 ? 1 : -1;
      gsap.fromTo(row, { xPercent: dir > 0 ? -22 : -4 }, { xPercent: dir > 0 ? -4 : -22, ease: "none", scrollTrigger: { trigger: row.closest("section"), start: "top bottom", end: "bottom top", scrub: true } });
    });
    var mark = $(".ft-mark");
    if (mark) {
      var letters = [];
      mark.textContent.split("").forEach(function (ch) { var s = document.createElement("span"); s.textContent = ch === " " ? " " : ch; letters.push(s); });
      mark.textContent = "";
      letters.forEach(function (s) { mark.appendChild(s); });
      gsap.from(letters, { yPercent: 100, opacity: 0, stagger: 0.04, duration: 1, ease: "expo.out", scrollTrigger: { trigger: mark, start: "top 95%" } });
    }
    $$(".par").forEach(function (el) {
      gsap.fromTo(el, { yPercent: +el.dataset.par || 8 }, { yPercent: -(+el.dataset.par || 8), ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* ───── 견적 요청(3단계) ───── */
  $$(".qf").forEach(function (f) {
    var panes = $$(".pane", f), bar = $(".qf-bar", f), now = $(".qf-top span", f), prev = $(".qf-prev", f), next = $(".qf-next", f), msg = $(".qf-msg", f), i = 0;
    f.classList.add("is-live");
    function show(k) {
      i = k;
      panes.forEach(function (p, n) { p.classList.toggle("on", n === k); });
      bar.style.setProperty("--p", ((k + 1) / panes.length * 100).toFixed(1) + "%");
      now.textContent = (k + 1) + " / " + panes.length;
      prev.hidden = k === 0;
      next.textContent = k === panes.length - 1 ? "무료 견적 요청하기" : "다음";
      msg.textContent = "";
    }
    function check(k) {
      var p = panes[k];
      if (k === 0 && !$$("input[type=checkbox]:checked", p).length) return "필요한 작업을 하나 이상 골라 주세요.";
      var bad = $$("[required]", p).filter(function (el) { return el.type === "checkbox" ? !el.checked : !el.value.trim(); });
      if (bad.length) { bad[0].focus(); return bad[0].dataset.msg || "빈칸을 채워 주세요."; }
      var tel = $("input[type=tel]", p);
      if (tel && tel.value && !/^[0-9\-+\s()]{8,}$/.test(tel.value)) { tel.focus(); return "연락처를 숫자로 적어 주세요. 예) 010-1234-5678"; }
      return "";
    }
    prev.addEventListener("click", function () { show(Math.max(0, i - 1)); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = check(i);
      if (err) { msg.textContent = err; return; }
      if (i < panes.length - 1) { show(i + 1); return; }
      /* 시안: 실제 접수처(메일·문자)는 정식 사이트에서 연결 */
      $(".qf-body", f).hidden = true;
      $(".qf-done", f).hidden = false;
    });
    show(0);
  });

  /* 바닥글 큰 글씨: 글꼴이 늦게 와도 폭에 꼭 맞게 */
  var markEl = $(".ft-mark");
  function fitMark() {
    if (!markEl) return;
    markEl.style.fontSize = "";
    var box = markEl.parentNode.clientWidth - parseFloat(getComputedStyle(markEl.parentNode).paddingLeft) - parseFloat(getComputedStyle(markEl.parentNode).paddingRight);
    var fs = parseFloat(getComputedStyle(markEl).fontSize);
    if (markEl.scrollWidth > 0) markEl.style.fontSize = Math.min(fs * box / markEl.scrollWidth * 0.99, 150) + "px";
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMark); else fitMark();
  window.addEventListener("resize", fitMark);

  if (hasGsap) window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
