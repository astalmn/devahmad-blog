
const REPO = "astalmn/devahmad-blog";

function getCookie(request, name) {
  const item = (request.headers.get("Cookie") || "")
    .split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(name + "="));

  return item ? item.slice(name.length + 1) : null;
}

function fromBase64Url(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const binary = atob(normalized);

  return Uint8Array.from(
    binary,
    character => character.charCodeAt(0)
  );
}

async function getSession(request, secret) {
  const cookie = getCookie(request, "editor_session");

  if (!cookie || !secret) return null;

  try {
    const [ivPart, encryptedPart] = cookie.split(".");

    if (!ivPart || !encryptedPart) return null;

    const material = new TextEncoder().encode(
      "DevAhmad editor session v1:" + secret
    );

    const digest = await crypto.subtle.digest(
      "SHA-256",
      material
    );

    const key = await crypto.subtle.importKey(
      "raw",
      digest,
      "AES-GCM",
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: fromBase64Url(ivPart)
      },
      key,
      fromBase64Url(encryptedPart)
    );

    const session = JSON.parse(
      new TextDecoder().decode(decrypted)
    );

    if (
      !session.token ||
      !session.expires ||
      Date.now() >= session.expires
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  const session = await getSession(
    request,
    env.GITHUB_CLIENT_SECRET
  );

  if (!session) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 401, headers }
    );
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/" + REPO,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + session.token,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "DevAhmad-Editor"
        }
      }
    );

    if (!response.ok) {
      throw new Error("GitHub verification failed");
    }

    const repository = await response.json();

    if (!repository.permissions?.push) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          error: "No publishing permission"
        }),
        { status: 403, headers }
      );
    }

    return new Response(
      JSON.stringify({ authenticated: true }),
      { status: 200, headers }
    );
  } catch {
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: "Unable to verify GitHub access"
      }),
      { status: 502, headers }
    );
  }
}
  
