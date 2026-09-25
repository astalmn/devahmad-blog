
const SITE = "https://devahmad-blog.pages.dev";
const REPO = "astalmn/devahmad-blog";

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
    const [iv, ciphertext] = cookie.split(".");

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
        iv: fromBase64Url(iv)
      },
      key,
      fromBase64Url(ciphertext)
    );

    const session = JSON.parse(
      new TextDecoder().decode(plaintext)
    );

    if (
      !session.token ||
      Date.now() >= session.expires
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function yamlString(value) {
  return JSON.stringify(String(value));
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

export async function onRequestPost({ request, env }) {
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
      { error: "Session expired. Sign in again." },
      401
    );
  }

  let article;

  try {
    article = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const {
    title,
    slug,
    description,
    date,
    category,
    tags = [],
    cover = "",
    body,
    draft = false,
    featured = false
  } = article;

  if (
    typeof slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 100 ||
    ![title, description, category, body].every(
      value =>
        typeof value === "string" &&
        value.trim().length > 0
    ) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    !Array.isArray(tags) ||
    tags.length > 30 ||
    !tags.every(tag => typeof tag === "string") ||
    typeof cover !== "string" ||
    typeof draft !== "boolean" ||
    typeof featured !== "boolean"
  ) {
    return json({ error: "Invalid article data" }, 400);
  }

  const githubHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + session.token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DevAhmad-Editor"
  };

  try {
    const permissionResponse = await fetch(
      "https://api.github.com/repos/" + REPO,
      { headers: githubHeaders }
    );

    if (!permissionResponse.ok) {
      return json(
        { error: "GitHub permission check failed" },
        502
      );
    }

    const repository = await permissionResponse.json();

    if (!repository.permissions?.push) {
      return json(
        { error: "No publishing permission" },
        403
      );
    }

    const lines = [
      "---",
      "title: " + yamlString(title.trim()),
      "description: " + yamlString(description.trim()),
      "date: " + yamlString(date),
      "category: " + yamlString(category.trim()),
      "tags: [" +
        tags.map(tag => yamlString(tag.trim())).join(", ") +
        "]",
      "lang: ar",
      "draft: " + draft,
      "featured: " + featured
    ];

    if (cover.trim()) {
      lines.push(
        "cover: " + yamlString(cover.trim())
      );
    }

    lines.push("---", "", body, "");

    const path = "src/content/blog/" + slug + ".md";

    const response = await fetch(
      "https://api.github.com/repos/" +
        REPO + "/contents/" + path,
      {
        method: "PUT",
        headers: {
          ...githubHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Add article: " + title.trim(),
          content: encodeBase64(lines.join("\n")),
          branch: "main"
        })
      }
    );

    if (response.status === 422) {
      return json(
        { error: "Article slug already exists" },
        409
      );
    }

    if (!response.ok) {
      return json(
        { error: "GitHub publishing failed" },
        502
      );
    }

    return json({
      success: true,
      path
    });
  } catch {
    return json(
      { error: "Unable to publish article" },
      502
    );
  }
        }
    
