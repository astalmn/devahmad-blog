
/*
 * DevAhmad Editor OAuth
 * تسجيل دخول مستقل للمحرر.
 * يستخدم عنوان العودة الحالي في GitHub.
 */

const SITE = "https://devahmad-blog.pages.dev";

function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    byte => byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function onRequestGet({ env }) {
  if (
    !env.GITHUB_CLIENT_ID ||
    !env.GITHUB_CLIENT_SECRET
  ) {
    return new Response(
      "GitHub OAuth is not configured",
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const state = randomState();

  const github = new URL(
    "https://github.com/login/oauth/authorize"
  );

  github.searchParams.set(
    "client_id",
    env.GITHUB_CLIENT_ID
  );

  github.searchParams.set(
    "redirect_uri",
    SITE + "/api/callback"
  );

  github.searchParams.set(
    "scope",
    "repo"
  );

  github.searchParams.set(
    "state",
    state
  );

  return new Response(null, {
    status: 302,
    headers: {
      "Location": github.toString(),

      "Set-Cookie":
        "editor_oauth_state=" + state +
        "; HttpOnly" +
        "; Secure" +
        "; SameSite=Lax" +
        "; Path=/api" +
        "; Max-Age=600",

      "Cache-Control": "no-store",

      "Referrer-Policy": "no-referrer"
    }
  });
          }
        
