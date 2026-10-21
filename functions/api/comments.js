const MAX_NAME = 80, MAX_EMAIL = 160, MAX_TEXT = 2000;
const MAX_BODY_BYTES = 8192;
const WINDOW_SECONDS = 600;
const MAX_COMMENTS_PER_WINDOW = 5;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
}
function clean(value, max) { return typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : ''; }
function validOrigin(request) { return request.headers.get('Origin') === new URL(request.url).origin; }
function normalizeForModeration(value) { return String(value || '').toLowerCase().normalize('NFKC').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ـ/g, '').replace(/[0]/g, 'o').replace(/[1!|]/g, 'i').replace(/[3]/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/[7]/g, 't').replace(/[^a-z\u0600-\u06ff]+/g, '').replace(/(.)\1{2,}/g, '$1$1'); }
const BAD = ['fuck','fuk','fck','fucker','fucking','shit','bitch','asshole','dick','pussy','cunt','motherfucker','كس','كسم','كسامك','كسامو','كسخت','شرموط','شرموطه','شراميط','قحبه','منيوك','منيوكه','طيز','زب','زبي','زبر','خول','عرص','نيك','انيك','لعين','يلعن','يلعنابوك','يلعنامك'];
function hasAbuse(value) { const normalized = normalizeForModeration(value); return BAD.some(word => normalized.includes(normalizeForModeration(word))); }
function looksSpam(value) { const links = (String(value).match(/(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|xyz|top|click|shop)\b)/gi) || []).length; return links > 1 || /(.{4,})\1{2,}/i.test(String(value)); }
function moderationStatus(name, content) { return hasAbuse(name) || hasAbuse(content) || looksSpam(content) ? 'rejected' : 'approved'; }

async function hashAddress(address, secret) {
  const bytes = new TextEncoder().encode(`${secret}:${address}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Atomic D1 upsert avoids read-then-write races. Migration must be applied before deployment.
async function takeRateLimitSlot(db, key, now) {
  const windowStart = Math.floor(now / WINDOW_SECONDS) * WINDOW_SECONDS;
  const result = await db.prepare(`INSERT INTO comment_rate_limits (client_key, window_start, count)
    VALUES (?, ?, 1)
    ON CONFLICT(client_key, window_start) DO UPDATE SET count = count + 1
    WHERE count < ?`).bind(key, windowStart, MAX_COMMENTS_PER_WINDOW).run();
  return { allowed: result.meta?.changes === 1, retryAfter: windowStart + WINDOW_SECONDS - now };
}

export async function onRequest({ request, env }) {
  try {
    if (!env.COMMENTS_DB) return json({ error: 'comments unavailable' }, 503);
    if (request.method === 'GET') {
      const page = new URL(request.url).searchParams.get('page');
      if (!page || page.length > 200) return json({ error: 'invalid page' }, 400);
      const { results } = await env.COMMENTS_DB.prepare("SELECT id,name,content,created_at FROM comments WHERE page_id=? AND status='approved' ORDER BY created_at DESC LIMIT 100").bind(page).all();
      return json({ comments: results });
    }
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, { Allow: 'GET, POST' });
    if (!validOrigin(request)) return json({ error: 'forbidden' }, 403);
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ error: 'expected JSON' }, 415);
    if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) return json({ error: 'request too large' }, 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: 'request too large' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'invalid JSON' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid JSON object' }, 400);
    const page = clean(body.page_id, 200), title = clean(body.article_title, 200), name = clean(body.name, MAX_NAME), email = clean(body.email, MAX_EMAIL), content = clean(body.content, MAX_TEXT);
    if (!page || !title || !name || !content) return json({ error: 'required fields' }, 400);
    if (content.length < 3) return json({ error: 'comment too short' }, 400);
    // Cloudflare supplies CF-Connecting-IP. Never trust a caller-controlled X-Forwarded-For header.
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip || !env.COMMENT_RATE_LIMIT_SECRET) return json({ error: 'comment protection unavailable' }, 503);
    const key = await hashAddress(ip, env.COMMENT_RATE_LIMIT_SECRET);
    const limit = await takeRateLimitSlot(env.COMMENTS_DB, key, Math.floor(Date.now() / 1000));
    if (!limit.allowed) return json({ error: 'too many comments' }, 429, { 'Retry-After': String(limit.retryAfter) });
    const status = moderationStatus(name, content);
    await env.COMMENTS_DB.prepare('INSERT INTO comments(page_id,article_title,name,email,content,status) VALUES(?,?,?,?,?,?)').bind(page, title, name, email, content, status).run();
    return status === 'approved' ? json({ success: true, message: 'تم نشر التعليق' }) : json({ success: true, message: 'تم استلام التعليق' });
  } catch {
    return json({ error: 'server error' }, 500);
  }
}
