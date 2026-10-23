/* Portfolio interactions: theme, nav, hero viz, project grid, reveals, forms. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme: light / dark / system + localStorage ---------- */
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  function applyTheme(choice) {
    const resolved = choice === "system" ? (mq.matches ? "dark" : "light") : choice;
    root.setAttribute("data-theme", resolved);
    $$(".theme-seg button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.theme === choice))
    );
    try { localStorage.setItem("mwangala-theme", choice); } catch (e) {}
    drawViz(true);
  }
  let saved = "system";
  try { saved = localStorage.getItem("mwangala-theme") || "system"; } catch (e) {}
  $$(".theme-seg button").forEach((b) =>
    b.addEventListener("click", () => applyTheme(b.dataset.theme))
  );
  if (mq.addEventListener) mq.addEventListener("change", () => {
    let c = "system";
    try { c = localStorage.getItem("mwangala-theme") || "system"; } catch (e) {}
    if (c === "system") applyTheme("system");
  });
  applyTheme(saved);

  /* ---------- Nav ---------- */
  const nav = $(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", window.scrollY > 12);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const burger = $(".burger"), menu = $(".mobile-menu");
  if (burger && menu) {
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    $$("a", menu).forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));
  }

  /* ---------- GitHub links (never fake) ---------- */
  $$("[data-github-link]").forEach((a) => {
    if (SITE.github) { a.href = SITE.github; a.style.display = ""; }
    else { a.style.display = "none"; }
  });
  $$("[data-github-missing]").forEach((el) => {
    el.style.display = SITE.github ? "none" : "";
  });

  /* ---------- Hero visualisation: Python → Software → Security → Data → Engineering ---------- */
  const canvas = $("#heroViz");
  let mouse = { x: 0.5, y: 0.5 };
  function drawViz(redraw) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = canvas.clientWidth * 2);
    const H = (canvas.height = canvas.clientHeight * 2);
    const dark = root.getAttribute("data-theme") === "dark";
    const nodes = [
      { label: "Python", x: 0.12, y: 0.5 }, { label: "Software", x: 0.31, y: 0.28 },
      { label: "Security", x: 0.5, y: 0.55 }, { label: "Data", x: 0.69, y: 0.3 },
      { label: "Engineering", x: 0.88, y: 0.52 },
    ];
    const links = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 2], [2, 4]];
    const t = Date.now() / 1000;
    const px = (n) => n.x * W + (mouse.x - 0.5) * 22 * (n.y);
    const py = (n, i) => n.y * H + (reduceMotion ? 0 : Math.sin(t * 0.9 + i * 1.3) * 7);
    ctx.clearRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = dark ? "rgba(148,163,184,.08)" : "rgba(15,23,42,.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // links
    links.forEach(([a, b], li) => {
      const A = nodes[a], B = nodes[b];
      const pulse = reduceMotion ? 0.6 : 0.45 + 0.25 * Math.sin(t * 1.6 + li);
      ctx.strokeStyle = dark ? `rgba(96,165,250,${pulse})` : `rgba(37,99,235,${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(px(A), py(A, a)); ctx.lineTo(px(B), py(B, b)); ctx.stroke();
      if (!reduceMotion) { // travelling packet
        const k = (t * 0.25 + li * 0.19) % 1;
        const cx = px(A) + (px(B) - px(A)) * k, cy = py(A, a) + (py(B) - py(A, a)) * k;
        ctx.fillStyle = dark ? "#93c5fd" : "#2563eb";
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
      }
    });
    // nodes
    nodes.forEach((n, i) => {
      const x = px(n), y = py(n, i);
      const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
      if (dark) { g.addColorStop(0, "rgba(96,165,250,.5)"); g.addColorStop(1, "rgba(96,165,250,0)"); }
      else { g.addColorStop(0, "rgba(37,99,235,.28)"); g.addColorStop(1, "rgba(37,99,235,0)"); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 46, 0, 7); ctx.fill();
      ctx.fillStyle = dark ? "#0b1220" : "#fff";
      ctx.strokeStyle = dark ? "#60a5fa" : "#2563eb"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark ? "#e8eef8" : "#0f172a";
      ctx.font = "700 21px " + getComputedStyle(document.body).fontFamily;
      ctx.textAlign = "center";
      ctx.fillText(n.label, x, y + 44);
    });
    if (!reduceMotion && !redraw) requestAnimationFrame(() => drawViz(false));
  }
  if (canvas) {
    canvas.closest(".viz-card").addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    });
    window.addEventListener("resize", () => drawViz(true));
    drawViz(false);
  }

  /* ---------- Project cards (rendered from central config) ---------- */
  function thumbMock(p) {
    if (p.theme === "dark") {
      return `<div class="thumb-mock">
        <div><span class="sev high">HIGH</span> repeated failures · 10.0.4.21</div>
        <div><span class="sev med">MED</span> ${p.id === "fileguard" ? "baseline drift · 2 files" : p.id === "dependsecure" ? "advisory match · 1 pkg" : "multi-user failures"}</div>
        <div><span class="sev low">LOW</span> ${p.id === "sentinelcore" ? "correlated · incident #3" : "anomaly scored · 0.31"}</div>
        <div class="bar"><i style="width:${p.featured ? 86 : 62}%"></i></div></div>`;
    }
    if (p.id === "campusflow") {
      return `<div class="thumb-mock"><div><b>Students</b> 248 · <b>Courses</b> 36</div>
        <div>Enrolments ▓▓▓▓▓▓▓░░ 1,204</div><div>Results published · Sem 2</div>
        <div class="bar"><i style="width:74%"></i></div></div>`;
    }
    if (p.id === "chessscope") {
      return `<div class="thumb-mock"><div style="font-size:1rem;letter-spacing:2px">♜♞♝♛♚♝♞♜</div>
        <div>W 12 · D 5 · L 7 · 24 games</div><div>Top: Sicilian 58% · QGD 52%</div></div>`;
    }
    return `<div class="thumb-mock"><div class="mono">V = I × R = 12.0 V</div>
      <div>P = V × I = 24.0 W</div><div>R<sub>∥</sub> = 66.7 Ω · steps shown</div>
      <div class="bar"><i style="width:68%"></i></div></div>`;
  }
  function cardHTML(p, i) {
    const src = p.githubUrl
      ? `<a class="btn btn-ghost btn-sm" href="${p.githubUrl}" target="_blank" rel="noopener">Source</a>`
      : `<span class="unavail" title="Repository URL not yet configured">Source Unavailable</span>`;
    const demo = p.liveDemoUrl
      ? `<a class="btn btn-primary btn-sm" href="${p.liveDemoUrl}">Live Demo</a>`
      : `<span class="unavail">Live Demo Unavailable</span>`;
    return `<article class="card reveal${p.featured ? " featured" : ""}" style="transition-delay:${(i % 3) * 70}ms" data-filters="${p.filters.join(" ")}">
      <div class="thumb ${p.theme}" aria-hidden="true">${p.featured ? '<span class="flag" style="position:absolute;top:12px;left:12px;z-index:2">Flagship Project</span>' : ""}${thumbMock(p)}</div>
      <div class="card-body">
        <span class="card-cat">${p.category}</span>
        <h3>${p.name} <span class="muted" style="font-weight:500;font-size:.95rem">— ${p.tagline}</span></h3>
        <p>${p.description}</p>
        <div class="tech" aria-label="Technology stack">${p.technologies.slice(0, 5).map((t) => `<span>${t}</span>`).join("")}</div>
        <div class="card-meta"><span class="status-ok">● ${p.status}</span><span>${p.difficulty}</span></div>
        <div class="card-actions">${demo}<a class="btn btn-ghost btn-sm" href="${p.caseStudyUrl}">Case Study</a>${src}</div>
      </div></article>`;
  }
  const grid = $("#projectGrid");
  if (grid && typeof PROJECTS !== "undefined") {
    const order = [...PROJECTS].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    grid.innerHTML = order.map(cardHTML).join("");
    $$(".filters button").forEach((btn) => btn.addEventListener("click", () => {
      $$(".filters button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      const f = btn.dataset.filter;
      $$(".card", grid).forEach((c) => {
        const show = f === "all" || c.dataset.filters.split(" ").includes(f);
        c.style.display = show ? "" : "none";
        if (show) { c.classList.remove("in"); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("in"))); }
      });
    }));
  }

  /* ---------- GitHub section (manual config, no fake stats) ---------- */
  const ghGrid = $("#ghGrid");
  if (ghGrid && typeof PROJECTS !== "undefined") {
    ghGrid.innerHTML = PROJECTS.slice(0, 4).map((p) => `
      <div class="gh-card"><h3>${p.name}</h3>
        <p class="small muted" style="margin:0 0 8px">${p.tagline}</p>
        <p class="lang">Python · ${p.technologies.slice(1, 3).join(" · ")}</p>
        <p style="margin:10px 0 0;display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn btn-ghost btn-sm" href="${p.caseStudyUrl}">Case Study</a>
          ${p.githubUrl ? `<a class="btn btn-ghost btn-sm" href="${p.githubUrl}" target="_blank" rel="noopener">Repository</a>` : `<span class="unavail">Source Unavailable</span>`}
        </p></div>`).join("");
  }

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Footer year / contact form ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  const form = $("#contactForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#cfName").value.trim(), email = $("#cfEmail").value.trim(), msg = $("#cfMsg").value.trim();
      let ok = true;
      const set = (id, m) => { $(id).textContent = m || ""; if (m) ok = false; };
      set("#eName", name.length < 2 ? "Please enter your name." : "");
      set("#eEmail", /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? "" : "Please enter a valid email.");
      set("#eMsg", msg.length < 10 ? "Please write at least a sentence." : "");
      const done = $("#cfDone");
      if (!ok) { done.hidden = true; return; }
      try {
        const box = JSON.parse(localStorage.getItem("mwangala-outbox") || "[]");
        box.push({ name, email, msg: msg.slice(0, 2000), at: new Date().toISOString() });
        localStorage.setItem("mwangala-outbox", JSON.stringify(box));
      } catch (err) {}
      done.hidden = false;
      done.textContent = SITE.email
        ? "Thanks " + name.split(" ")[0] + " — your message is ready. Email me directly at " + SITE.email + "."
        : "Thanks " + name.split(" ")[0] + " — demo form validated locally. The site owner will wire a real inbox (email in js/projects.js) before launch.";
      form.reset();
    });
  }
})();
