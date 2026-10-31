import { render } from "../_shared.js";
export async function onRequestGet(context) {
  var slug = decodeURIComponent(String(context.params.slug || "")).toLowerCase();
  return render(context, "film", slug);
}
