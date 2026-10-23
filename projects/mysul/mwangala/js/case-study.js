/* Reusable case-study renderer. Each /projects/<slug>/ page sets data-slug
   and this script renders every section from the central PROJECTS config. */
(function () {
  "use strict";
  const slug = document.body.dataset.slug;
  const p = (typeof PROJECTS !== "undefined" && PROJECTS.find((x) => x.slug === slug)) || null;
  // theme init (shared choice with portfolio home)
  try {
    const c = localStorage.getItem("mwangala-theme") || "system";
    const dark = c === "dark" || (c === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) { document.documentElement.setAttribute("data-theme", "light"); }
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  document.querySelectorAll(".theme-seg button").forEach((b) =>
    b.addEventListener("click", () => {
      try { localStorage.setItem("mwangala-theme", b.dataset.theme); } catch (e) {}
      location.reload();
    })
  );
  const burger = document.querySelector(".burger"), menu = document.querySelector(".mobile-menu");
  if (burger && menu) burger.addEventListener("click", () => menu.classList.toggle("open"));

  const host = document.getElementById("caseStudy");
  if (!host) return;
  if (!p) {
    host.innerHTML = `<div class="wrap prose"><h1>Project not found</h1>
      <p>Invalid project data. <a href="../../">Back to portfolio</a>.</p></div>`;
    return;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const li = (arr) => (arr || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const demo = p.liveDemoUrl
    ? `<a class="btn btn-primary" href="../../${p.liveDemoUrl}">Open Live Demo</a>`
    : `<span class="unavail">Live Demo Unavailable</span>`;
  const src = p.githubUrl
    ? `<a class="btn btn-ghost" href="${p.githubUrl}" target="_blank" rel="noopener">Source Code</a>`
    : `<span class="unavail">Source Code Unavailable</span>`;
  const thumb = p.theme === "dark"
    ? `<div class="thumb dark cs-thumb"><div class="thumb-mock"><div><span class="sev high">HIGH</span> detection · evidence attached</div><div><span class="sev med">MED</span> under investigation</div><div><span class="sev low">LOW</span> informational</div><div class="bar"><i style="width:72%"></i></div></div></div>`
    : `<div class="thumb light cs-thumb"><div class="thumb-mock"><div><b>${esc(p.name)}</b> · working demo</div><div>Transparent steps · validated inputs</div><div class="bar"><i style="width:66%"></i></div></div></div>`;
  host.innerHTML = `
  <div class="wrap">
    <p class="small"><a href="../../">← All projects</a></p>
    <span class="eyebrow">${esc(p.category)}</span>
    <h1>${esc(p.name)} <span class="muted" style="font-weight:500;font-size:1.4rem">— ${esc(p.tagline)}</span></h1>
    <p class="lede">${esc(p.description)}</p>
    <p class="small muted">Status: <b class="status-ok">${esc(p.status)}</b> · ${esc(p.difficulty)} · ${esc(p.technologies.join(" · "))}</p>
    <div class="btn-row">${demo}${src}</div>
    ${thumb}
    <div class="prose">
      <h2>Problem</h2><p>${esc(p.problem)}</p>
      <h2>Objective</h2><p>${esc(p.objective)}</p>
      <h2>Solution</h2><p>${esc(p.solution)}</p>
      <h2>Key features</h2><ul>${li(p.features)}</ul>
      <h2>Architecture</h2>
      <div class="arch"><ol>${(p.architecture || []).map((a) => `<li>${esc(a)}</li><li class="a">↓</li>`).join("").replace(/<li class="a">↓<\/li>$/, "")}</ol></div>
      <h2>Technology stack</h2>
      <div class="stack-grid">${(p.techStack || []).map((t) => `<div><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></div>`).join("")}</div>
      <h2>Engineering decisions</h2><ul>${li(p.decisions)}</ul>
      <h2>Security</h2><ul>${li(p.security)}</ul>
      <h2>Testing</h2><ul>${li(p.testing)}</ul>
      <h2>Challenges</h2><ul>${li(p.challenges)}</ul>
      <h2>Lessons learned</h2><ul>${li(p.lessons)}</ul>
      <h2>Future improvements</h2><ul>${li(p.future)}</ul>
      <div class="backrow">${demo}${src}<a class="btn btn-ghost" href="../../#projects">Back to Projects</a></div>
    </div>
  </div>`;
  document.title = `${p.name} — ${p.tagline} | Mwangala`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", `${p.name} (${p.tagline}) — ${p.description}`);
})();
