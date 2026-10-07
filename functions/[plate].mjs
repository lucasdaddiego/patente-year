// Plate deep links such as /AF123CD or /AF123CD/?p=AF123CD land on the page
// with the plate prefilled: a 302 to /?p=<plate>. The page reads only ?p=, so
// serving it in place (the previous behaviour) opened an empty form from a
// shared /AF123CD link; the redirect also keeps one URL per plate instead of
// a copy of the page under every plate path.
// public/404.html turns the Pages SPA fallback off, so anything that does not
// read as a plate passes on to the static files and the 404 page.
// _redirects cannot do this: its placeholders match any segment and it has no
// regex, so a rule for /:plate would also answer /nope-xyz.
// public/_routes.json keeps the static files off the Function.
import patente from '../patente.js';

// The normalised plate (AF123CD) when the segment reads as one, else null.
function plateOf(segment) {
  try {
    const plate = patente.normalize(decodeURIComponent(segment));
    patente.yearFromPlate(plate);
    return plate;
  } catch {
    return null;
  }
}

export function onRequest({ request, params, next }) {
  const plate = plateOf(params.plate);
  if (!plate) return next();
  const to = new URL('/', request.url);
  to.searchParams.set('p', plate);
  return Response.redirect(to.href, 302);
}
