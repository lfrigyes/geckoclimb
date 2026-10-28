/* Gecko Climb: tester sign-up form, in English and Hungarian (the phone's language picks the start language; EN / HU switches it).
   Adds one row to the "tester_signups" table with the public key (insert only; see mobile/supabase-testers.sql). An address that is
   already on the list gets the same "thanks" as a new one, so the form cannot be used to find out who has signed up. */
"use strict";
(() => {
  const $ = id => document.getElementById(id), cfg = window.GECKO_CLOUD || {};
  const T = {
    en: {
      title: "Gecko Climb – Become a tester", h1: "Help me test Gecko Climb",
      intro: "Gecko Climb is a small hobby project: a climbing tracker with a gecko called Tex, for boulder, top rope and lead. I am looking for friendly climbers to try it before it goes public.",
      li1: "Testers use the app without ads.", li2: "It takes a couple of weeks of casual use, and I would love to hear what feels off.", li3: "Android only for now; an iPhone version may come later.",
      lblEmail: "Your email (the Google account you use on your Android phone works best)", lblPhone: "Your phone", optChoose: "Choose…", optAndroid: "Android", optIphone: "iPhone", optBoth: "Both",
      lblNote: "Anything you want me to know (optional)", phNote: "e.g. which gym you climb in",
      consent: "I agree that my email is stored to invite me to the test and to write to me about it. I can ask to be removed any time at geckoclimb.app@gmail.com.", privacy: "Privacy", go: "Sign me up",
      off: "The sign-up is not switched on yet. Please check back soon.", hp: "Thanks! You are on the list.", bad: "That email address does not look right.",
      tick: "Please tick the box so we may email you about the test.", saving: "Saving…", fail: "Something went wrong. Please try again in a minute.", done: "Thanks! You are on the list. I will email you when the test opens."
    },
    hu: {
      title: "Gecko Climb – Légy tesztelő", h1: "Segíts tesztelni a Gecko Climb appot",
      intro: "A Gecko Climb egy kis hobbiprojekt: mászásnaplózó app Tex, a gekkó társaságában, boulderhez, top ropehoz és leadhez. Barátságos mászókat keresek, akik kipróbálják, mielőtt nyilvános lesz.",
      li1: "A tesztelők hirdetések nélkül használhatják az appot.", li2: "Pár hét alkalmi használatról van szó, és szívesen hallom, mi nem tetszik.", li3: "Egyelőre csak Androidra; az iPhone-os verzió később jöhet.",
      lblEmail: "Az e-mail-címed (a legjobb az a Google-fiók, amit az Android-telefonodon használsz)", lblPhone: "A telefonod", optChoose: "Válassz…", optAndroid: "Android", optIphone: "iPhone", optBoth: "Mindkettő",
      lblNote: "Bármi, amit tudnom érdemes (nem kötelező)", phNote: "pl. melyik teremben mászol",
      consent: "Hozzájárulok, hogy az e-mail-címemet eltárolják, hogy meghívjanak a tesztre és írjanak nekem róla. Bármikor kérhetem a törlést a geckoclimb.app@gmail.com címen.", privacy: "Adatvédelem", go: "Jelentkezem",
      off: "A jelentkezés még nincs bekapcsolva. Nézz vissza hamarosan.", hp: "Köszi! Fent vagy a listán.", bad: "Ez az e-mail-cím nem tűnik érvényesnek.",
      tick: "Kérlek, jelöld be a négyzetet, hogy írhassunk neked a tesztről.", saving: "Mentés…", fail: "Hiba történt. Próbáld újra egy perc múlva.", done: "Köszi! Fent vagy a listán. Írok, amikor indul a teszt."
    }
  };
  const guess = () => /^hu/i.test(navigator.language || "") ? "hu" : "en";
  let lang = guess();
  try { lang = localStorage.getItem("lang") || lang; } catch (e) { /* no storage: the phone's language */ }
  const t = k => T[lang][k];
  const say = (k, cls) => { $("msg").className = "msg " + (cls || ""); $("msg").textContent = t(k); $("msg").dataset.k = k; };
  function apply() {
    document.documentElement.lang = lang; document.title = t("title");
    document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll("[data-ph]").forEach(el => { el.placeholder = t(el.dataset.ph); });
    document.querySelectorAll(".lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
    if ($("msg").dataset.k) $("msg").textContent = t($("msg").dataset.k);
  }
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
    lang = b.dataset.lang; try { localStorage.setItem("lang", lang); } catch (e) { /* fine */ } apply();
  }));
  apply();
  if (!cfg.url || !cfg.anonKey || !window.supabase) { say("off", "err"); $("go").disabled = true; return; }
  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
  $("f").addEventListener("submit", async ev => {
    ev.preventDefault();
    if ($("website").value) return say("hp", "ok");  // the hidden field is for bots; people leave it empty
    const email = $("email").value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return say("bad", "err");
    if (!$("ok").checked) return say("tick", "err");
    $("go").disabled = true; say("saving");
    const {error} = await sb.from("tester_signups").insert({email, phone: $("phone").value || null, note: $("note").value.trim().slice(0, 300) || null}, {returning: "minimal"});
    if (error && error.code !== "23505") { $("go").disabled = false; return say("fail", "err"); }
    $("f").hidden = true; say("done", "ok");
  });
})();
