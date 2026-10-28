/* Gecko Climb: tester sign-up form. Adds one row to the "tester_signups" table with the public key (insert only; see
   mobile/supabase-testers.sql). An address that is already on the list gets the same "thanks" as a new one, so the form cannot be
   used to find out who has signed up. */
"use strict";
(() => {
  const $ = id => document.getElementById(id), cfg = window.GECKO_CLOUD || {};
  const say = (t, cls) => { $("msg").className = "msg " + (cls || ""); $("msg").textContent = t; };
  if (!cfg.url || !cfg.anonKey || !window.supabase) { say("The sign-up is not switched on yet. Please check back soon.", "err"); $("go").disabled = true; return; }
  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
  $("f").addEventListener("submit", async ev => {
    ev.preventDefault();
    if ($("website").value) return say("Thanks! You are on the list.", "ok");  // the hidden field is for bots; people leave it empty
    const email = $("email").value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return say("That email address does not look right.", "err");
    if (!$("ok").checked) return say("Please tick the box so we may email you about the test.", "err");
    $("go").disabled = true; say("Saving…");
    const {error} = await sb.from("tester_signups").insert({email, phone: $("phone").value || null, note: $("note").value.trim().slice(0, 300) || null}, {returning: "minimal"});
    if (error && error.code !== "23505") { $("go").disabled = false; return say("Something went wrong. Please try again in a minute.", "err"); }
    $("f").hidden = true;
    say("Thanks! You are on the list. I will email you when the test opens.", "ok");
  });
})();
