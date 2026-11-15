/* Gecko Climb: tester feedback form, in Hungarian and English (the phone's language picks the start; HU / EN switches it).
   Adds one row to "app_feedback" with the public key (insert only; see mobile/supabase-feedback.sql). No email or id is
   stored; the name is optional and only for a reply. About 3 minutes: one star rating, one strength, one weakness,
   and a few taps. */
"use strict";
(() => {
  const $ = id => document.getElementById(id), cfg = window.GECKO_CLOUD || {};
  const T = {
    hu: {
      title: "Gecko Climb – Visszajelzés", h1: "Milyen volt a Gecko Climb?",
      lead: "A teszt a végéhez ért. Pár kérdés, hogy tudjam, mit csináljak jobban, mielőtt az app mindenkinek elérhető lesz.",
      time: "⏱ kb. 3 perc", multi: "(több is lehet)", optional: "(nem kötelező)",
      q1: "Összességében mennyire tetszik az app?",
      q2: "Egy dolog, ami az app erőssége", h2: "Mi az, amiért megérte használni? Egy mondat is elég.", ph2: "pl. gyorsan rögzítem vele a mászást",
      q3: "Egy dolog, ami a gyengesége", h3: "Mi zavart, mi hiányzott, vagy mit csinálnál másképp?", ph3: "pl. nehéz megtalálni egy régi utat",
      q4: "Mit használtál a legtöbbet?",
      u_wall: "Utak felvétele a falra", u_climb: "Mászóképernyő (a gekkó)", u_stats: "Statisztika", u_muscle: "Izomterhelés", u_account: "Fiók, szinkron", u_filter: "Szűrés, rendezés", u_notes: "Jegyzetek",
      q5: "Futottál bele hibába vagy elakadásba?", b_no: "Nem", b_yes: "Igen", ph5: "Mi történt? Melyik képernyőn?",
      q6: "Mennyire valószínű, hogy ajánlanád egy mászó barátodnak?", e0: "egyáltalán nem", e10: "biztosan",
      q7: "Használnád tovább a teszt után is?", k_yes: "Igen", k_maybe: "Talán", k_no: "Nem",
      q8: "Mit mászol?", q9: "Milyen gyakran mászol?", f_lt1: "Ritkábban, mint hetente", f_1: "Heti 1", "f_2-3": "Heti 2–3", "f_4+": "Heti 4+",
      q10: "Bármi más, amit elmondanál", ph10: "ötlet, kérés, bármi",
      q11: "A neved, ha szeretnéd, hogy visszaírjak", ph11: "pl. Anna",
      go: "Küldés", anon: "Névtelen: az e-mail-címed nem kerül tárolásra, csak a válaszaid.", privacy: "Adatvédelem",
      need1: "Kérlek, adj egy csillagos értékelést.", need2: "Kérlek, írj egy erősséget és egy gyengeséget (egy mondat is elég).",
      saving: "Küldés…", fail: "Hiba történt. Próbáld újra egy perc múlva.", off: "A kérdőív most nem érhető el. Nézz vissza hamarosan.",
      thx1: "Köszönöm! 🦎", thx2: "Megkaptam a válaszaidat. Sokat segítesz vele, hogy a Gecko Climb jobb legyen, mire mindenki letöltheti."
    },
    en: {
      title: "Gecko Climb – Feedback", h1: "How was Gecko Climb?",
      lead: "The test is coming to an end. A few questions so I know what to improve before the app is out for everyone.",
      time: "⏱ about 3 minutes", multi: "(pick any)", optional: "(optional)",
      q1: "Overall, how much do you like the app?",
      q2: "One thing that is a strength of the app", h2: "What made it worth using? One sentence is plenty.", ph2: "e.g. logging a climb is quick",
      q3: "One thing that is a weakness", h3: "What bothered you, what was missing, or what would you do differently?", ph3: "e.g. hard to find an old line",
      q4: "What did you use the most?",
      u_wall: "Adding lines to the wall", u_climb: "Climb screen (the gecko)", u_stats: "Stats", u_muscle: "Muscle load", u_account: "Account, sync", u_filter: "Filter, sort", u_notes: "Notes",
      q5: "Did you run into a bug or get stuck?", b_no: "No", b_yes: "Yes", ph5: "What happened? On which screen?",
      q6: "How likely are you to recommend it to a climbing friend?", e0: "not at all", e10: "definitely",
      q7: "Would you keep using it after the test?", k_yes: "Yes", k_maybe: "Maybe", k_no: "No",
      q8: "What do you climb?", q9: "How often do you climb?", f_lt1: "Less than weekly", f_1: "Once a week", "f_2-3": "2–3 times a week", "f_4+": "4+ times a week",
      q10: "Anything else you would like to tell me", ph10: "an idea, a wish, anything",
      q11: "Your name, if you would like a reply", ph11: "e.g. Anna",
      go: "Send", anon: "Anonymous: your email is not stored, only your answers.", privacy: "Privacy",
      need1: "Please give a star rating.", need2: "Please write one strength and one weakness (one sentence is enough).",
      saving: "Sending…", fail: "Something went wrong. Please try again in a minute.", off: "The form is not available right now. Please check back soon.",
      thx1: "Thank you! 🦎", thx2: "Your answers are in. They help a lot to make Gecko Climb better before everyone can download it."
    }
  };
  const guess = () => /^hu/i.test(navigator.language || "") ? "hu" : "en";
  let lang = guess();
  try { lang = localStorage.getItem("lang") || lang; } catch (e) { /* no storage: the phone's language */ }
  const t = k => T[lang][k];
  const A = {rating: null, used: [], bug: null, recommend: null, keep: null, kinds: [], freq: null};

  // a row of tap buttons; multi = several can be on
  function opts(id, values, label, multi) {
    $(id).replaceChildren(...values.map(v => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = label(v);
      const on = multi ? A[id].includes(v) : A[id] === v;
      b.className = on ? "on" : ""; b.setAttribute("aria-pressed", on);
      b.onclick = () => {
        if (multi) A[id] = A[id].includes(v) ? A[id].filter(x => x !== v) : [...A[id], v]; else A[id] = v;
        if (id === "bug") $("bug_note").hidden = v !== "yes";
        draw();
      };
      return b;
    }));
  }
  function draw() {
    opts("rating", [1, 2, 3, 4, 5], v => `${v} ★`, false);
    opts("used", ["wall", "climb", "stats", "muscle", "account", "filter", "notes"], v => t("u_" + v), true);
    opts("bug", ["no", "yes"], v => t("b_" + v), false);
    opts("recommend", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], v => String(v), false);
    opts("keep", ["yes", "maybe", "no"], v => t("k_" + v), false);
    opts("kinds", ["boulder", "toprope", "lead"], v => ({boulder: "Boulder", toprope: "Top rope", lead: "Lead"})[v], true);
    opts("freq", ["lt1", "1", "2-3", "4+"], v => t("f_" + v), false);
  }
  const say = (k, cls) => { $("msg").className = "msg " + (cls || ""); $("msg").textContent = k ? t(k) : ""; $("msg").dataset.k = k || ""; };
  function apply() {
    document.documentElement.lang = lang; document.title = t("title");
    document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll("[data-ph]").forEach(el => { el.placeholder = t(el.dataset.ph); });
    document.querySelectorAll(".lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
    if ($("msg").dataset.k) $("msg").textContent = t($("msg").dataset.k);
    draw();
  }
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
    lang = b.dataset.lang; try { localStorage.setItem("lang", lang); } catch (e) { /* fine */ } apply();
  }));
  apply();
  if (!cfg.url || !cfg.anonKey || !window.supabase) { say("off", "err"); $("go").disabled = true; return; }
  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
  $("go").addEventListener("click", async () => {
    if ($("website").value) { $("form").hidden = true; $("done").hidden = false; return; }  // the hidden field is for bots
    const strength = $("strength").value.trim(), weakness = $("weakness").value.trim();
    if (!A.rating) { say("need1", "err"); $("rating").scrollIntoView({block: "center", behavior: "smooth"}); return; }
    if (strength.length < 2 || weakness.length < 2) { say("need2", "err"); $(strength.length < 2 ? "strength" : "weakness").focus(); return; }
    $("go").disabled = true; say("saving");
    const row = {lang, rating: A.rating, strength: strength.slice(0, 800), weakness: weakness.slice(0, 800), used: A.used, bug: A.bug,
      bug_note: A.bug === "yes" ? ($("bug_note").value.trim().slice(0, 800) || null) : null, recommend: A.recommend, keep: A.keep,
      kinds: A.kinds, freq: A.freq, other: $("other").value.trim().slice(0, 1500) || null, name: $("name").value.trim().slice(0, 80) || null};
    const {error} = await sb.from("app_feedback").insert(row, {returning: "minimal"});
    if (error) { $("go").disabled = false; return say("fail", "err"); }
    $("form").hidden = true; $("done").hidden = false; scrollTo(0, 0);
  });
})();
