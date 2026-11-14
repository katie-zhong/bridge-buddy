// Vercel Function: serves every /api/* request (see the rewrite in vercel.json).
// The static app in dist/ is served by Vercel's CDN; this only runs the JSON API.
//
// Storage: Vercel's filesystem is read-only except /tmp, and /tmp is per instance and
// wiped on cold start. So on Vercel the SQLite store is demo-grade: it re-seeds on each
// cold start and sign-ins/progress do not survive it. See docs/DEPLOY.md.
import { openDb } from '../server/db.mjs';
import { createHandler } from '../server/index.mjs';

const handle = createHandler(openDb(process.env.NORBU_DB || '/tmp/norbu.db'));

// vercel.json rewrites /api/<path> to /api/norbu?__norbu_path=<path>. Restore the original
// URL so the app's router sees /api/<path> with the caller's own query string.
export function restoreUrl(rawUrl) {
  const u = new URL(rawUrl, 'http://x');
  if (!u.searchParams.has('__norbu_path')) return rawUrl;
  const p = u.searchParams.get('__norbu_path');
  u.searchParams.delete('__norbu_path');
  return `/api/${p}${u.search}`;
}

export default function handler(req, res) {
  req.url = restoreUrl(req.url);
  return handle(req, res);
}
