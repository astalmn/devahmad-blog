
const SITE = "https://devahmad-blog.pages.dev";

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("OAuth is not configured", {
      status: 503
    });
  }

  const stateBytes = new Uint8Array(32);
  crypto.getRandomValues(stateBytes);

  const state = Array.from(
    stateBytes,
    b => b.toString(16).padStart(2, "0")
  ).join("");

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

  github.searchParams.set("scope", "repo");
  github.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: github.toString(),
      "Set-Cookie":
        `oauth_state=${state}; ` +
        "HttpOnly; Secure; SameSite=Lax; " +
        "Path=/api; Max-Age=600",
      "Cache-Control": "no-store"
    }
  });
}
