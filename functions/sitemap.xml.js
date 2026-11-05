// Generates /sitemap.xml from content.js, so new or renamed films appear automatically after you publish.
import { parseContent, slugify } from "./_shared.js";

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export async function onRequestGet(context) {
  var origin = new URL(context.request.url).origin;
  var content = {};
  try {
    var r = await context.env.ASSETS.fetch(new URL("/content.js", origin));
    content = parseContent(await r.text());
  } catch (e) { content = {}; }
  var stamp = (content.site && content.site.updated) || "";
  var lastmod = /^\d{4}-\d{2}-\d{2}/.test(stamp) ? stamp.slice(0, 10) : "";
  var paths = ["/"];
  (content.films || []).forEach(function (f) {
    if (f.soon) return; // "coming soon" cards have no page of their own
    var s = slugify(f.slug) || slugify(f.title) || f.key;
    if (s) paths.push("/films/" + s);
  });
  paths.push("/about", "/contact");
  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map(function (p) {
      return "  <url><loc>" + esc(origin + p) + "</loc>" + (lastmod ? "<lastmod>" + lastmod + "</lastmod>" : "") + "</url>";
    }).join("\n") + "\n</urlset>\n";
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
