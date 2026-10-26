/* Gecko Climb: set a new password after the "forgot password" email. The emailed link opens this page with a short-lived
   recovery token (it expires with the link: set the email link lifetime in Supabase, Authentication, to 15 minutes);
   supabase-js turns the token into a session, the form sets the new password, and then EVERY session of the account is
   signed out, so a stolen old session or token stops working at once. */
"use strict";
(() => {
  const $ = id => document.getElementById(id), cfg = window.GECKO_CLOUD || {};
  const say = (t, cls) => { $("msg").className = "msg " + (cls || ""); $("msg").textContent = t; };
  if (!cfg.url || !cfg.anonKey || !window.supabase) { $("intro").textContent = "Accounts are not switched on yet."; return; }
  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: true}});
  let recovering = false;
  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") { recovering = true; $("intro").textContent = "Choose a new password for your account."; $("f").hidden = false; }
  });
  setTimeout(() => { if (!recovering) say("This link is invalid or has expired. Ask for a new one in the app (Account → Forgot password).", "err"); }, 4000);
  $("f").addEventListener("submit", async ev => {
    ev.preventDefault();
    const a = $("p1").value, b = $("p2").value;
    if (a.length < 10) return say("Use at least 10 characters.", "err");
    if (a !== b) return say("The two passwords differ.", "err");
    $("go").disabled = true; say("Saving…");
    const {error} = await sb.auth.updateUser({password: a});
    if (error) { $("go").disabled = false; return say(error.message, "err"); }
    await sb.auth.signOut({scope: "global"});  // every other session of this account ends with the old password
    $("f").hidden = true; $("intro").textContent = "";
    say("Your password is changed, and you were signed out everywhere. Sign in again in the app with the new one.", "ok");
  });
})();
