/* Gecko Climb cloud settings: fill in from your Supabase project (Project Settings → API).
   The "anon public" key is meant to ship inside apps; the database rules in mobile/supabase.sql keep every
   account to its own row. Never put the "service_role" key here. Empty = accounts switched off. */
window.GECKO_CLOUD = {
  url: "",      // e.g. "https://abcdefghijkl.supabase.co"
  anonKey: "",  // the long "anon public" key
};
