/* Gecko Climb: tester sign-up form, in English and Hungarian (the phone's language picks the start language; EN / HU switches it).
   Adds one row to the "tester_signups" table with the public key (insert only; see mobile/supabase-testers.sql). An address that is
   already on the list gets the same "thanks" as a new one, so the form cannot be used to find out who has signed up. */
"use strict";
(() => {
  const $ = id => document.getElementById(id), cfg = window.GECKO_CLOUD || {};
  const T = {
    en: {
      title: "Gecko Climb – Join the testers", h1: "Last call: join the Gecko Climb testers",
      intro: "Gecko Climb is a free climbing log (boulder, top rope and lead) with a gecko called Tex. It will soon be open to everyone, so this is the last chance to join the tester team, and it is a community app: you help shape it.",
      li1: "The app stays free. Testers climb without ads.", li2: "Enter your email below and I will send you a message shortly, with a button to download the app.", li3: "Android only for now; an iPhone version may come later.",
      lblEmail: "Your email (the Google account you use on your Android phone works best)",
      consent: "I agree that my email is stored to invite me to the test and to write to me about it. I can ask to be removed any time at geckoclimb.app@gmail.com.", privacy: "Privacy", go: "Sign me up",
      off: "The sign-up is not switched on yet. Please check back soon.", hp: "Thanks! You are on the list.", bad: "That email address does not look right.",
      tick: "Please tick the box so we may email you about the test.", saving: "Saving…", fail: "Something went wrong. Please try again in a minute.", done: "Thanks! You are on the list. I will email you shortly with a button to download the app."
    },
    hu: {
      title: "Gecko Climb – Légy tesztelő", h1: "Utolsó esély: légy a Gecko Climb tesztelője",
      intro: "A Gecko Climb egy ingyenes mászásnapló (boulder, top rope és lead) Tex, a gekkó társaságában. Hamarosan mindenkinek elérhető lesz, ezért ez az utolsó lehetőség, hogy bekerülj a tesztelői csapatba. Ez egy közösségi app: te is alakíthatod.",
      li1: "Az app végig ingyenes. A tesztelők hirdetések nélkül másznak.", li2: "Írd be lent az e-mail-címedet, és rövidesen írok egy e-mailt egy gombbal, amivel letöltheted az appot.", li3: "Egyelőre csak Androidra; az iPhone-os verzió később jöhet.",
      lblEmail: "Az e-mail-címed (a legjobb az a Google-fiók, amit az Android-telefonodon használsz)",
      consent: "Hozzájárulok, hogy az e-mail-címemet eltárolják, hogy meghívjanak a tesztre és írjanak nekem róla. Bármikor kérhetem a törlést a geckoclimb.app@gmail.com címen.", privacy: "Adatvédelem", go: "Jelentkezem",
      off: "A jelentkezés még nincs bekapcsolva. Nézz vissza hamarosan.", hp: "Köszi! Fent vagy a listán.", bad: "Ez az e-mail-cím nem tűnik érvényesnek.",
      tick: "Kérlek, jelöld be a négyzetet, hogy írhassunk neked a tesztről.", saving: "Mentés…", fail: "Hiba történt. Próbáld újra egy perc múlva.", done: "Köszi! Fent vagy a listán. Rövidesen írok egy e-mailt egy gombbal, amivel letöltheted az appot."
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
    const {error} = await sb.from("tester_signups").insert({email},{returning: "minimal"});
    if (error && error.code !== "23505") { $("go").disabled = false; return say("fail", "err"); }
    $("f").hidden = true; say("done", "ok");
  });
})();
