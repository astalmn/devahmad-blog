
const REPO = "astalmn/devahmad-blog";
const FOLDER = "src/content/blog";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function fromBase64Url(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Uint8Array.from(
    atob(normalized),
    character => character.charCodeAt(0)
  );
}

async function readSession(request, secret) {
  const cookie = (request.headers.get("Cookie") || "")
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("editor_session="))
    ?.slice("editor_session=".length);

  if (!cookie || !secret) return null;

  try {
    const parts = cookie.split(".");
    if (parts.length !== 2) return null;

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        "DevAhmad editor session v1:" + secret
      )
    );

    const key = await crypto.subtle.importKey(
      "raw",
      digest,
      "AES-GCM",
      false,
      ["decrypt"]
    );

    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: fromBase64Url(parts[0])
      },
      key,
      fromBase64Url(parts[1])
    );

    const session = JSON.parse(
      new TextDecoder().decode(plaintext)
    );

    if (
      !session.token ||
      !Number.isFinite(session.expires) ||
      Date.now() >= session.expires
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function decodeGitHubContent(encoded) {
  const binary = atob(
    encoded.replace(/\s/g, "")
  );

  const bytes = Uint8Array.from(
    binary,
    character => character.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DevAhmad-Editor"
  };
}

export async function onRequestGet({ request, env }) {
  const session = await readSession(
    request,
    env.GITHUB_CLIENT_SECRET
  );

  if (!session) {
    return json(
      { error: "انتهت جلسة الدخول" },
      401
    );
  }

  const headers = githubHeaders(session.token);

  try {
    const permissionResponse = await fetch(
      "https://api.github.com/repos/" + REPO,
      { headers }
    );

    if (!permissionResponse.ok) {
      return json(
        { error: "تعذر التحقق من صلاحيات GitHub" },
        502
      );
    }

    const repository = await permissionResponse.json();

    if (!repository.permissions?.push) {
      return json(
        { error: "لا تمتلك صلاحية إدارة المقالات" },
        403
      );
    }

    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    if (slug !== null) {
      if (
        !/^[a-zA-Z0-9_-]{1,150}$/.test(slug)
      ) {
        return json(
          { error: "رابط المقال غير صالح" },
          400
        );
      }

      const path = FOLDER + "/" + slug + ".md";

      const response = await fetch(
        "https://api.github.com/repos/" +
          REPO + "/contents/" +
          path + "?ref=main",
        { headers }
      );

      if (response.status === 404) {
        return json(
          { error: "المقال غير موجود" },
          404
        );
      }

      if (!response.ok) {
        return json(
          { error: "تعذر تحميل المقال" },
          502
        );
      }

      const file = await response.json();

      if (
        file.type !== "file" ||
        file.encoding !== "base64"
      ) {
        return json(
          { error: "صيغة الملف غير مدعومة" },
          422
        );
      }

      return json({
        slug,
        path: file.path,
        sha: file.sha,
        content: decodeGitHubContent(file.content)
      });
    }

    const response = await fetch(
      "https://api.github.com/repos/" +
        REPO + "/contents/" +
        FOLDER + "?ref=main",
      { headers }
    );

    if (!response.ok) {
      return json(
        { error: "تعذر جلب قائمة المقالات" },
        502
      );
    }

    const files = await response.json();

    if (!Array.isArray(files)) {
      return json(
        { error: "استجابة غير متوقعة من GitHub" },
        502
      );
    }

    const articles = files
      .filter(file =>
        file.type === "file" &&
        file.name.endsWith(".md")
      )
      .map(file => ({
        slug: file.name.slice(0, -3),
        name: file.name,
        path: file.path,
        sha: file.sha
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "ar")
      );

    return json({ articles });

  } catch {
    return json(
      { error: "حدث خطأ أثناء الاتصال بـ GitHub" },
      502
    );
  }
}
  
