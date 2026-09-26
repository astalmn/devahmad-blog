
const SITE = "https://devahmad-blog.pages.dev";
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

function decodeBase64Url(value) {
  const binary = atob(
    value.replace(/-/g, "+").replace(/_/g, "/")
  );

  return Uint8Array.from(
    binary,
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
    const [iv, encrypted] = cookie.split(".");

    if (!iv || !encrypted) return null;

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
        iv: decodeBase64Url(iv)
      },
      key,
      decodeBase64Url(encrypted)
    );

    const session = JSON.parse(
      new TextDecoder().decode(plaintext)
    );

    if (
      typeof session.token !== "string" ||
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

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + 8192)
    );
  }

  return btoa(binary);
}

async function handle(request, env, action) {
  if (
    request.headers.get("Origin") !== SITE ||
    !request.headers.get("Content-Type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return json({ error: "Invalid request" }, 403);
  }

  const session = await readSession(
    request,
    env.GITHUB_CLIENT_SECRET
  );

  if (!session) {
    return json(
      { error: "انتهت جلسة تسجيل الدخول" },
      401
    );
  }

  let input;

  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { slug, sha, content } = input;

  if (
    typeof slug !== "string" ||
    !/^[a-zA-Z0-9_-]{1,150}$/.test(slug) ||
    typeof sha !== "string" ||
    !/^[a-f0-9]{40}$/.test(sha)
  ) {
    return json(
      { error: "بيانات المقال غير صالحة" },
      400
    );
  }

  if (
    action === "update" &&
    (
      typeof content !== "string" ||
      !content.startsWith("---\n") ||
      content.length > 500000
    )
  ) {
    return json(
      { error: "محتوى المقال غير صالح" },
      400
    );
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + session.token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DevAhmad-Editor"
  };

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

    const repository =
      await permissionResponse.json();

    if (!repository.permissions?.push) {
      return json(
        { error: "لا تمتلك صلاحية تعديل المقالات" },
        403
      );
    }

    const path = FOLDER + "/" + slug + ".md";

    // التحقق من أن المقال لم يتغير منذ فتحه
    const currentResponse = await fetch(
      "https://api.github.com/repos/" +
        REPO + "/contents/" +
        path + "?ref=main",
      { headers }
    );

    if (currentResponse.status === 404) {
      return json(
        { error: "المقال غير موجود" },
        404
      );
    }

    if (!currentResponse.ok) {
      return json(
        { error: "تعذر قراءة المقال الحالي" },
        502
      );
    }

    const current = await currentResponse.json();

    if (current.sha !== sha) {
      return json(
        {
          error:
            "تغير المقال في GitHub منذ فتحه. " +
            "أعد تحميله قبل المتابعة."
        },
        409
      );
    }

    const githubResponse = await fetch(
      "https://api.github.com/repos/" +
        REPO + "/contents/" + path,
      {
        method:
          action === "delete" ? "DELETE" : "PUT",

        headers: {
          ...headers,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message:
            (action === "delete"
              ? "Delete article: "
              : "Update article: ") + slug,

          sha,

          branch: "main",

          ...(action === "update"
            ? { content: encodeBase64(content) }
            : {})
        })
      }
    );

    if (
      githubResponse.status === 409 ||
      githubResponse.status === 422
    ) {
      return json(
        {
          error:
            "تعارض مع تعديل أحدث. " +
            "أعد تحميل المقال."
        },
        409
      );
    }

    if (!githubResponse.ok) {
      return json(
        { error: "فشلت العملية في GitHub" },
        502
      );
    }

    const result = await githubResponse.json();

    return json({
      success: true,
      action,
      slug,
      sha: result.content?.sha || null
    });

  } catch {
    return json(
      { error: "تعذر الاتصال بـ GitHub" },
      502
    );
  }
}

export async function onRequestPut({ request, env }) {
  return handle(request, env, "update");
}

export async function onRequestDelete({ request, env }) {
  return handle(request, env, "delete");
        }
    
