
const SITE = "https://devahmad-blog.pages.dev";
const SESSION_AGE = 3600;

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";

  const item = cookies
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(name + "="));

  return item
    ? item.slice(name.length + 1)
    : null;
}

function clearCookie(name) {
  return (
    name + "=; HttpOnly; Secure; SameSite=Lax; " +
    "Path=/api; Max-Age=0"
  );
}

function toBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sessionKey(secret) {
  const material = new TextEncoder().encode(
    "DevAhmad editor session v1:" + secret
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    material
  );

  return crypto.subtle.importKey(
    "raw",
    digest,
    "AES-GCM",
    false,
    ["encrypt"]
  );
}

async function encryptSession(token, secret) {
  const key = await sessionKey(secret);

  const iv = crypto.getRandomValues(
    new Uint8Array(12)
  );

  const payload = JSON.stringify({
    token,
    expires: Date.now() + SESSION_AGE * 1000
  });

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    new TextEncoder().encode(payload)
  );

  return (
    toBase64Url(iv) +
    "." +
    toBase64Url(new Uint8Array(encrypted))
  );
}

/*
 * Decap CMS:
 * نحافظ على بروتوكول الرسائل الحالي.
 */
function decapPopup(message) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DevAhmad Login</title>
</head>
<body>
  <p>Completing GitHub login...</p>

  <script>
    const origin = ${JSON.stringify(SITE)};
    const message = ${JSON.stringify(message)};

    if (!window.opener) {
      document.body.textContent =
        "Please return to the CMS and try again.";
    } else {
      window.addEventListener(
        "message",
        function(event) {
          if (event.origin !== origin) return;

          if (event.data === "authorizing:github") {
            window.opener.postMessage(
              message,
              origin
            );
          }
        }
      );

      window.opener.postMessage(
        "authorizing:github",
        origin
      );
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'none'; " +
        "script-src 'unsafe-inline'; " +
        "base-uri 'none'"
    }
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const decapState = getCookie(
    request,
    "oauth_state"
  );

  const editorState = getCookie(
    request,
    "editor_oauth_state"
  );

  const isEditor = Boolean(
    state &&
    editorState &&
    state === editorState
  );

  const isDecap = Boolean(
    state &&
    decapState &&
    state === decapState
  );

  if (!state || (!isEditor && !isDecap)) {
    return new Response(
      "Invalid OAuth state",
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  if (!code) {
    return new Response(
      "Missing GitHub authorization code",
      { status: 400 }
    );
  }

  if (
    !env.GITHUB_CLIENT_ID ||
    !env.GITHUB_CLIENT_SECRET
  ) {
    return new Response(
      "OAuth is not configured",
      { status: 503 }
    );
  }

  const response = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
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

  if (!response.ok) {
    return new Response(
      "GitHub token request failed",
      { status: 502 }
    );
  }

  const data = await response.json();

  /*
   * تسجيل دخول المحرر:
   * جلسة مشفرة داخل HttpOnly cookie.
   * لا نضع رمز GitHub في عنوان الصفحة.
   */
  if (isEditor) {
    if (!data.access_token) {
      return new Response(
        "GitHub authentication failed",
        { status: 401 }
      );
    }

    const encrypted = await encryptSession(
      data.access_token,
      env.GITHUB_CLIENT_SECRET
    );

    const result = new Response(null, {
      status: 303,
      headers: {
        Location: SITE + "/editor/",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer"
      }
    });

    result.headers.append(
      "Set-Cookie",
      "editor_session=" + encrypted +
      "; HttpOnly; Secure; SameSite=Lax; " +
      "Path=/api; Max-Age=" + SESSION_AGE
    );

    result.headers.append(
      "Set-Cookie",
      clearCookie("editor_oauth_state")
    );

    return result;
  }

  /*
   * تسجيل دخول Decap:
   * نفس بروتوكول المصادقة السابق.
   */
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

  const result = decapPopup(message);

  result.headers.append(
    "Set-Cookie",
    clearCookie("oauth_state")
  );

  return result;
        }
