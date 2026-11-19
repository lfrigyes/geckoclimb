/* Gecko Climb usage page for the owner: signs in with the app account and reads usage_summary() (see
   mobile/supabase-analytics.sql), which answers only the owner's confirmed account. Everything else is drawn here. */
"use strict";
(() => {
  const $ = id => document.getElementById(id), cfg = window.GECKO_CLOUD || {};
  const say = (t, cls) => { $("msg").className = "note " + (cls || ""); $("msg").textContent = t; };
  if (!cfg.url || !cfg.anonKey || !window.supabase) return say("A felhő nincs beállítva.", "err");
  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false}});
  const EVENTS = [["climb_send", "Toppolt mászás"], ["climb_try", "Sikertelen próba"], ["line_add", "Új út felvéve"], ["line_edit", "Út szerkesztve"],
    ["line_archive", "Út leszedve"], ["gym_add", "Új terem"], ["undo", "Próba visszavonva / törölve"], ["tab_stats", "Statisztika fül megnyitva"],
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
    const {data: fb} = await sb.rpc("feedback_list");
    data = r; data.feedback = fb || []; say(""); $("out").hidden = false; draw();
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
    feedback(data.feedback || []);
    // 1.0.3 measures: every one a count per band or kind
    const by = (ev, labels, order) => { const m = {}; rows.filter(r => r.event === ev).forEach(r => m[r.bucket] = (m[r.bucket] || 0) + r.n);
      const keys = order || Object.keys(m).sort((a, b) => m[b] - m[a]); return keys.filter(k => m[k]).map(k => [(labels && labels[k]) || k || "–", m[k]]); };
    const NONE = "Még nincs adat (az 1.0.3-tól mérjük).";
    const T = {lt10s: "10 mp alatt", "10-60s": "10–60 mp", "1-5m": "1–5 perc", "5m+": "5 perc felett"}, TO = Object.keys(T);
    table("tabtime", [["wall", "Fal"], ["stats", "Statisztika"], ["account", "Fiók"]].flatMap(([v, n]) => by("time_" + v, T, TO).map(([b, c]) => [`${n}: ${b}`, c])), NONE);
    const SE = {lt1m: "1 perc alatt", "1-5m": "1–5 perc", "5-15m": "5–15 perc", "15-60m": "15–60 perc", "60m+": "1 óra felett"};
    table("sess", by("session", SE, Object.keys(SE)), NONE);
    const SV = {"0": "0 mentés", "1": "1", "2-3": "2–3", "4-7": "4–7", "8-15": "8–15", "16+": "16 vagy több"};
    table("sesssaves", by("session_saves", SV, Object.keys(SV)), NONE);
    table("consent", by("ad_consent"), NONE);
    table("full", by("ad_full", {shown: "Megjelent", not_ready: "Nem töltött be időben", fail: "Megjelenítés hiba", load_fail: "Betöltési hiba"}), NONE);
    table("banner", by("ad_banner", {shown: "Megjelent (indításonként)", fail: "Hiba"}), NONE);
    table("feat", [["filter_open", "Szűrő megnyitva"], ["note_save", "Jegyzet mentve"], ["invite_share", "Meghívókód megosztva"], ["demo_seen", "Minta-statisztikát látta"],
      ["first_try", "Első próba valaha"]].map(([e, t]) => [t, sum(e)]).concat(by("invite_used", {ok: "ok", unknown: "nem létező", self: "saját", already: "már volt", too_old: "régi fiók"}).map(([b, n]) => [`Meghívókód beváltás: ${b}`, n]))
      .concat(by("share_open", {climb: "egy út", day: "egy nap"}).map(([b, n]) => [`Megosztókép megnyitva: ${b}`, n]))
      .concat(by("share_send", {card: "kártya", clear: "átlátszó"}).map(([b, n]) => [`Megosztókép elküldve: ${b}`, n]))
      .concat([["Első próba a minta-statisztika után", sum("first_try", r => r.bucket === "demo")]]).filter(x => x[1] > 0), NONE);
    table("filt", by("filter_use", {sent: "Megmászva", open: "Még nincs meg", new: "Még nem próbált", all: "Mind", grade: "Fokozat", slab: "Lejtő", vertical: "Függőleges",
      overhang: "Túlhajló", boulder: "Boulder", toprope: "Top rope", lead: "Lead", sort_number: "Rendezés: szám", sort_last: "Rendezés: legutóbb mászott",
      sort_added: "Rendezés: legújabb", sort_hard: "Rendezés: legnehezebb", sort_easy: "Rendezés: legkönnyebb", reset: "Alaphelyzet"}), NONE);
    table("skind", by("stat_kind", {all: "Minden típus", boulder: "Boulder", toprope: "Top rope", lead: "Lead"}), NONE);
    const opened = sum("climb_open"), savedN = sum("climb_try", r => r.bucket) + sum("climb_send", r => r.bucket);
    table("funnel", opened ? [["Mászóképernyő megnyitva", opened], ["Ebből mentve", savedN], ["Mentés nélkül bezárva", Math.max(0, opened - savedN)],
      ["Visszavonás a felugró sávból", Math.max(0, sum("undo") - sum("try_delete"))], ["Próba törölve a listából", sum("try_delete")]] : [], NONE);
    table("errs", by("js_error").map(([b, n]) => [`Hiba: ${b}`, n]).concat(sum("sync_fail") ? [["Felhő-szinkron sikertelen", sum("sync_fail")]] : []), "Nincs hiba. 🎉");
    table("start", by("start", {lt1s: "1 mp alatt", "1-2s": "1–2 mp", "2-4s": "2–4 mp", "4s+": "4 mp felett"}, ["lt1s", "1-2s", "2-4s", "4s+"]), NONE);
    table("lang", by("lang", {hu: "Magyar", en: "Angol"}), NONE);
    const K = {boulder: "Boulder", toprope: "Top rope", lead: "Lead"};
    table("kinds", Object.keys(K).map(k => [K[k], sum("climb_try", r => r.bucket === k) + sum("climb_send", r => r.bucket === k)]).filter(x => x[1] > 0), NONE);
  }
  function feedback(list) {  // the tester survey: averages on top, then every answer
    const avg = k => { const v = list.map(x => x[k]).filter(x => x != null); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "–"; };
    const rec = list.map(x => x.recommend).filter(x => x != null), nps = rec.length ? Math.round(100 * (rec.filter(x => x >= 9).length - rec.filter(x => x <= 6).length) / rec.length) : "–";
    const keep = list.filter(x => x.keep === "yes").length;
    $("fbtiles").replaceChildren(...[[list.length, "Válasz"], [avg("rating") + " ★", "Átlag értékelés"], [nps, "Ajánlási pont (NPS)"], [`${keep}/${list.length}`, "Használná tovább"]]
      .map(([v, t]) => el("div", {className: "tile"}, el("b", {textContent: v}), el("span", {textContent: t}))));
    const L = {wall: "falra rögzítés", climb: "mászóképernyő", stats: "statisztika", muscle: "izomterhelés", account: "fiók", filter: "szűrés", notes: "jegyzet"};
    $("fblist").replaceChildren(...(list.length ? list.map(x => el("div", {className: "fb"},
      el("div", {className: "note", textContent: `${(x.created_at || "").slice(0, 10)} · ${"★".repeat(x.rating)} · ajánlás ${x.recommend ?? "–"}/10 · tovább: ${({yes: "igen", maybe: "talán", no: "nem"})[x.keep] || "–"}${x.name ? " · " + x.name : ""}`}),
      el("p", {}, el("b", {textContent: "+ "}), x.strength), el("p", {}, el("b", {textContent: "− ", style: "color:var(--warn)"}), x.weakness),
      x.bug === "yes" ? el("p", {className: "err", textContent: "Hiba: " + (x.bug_note || "(nem írta le)")}) : "",
      x.other ? el("p", {textContent: "Más: " + x.other}) : "",
      el("div", {className: "note", textContent: [(x.used || []).map(u => L[u] || u).join(", "), (x.kinds || []).join(", "), ({lt1: "ritkábban mint hetente", "1": "heti 1", "2-3": "heti 2–3", "4+": "heti 4+"})[x.freq] || ""].filter(Boolean).join(" · ")})))
      : [el("p", {className: "note", textContent: "Még nincs válasz."})]));
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
