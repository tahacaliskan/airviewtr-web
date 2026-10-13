// Server-side 301 from *.pages.dev (production and preview aliases) to the canonical domain.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname.endsWith('.pages.dev')) {
    url.hostname = 'airviewtr.com';
    url.port = '';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
