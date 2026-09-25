
const SITE = "https://devahmad-blog.pages.dev";

function popup(message) {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>GitHub Authentication</title>
</head>
<body>
<p>Completing authentication...</p>
<script>
(function () {
  const origin = ${JSON.stringify(SITE)};
  const message = ${JSON.stringify(message)};

  if (!window.opener) {
    document.body.textContent =
      "Please return to the CMS and try again.";
    return;
  }

  window.opener.postMessage(message, origin);
  window.close();
})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'unsafe-inline'; " +
        "style-src 'unsafe-inline'; base-uri 'none'"
    }
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookies = request.headers.get("Cookie") || "";

  const savedState = cookies
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("oauth_state="))
    ?.slice("oauth_state=".length);

  if (!code || !state || !savedState || state !== savedState) {
    return new Response("Invalid OAuth state", {
      status: 403
    });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("OAuth is not configured", {
      status: 503
    });
  }

  const response = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: SITE + "/api/callback"
      })
    }
  );

  const data = await response.json();

  const message = data.access_token
    ? "authorization:github:success:" +
      JSON.stringify({
        token: data.access_token,
        provider: "github"
      })
    : "authorization:github:error:" +
      JSON.stringify({
        message: "GitHub authentication failed"
      });

  const result = popup(message);

  result.headers.append(
    "Set-Cookie",
    "oauth_state=; HttpOnly; Secure; " +
    "SameSite=Lax; Path=/api; Max-Age=0"
  );

  return result;
}
