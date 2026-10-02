// Plate deep links such as /AF123CD or /AF123CD/?p=AF123CD open the page.
// They used to work only because Pages served index.html for every unknown path
// while the site had no 404.html. public/404.html turns that SPA fallback off,
// so this Function serves the page for one path segment that reads as a plate
// and passes everything else on to the static files and the 404 page.
// _redirects cannot do this: its placeholders match any segment and it has no
// regex, so a 200 rule for /:plate would also answer /nope-xyz with the page.
// public/_routes.json keeps the static files off the Function.
import patente from '../patente.js';

function isPlate(segment) {
  try {
    patente.yearFromPlate(decodeURIComponent(segment));
    return true;
  } catch {
    return false;
  }
}

export function onRequest({ request, env, params, next }) {
  if (!isPlate(params.plate)) return next();
  return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
}
