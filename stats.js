/* Gecko Climb usage page for the owner: signs in with the app account and reads usage_summary() (see
   mobile/supabase-analytics.sql), which answers only the owner's confirmed account. Everything else is drawn here. */
"use strict";
(() => {
  const $ = id => document.getElementById(id), cfg = window.GECKO_CLOUD || {};
  const say = (t, cls) => { $("msg").className = "note " + (cls || ""); $("msg").textContent = t; };
  if (!cfg.url || !cfg.anonKey || !window.supabase) return say("A felhő nincs beállítva.", "err");
  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false}});
  const EVENTS = [["climb_send", "Toppolt mászás"], ["climb_try", "Sikertelen próba"], ["line_add", "Új út felvéve"], ["line_edit", "Út szerkesztve"],
    ["line_archive", "Út leszedve"], ["gym_add", "Új terem"], ["undo", "Próba törölve"], ["tab_stats", "Statisztika fül megnyitva"],
    ["tab_account", "Fiók fül megnyitva"], ["signup", "Regisztráció elindítva"], ["signin", "Bejelentkezés"], ["backup_save", "Mentés fájlba"], ["backup_restore", "Mentés visszatöltve"]];
  const BUCKETS = [["0", "Telepítés napján"], ["1", "1 nappal utána"], ["2-7", "2–7 nappal utána"], ["8-30", "8–30 nappal utána"], ["31+", "31+ nappal utána"]];
  let days = 30, data = null;
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); Object.assign(e, attrs); e.append(...kids); return e; };
  const pad = n => String(n).padStart(2, "0"), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;  // local day, like the app

  async function show() {
    const {data: s} = await sb.auth.getSession();
    if (!s.session) { $("login").hidden = false; $("out").hidden = true; return; }
    $("login").hidden = true; say("Betöltés…");
    const {data: r, error} = await sb.rpc("usage_summary", {days: 400});
    if (error) { say(error.message === "not allowed" ? "Ez a fiók nem láthatja a statisztikát." : error.message, "err"); return; }
    data = r; say(""); $("out").hidden = false; draw();
  }
  function draw() {
    $("range").replaceChildren(...[[7, "7 nap"], [30, "30 nap"], [90, "90 nap"]].map(([d, t]) =>
      el("button", {className: "chip" + (d === days ? " on" : ""), textContent: t, onclick: () => { days = d; draw(); }})));
    const since = iso(new Date(Date.now() - (days - 1) * 864e5)), rows = data.rows.filter(r => r.day >= since);
    const sum = (ev, f = () => true) => rows.filter(r => r.event === ev && f(r)).reduce((a, r) => a + r.n, 0);
    const dayList = Array.from({length: days}, (_, i) => iso(new Date(Date.now() - (days - 1 - i) * 864e5)));
    const opens = dayList.map(d => sum("open", r => r.day === d));
    const newAcc = Object.entries(data.accounts_by_day || {}).filter(([d]) => d >= since).reduce((a, [, c]) => a + c, 0);
    const tiles = [[sum("install"), "Új telepítés (első megnyitás)"], [opens[opens.length - 1], "Aktív ma"],
      [(opens.reduce((a, b) => a + b, 0) / days).toFixed(1), "Átlag napi aktív"], [sum("climb_send") + sum("climb_try"), "Rögzített mászás"],
      [sum("climb_send"), "Ebből toppolt"], [sum("line_add"), "Új út"], [newAcc, "Új fiók"], [data.accounts, "Fiók összesen"]];
    $("tiles").replaceChildren(...tiles.map(([v, t]) => el("div", {className: "tile"}, el("b", {textContent: v}), el("span", {textContent: t}))));
    $("dau").replaceChildren(bars(dayList, opens));
    const ret = BUCKETS.map(([b, t]) => [t, sum("open", r => r.bucket === b)]);
    table("ret", ret);
    table("ev", EVENTS.map(([e, t]) => [t, sum(e)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]), "Még nincs adat ebben az időszakban.");
    const pf = {}; rows.filter(r => r.event === "open").forEach(r => pf[r.platform] = (pf[r.platform] || 0) + r.n);
    table("pf", Object.entries(pf).map(([p, n]) => [{android: "Android", ios: "iPhone", web: "Web"}[p] || p, n]), "Még nincs adat.");
  }
  function table(id, list, empty) {
    const max = Math.max(1, ...list.map(x => x[1]));
    $(id).replaceChildren(...(list.length ? list.map(([t, n]) => el("tr", {}, el("td", {}, t, el("div", {className: "bar", style: `width:${n / max * 100}%`})), el("td", {textContent: n})))
      : [el("tr", {}, el("td", {textContent: empty || ""}))]));
  }
  function bars(labels, vals) {  // one bar per day, a light grid line at the top value, hover/tap shows the day and count
    const W = 600, H = 150, pad = 20, max = Math.max(1, ...vals), bw = (W - pad) / vals.length;
    const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H + 18}`);
    const add = (tag, a, text) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; svg.append(e); return e; };
    add("line", {x1: pad, x2: W, y1: 6, y2: 6, stroke: "#433f7a", "stroke-width": 1});
    add("text", {x: 0, y: 10, fill: "#9b95c2", "font-size": 11}, max);
    vals.forEach((v, i) => {
      const h = v / max * (H - 8), x = pad + i * bw;
      const g = add("rect", {x: x + bw * 0.15, y: H - h, width: Math.max(1, bw * 0.7), height: Math.max(h, v ? 2 : 0), rx: Math.min(4, bw * 0.3), fill: "#7cf29a"});
      const hit = add("rect", {x, y: 0, width: bw, height: H, fill: "transparent"});
      const t = document.createElementNS(NS, "title"); t.textContent = `${labels[i]}: ${v}`; hit.append(t); g.append(t.cloneNode(true));
    });
    add("text", {x: pad, y: H + 15, fill: "#9b95c2", "font-size": 11}, labels[0].slice(5));
    add("text", {x: W, y: H + 15, fill: "#9b95c2", "font-size": 11, "text-anchor": "end"}, labels[labels.length - 1].slice(5));
    return svg;
  }
  $("f").addEventListener("submit", async ev => {
    ev.preventDefault(); say("Belépés…");
    const {error} = await sb.auth.signInWithPassword({email: $("em").value.trim(), password: $("pw").value});
    if (error) return say(error.message, "err");
    $("pw").value = ""; show();
  });
  $("out-btn").onclick = async () => { await sb.auth.signOut(); data = null; $("out").hidden = true; show(); };
  show();
})();
