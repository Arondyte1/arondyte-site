// Shared helper for the page-preview functions. Not a route itself.
// Adds per-page title/description/preview-image tags to index.html so that link previews
// (iMessage, Slack, LinkedIn, X, Google) show the right film. Visitors see no difference.

export function slugify(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function clip(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
}
export function parseContent(txt) {
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
    path: "/", kind: "home"
  };
  if (kind === "about") {
    var a = content.about || {};
    meta.title = "About — " + base; meta.description = a.lead || meta.description; meta.path = "/about"; meta.kind = "about";
  } else if (kind === "contact") {
    var c = content.contact || {};
    meta.title = "Contact — " + base; meta.description = c.lead || meta.description; meta.path = "/contact"; meta.kind = "contact";
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
    meta.kind = "film"; meta.film = found;
    meta.path = "/films/" + (slugify(found.slug) || slugify(found.title) || found.key);
  }
  return meta;
}

function jsonLd(content, kind, meta, origin) {
  var site = content.site || {}, about = content.about || {}, contact = content.contact || {};
  var sameAs = (contact.links || []).map(function (l) { return l.url; }).filter(Boolean);
  var org = {
    "@type": "Organization", "@id": origin + "/#org", name: "Arondyte Pictures", url: origin + "/",
    logo: origin + "/media/site/mark.png", sameAs: sameAs,
    description: [site.tagline1, site.tagline2].filter(Boolean).join(". ") + "."
  };
  if (about.founder && about.founder.name) org.founder = { "@type": "Person", name: about.founder.name };
  var graph = [org];
  if (kind === "home") graph.push({ "@type": "WebSite", "@id": origin + "/#site", url: origin + "/", name: "Arondyte Pictures", publisher: { "@id": origin + "/#org" } });
  if (kind === "film" && meta.film) {
    var f = meta.film, m = { "@type": "Movie", name: f.title, url: origin + meta.path, image: abs(origin, meta.image), productionCompany: { "@id": origin + "/#org" } };
    if (meta.description) m.description = meta.description;
    if (f.genre) m.genre = f.genre;
    if (/^\d{4}$/.test(String(f.year))) m.dateCreated = String(f.year);
    if (f.imdb) m.sameAs = f.imdb;
    graph.push(m);
  }
  return '<script type="application/ld+json">' + JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") + "</script>";
}


// Plain-text version of the page for search engines and screen readers. The visible site draws
// itself with JavaScript, so without this the raw HTML has no words or links in it at all.
// It is visually hidden (standard accessibility technique) and says the same things the page does.
function seoBlock(content, kind, meta, origin) {
  var site = content.site || {}, about = content.about || {}, contact = content.contact || {};
  function link(path, text) { return '<a href="' + esc(origin + path) + '" tabindex="-1">' + esc(text) + "</a>"; }
  function fslug(f) { return slugify(f.slug) || slugify(f.title) || f.key; }
  var films = (content.films || []).filter(function (f) { return !f.soon; });
  var h = [];
  if (kind === "film" && meta.film) {
    var f = meta.film;
    h.push("<h1>" + esc(f.title) + "</h1>");
    var facts = [f.genre, f.year, f.runtime, f.status].filter(Boolean).join(" · ");
    if (facts) h.push("<p>" + esc(facts) + "</p>");
    if (f.logline) h.push("<p>" + esc(f.logline) + "</p>");
    if (f.lead) h.push("<p>" + esc(f.leadLabel || "Directed by") + ": " + esc(f.lead) + "</p>");
    (Array.isArray(f.extra) ? f.extra : []).forEach(function (r) { if (r && r[0] && r[1]) h.push("<p>" + esc(r[0]) + ": " + esc(r[1]) + "</p>"); });
    if (f.starring) h.push("<p>Starring: " + esc([].concat(f.starring).join(", ")) + "</p>");
  } else if (kind === "about") {
    h.push("<h1>" + esc(about.heading || "About") + "</h1>");
    if (about.lead) h.push("<p>" + esc(about.lead) + "</p>");
    (about.groups || []).forEach(function (g) {
      h.push("<h2>" + esc(g.name) + "</h2><ul>" + (g.items || []).map(function (i) { return "<li><strong>" + esc(i.title) + "</strong>: " + esc(i.text) + "</li>"; }).join("") + "</ul>");
    });
    var fo = about.founder || {};
    if (fo.name) h.push("<h2>" + esc(fo.name) + "</h2>" + (fo.paragraphs || []).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join(""));
  } else if (kind === "contact") {
    h.push("<h1>" + esc(contact.heading || "Contact") + "</h1>");
    if (contact.lead) h.push("<p>" + esc(contact.lead) + "</p>");
    if (contact.email) h.push('<p>Email: <a href="mailto:' + esc(contact.email) + '" tabindex="-1">' + esc(contact.email) + "</a></p>");
  } else {
    h.push("<h1>Arondyte Pictures</h1>");
    h.push("<p>" + esc(meta.description) + "</p>");
    if (about.lead) h.push("<p>" + esc(about.lead) + "</p>");
  }
  h.push("<nav aria-label=\"Site\"><ul>" + link("/", "Arondyte Pictures") + films.map(function (x) { return "<li>" + link("/films/" + fslug(x), x.title + (x.year ? " (" + x.year + ")" : "")) + "</li>"; }).join("") + "<li>" + link("/about", "About") + "</li><li>" + link("/contact", "Contact") + "</li></ul></nav>");
  var soc = (contact.links || []).filter(function (l) { return l.url; });
  if (soc.length) h.push("<ul>" + soc.map(function (l) { return '<li><a href="' + esc(l.url) + '" tabindex="-1">' + esc(l.label) + "</a></li>"; }).join("") + "</ul>");
  return '<div style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">' + h.join("") + "</div>\n";
}

export function inject(html, meta, origin, content) {
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
  if (content) tags += "\n" + jsonLd(content, meta.kind, meta, origin);
  html = html.replace(/<meta name="description"[^>]*>\s*/g, ""); // replaced by the page-specific one below
  if (content) { var sb = seoBlock(content, meta.kind, meta, origin); html = html.replace('<div class="bar">', function (m) { return sb + m; }); }
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
    var content = parseContent(await contentRes.text());
    var meta = pickMeta(content, kind, slug);
    if (!meta) return pageRes; // unknown address: the page itself shows the home screen
    var html = inject(await pageRes.text(), meta, url.origin, content);
    return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
  } catch (e) {
    return context.next();
  }
}
