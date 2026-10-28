// First-visit intro: decided before the first paint (server layout + client loader share this file,
// so it holds no "use client"). Shown once per browser session; never with reduced motion.
export const INTRO_KEY = "juko-intro";
export const INTRO_DONE_EVENT = "juko:intro-done";
export const HERO_READY_EVENT = "juko:hero-ready";

export const introScript = `(function(){var c=document.documentElement.classList,s=false;try{s=sessionStorage.getItem("${INTRO_KEY}")==="1"}catch(e){}if(s||matchMedia("(prefers-reduced-motion: reduce)").matches)c.add("intro-skip");else c.add("intro-on")})()`;
