// Cloudflare Pages Function — POST /api/editor-logout
// Clear the existing HttpOnly session cookie; never expose tokens to the browser.
export async function onRequestPost({ request }) {
  const origin = request.headers.get('Origin');
  const expected = new URL(request.url).origin;
  if (origin !== expected) {
    return new Response(JSON.stringify({ error: 'Origin غير صالح' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': 'editor_session=; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=0'
    }
  });
}
