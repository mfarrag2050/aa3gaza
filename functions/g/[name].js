// Same-origin proxy for AA gallery photos and logo: the AA CDN refuses these when embedded from another site.
const SRC = {
  photo: /^thumbs_b2_[0-9a-f]{32}\.jpg$/,
};
export async function onRequest({ params, request }) {
  const name = String(params.name || '');
  let url, m;
  if (SRC.photo.test(name)) url = 'https://web-cdnprod.aa.com.tr/uploads/PhotoGallery/2026/10/07/' + name;
  else if ((m = name.match(/^ig_(\d{4})(\d{2})(\d{2})_([0-9a-f]{32})\.jpg$/))) url = `https://web-cdnprod.aa.com.tr/uploads/InfoGraphic/${m[1]}/${m[2]}/${m[3]}/${m[4]}.jpg`;
  else if (name === 'aa-logo.png') url = 'https://www.aa.com.tr/images/black-logo.png';
  else return new Response('Not found', { status: 404 });
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (genogaza)', 'Referer': 'https://www.aa.com.tr/' } });
  if (!r.ok) return new Response('Upstream ' + r.status, { status: 502 });
  const res = new Response(r.body, { headers: {
    'Content-Type': r.headers.get('Content-Type') || 'image/jpeg',
    'Cache-Control': 'public, max-age=2592000, immutable',
  } });
  await cache.put(request, res.clone());
  return res;
}
