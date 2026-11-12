// Sends anyone who lands on the old Cloudflare address (*.pages.dev) to arondytepictures.com,
// keeping the same page path. Keeps Google from indexing a duplicate copy of the site and
// means the editor is only reachable through the protected arondytepictures.com address.
export async function onRequest(context) {
  var url = new URL(context.request.url);
  if (/\.pages\.dev$/i.test(url.hostname)) {
    return Response.redirect("https://arondytepictures.com" + url.pathname + url.search, 301);
  }
  return context.next();
}
