// Shared helper for the page-preview functions. Not a route itself.
// Adds per-page title/description/preview-image tags to index.html so that link previews
// (iMessage, Slack, LinkedIn, X, Google) show the right film. Visitors see no difference.

function slugify(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function clip(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
}
function parseContent(txt) {
  var body = txt.replace(/^[\s\S]*?window\.CONTENT\s*=\s*/, "").replace(/;\s*$/, "");
  return JSON.parse(body);
}
function abs(origin, p) {
  if (!p) return "";
  if (/^https?:/.test(p)) return p;
  return origin + "/" + String(p).replace(/^\/+/, "");
}

export function pickMeta(content, kind, slug) {
  var site = content.site || {};
  var base = "Arondyte Pictures";
  var meta = {
    title: base,
    description: [site.tagline1, site.tagline2].filter(Boolean).join(". ") + ".",
    image: "media/site/og-default.jpg",
    path: "/"
  };
  if (kind === "about") {
    var a = content.about || {};
    meta.title = "About — " + base; meta.description = a.lead || meta.description; meta.path = "/about";
  } else if (kind === "contact") {
    var c = content.contact || {};
    meta.title = "Contact — " + base; meta.description = c.lead || meta.description; meta.path = "/contact";
  } else if (kind === "film") {
    var films = content.films || [], found = null;
    for (var i = 0; i < films.length; i++) {
      var s = slugify(films[i].slug) || slugify(films[i].title) || films[i].key;
      if (s === slug) { found = films[i]; break; }
    }
    if (!found) return null;
    meta.title = found.title + " — " + base;
    var facts = [found.genre, found.year].filter(Boolean).join(" · ");
    meta.description = clip(found.logline, 200) || facts || meta.description;
    if (found.logline && facts) meta.description = clip(facts + ". " + found.logline, 200);
    meta.image = found.poster || (found.stills && found.stills[0] && found.stills[0].src) || meta.image;
    meta.path = "/films/" + (slugify(found.slug) || slugify(found.title) || found.key);
  }
  return meta;
}

export function inject(html, meta, origin) {
  var url = origin + meta.path, img = abs(origin, meta.image);
  var tags = [
    '<meta name="description" content="' + esc(meta.description) + '">',
    '<link rel="canonical" href="' + esc(url) + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Arondyte Pictures">',
    '<meta property="og:title" content="' + esc(meta.title) + '">',
    '<meta property="og:description" content="' + esc(meta.description) + '">',
    '<meta property="og:url" content="' + esc(url) + '">',
    '<meta property="og:image" content="' + esc(img) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + esc(meta.title) + '">',
    '<meta name="twitter:description" content="' + esc(meta.description) + '">',
    '<meta name="twitter:image" content="' + esc(img) + '">'
  ].join("\n");
  html = html.replace(/<meta name="description"[^>]*>\s*/g, ""); // replaced by the page-specific one below
  // index.html has no closing </head>, so the tags go in with the title (which is inside <head>).
  return html.replace(/<title>[\s\S]*?<\/title>/, function () { return "<title>" + esc(meta.title) + "</title>\n" + tags; });
}

export async function render(context, kind, slug) {
  try {
    var url = new URL(context.request.url);
    var pages = await Promise.all([
      context.env.ASSETS.fetch(new URL("/", url.origin)),
      context.env.ASSETS.fetch(new URL("/content.js", url.origin))
    ]);
    var pageRes = pages[0], contentRes = pages[1];
    if (!pageRes.ok || !contentRes.ok) return context.next();
    var meta = pickMeta(parseContent(await contentRes.text()), kind, slug);
    if (!meta) return pageRes; // unknown address: the page itself shows the home screen
    var html = inject(await pageRes.text(), meta, url.origin);
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
  } catch (e) {
    return context.next();
  }
}
