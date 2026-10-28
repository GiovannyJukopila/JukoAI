// Shared by the server layout and the client theme store (lib/theme.ts), so it holds no "use client".
export const THEME_KEY = "juko-theme";
export const LIGHT_QUERY = "(prefers-color-scheme: light)";

/**
 * Runs in <head> while the HTML is parsed, so the page paints in the right theme from the first frame.
 * Mirrors resolveTheme + applyTheme in lib/theme.ts; dark is the server default.
 */
export const themeScript = `(function(){var p;try{p=localStorage.getItem("${THEME_KEY}")}catch(e){}var t=p==="light"||p==="dark"?p:(matchMedia("${LIGHT_QUERY}").matches?"light":"dark");var d=document.documentElement;d.setAttribute("data-theme",t);d.style.colorScheme=t})()`;
