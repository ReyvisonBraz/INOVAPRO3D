const DIRECT_MODEL_FILE_PATTERN = /\.(stl|3mf|obj|step|stp|iges|igs|zip)(\?.*)?$/i;
const DEFAULT_MODEL_IMPORT_HOSTS = ["makerworld.com", "bambulab.com", "bambulab.cn"];

export function getAllowedModelImportHosts() {
  return (process.env.MODEL_IMPORT_ALLOWED_HOSTS || DEFAULT_MODEL_IMPORT_HOSTS.join(","))
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedImportHost(hostname: string) {
  const normalizedHost = hostname.toLowerCase();
  return getAllowedModelImportHosts().some((allowedHost) =>
    normalizedHost === allowedHost || normalizedHost.endsWith(`.${allowedHost}`),
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function findMetaContent(html: string, names: string[]) {
  for (const name of names) {
    const propertyPattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const contentPattern = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`,
      "i",
    );
    const match = html.match(propertyPattern) || html.match(contentPattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return "";
}

function findTitle(html: string) {
  const title = findMetaContent(html, ["og:title", "twitter:title"]);
  if (title) return title;
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : "";
}

function resolveUrl(candidate: string, baseUrl: string) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return "";
  }
}

function basenameFromUrl(value: string) {
  const pathname = new URL(value).pathname;
  const filename = pathname.split("/").filter(Boolean).pop();
  return filename || "Modelo importado";
}

function findDirectModelUrl(html: string, baseUrl: string, originalUrl: string) {
  if (DIRECT_MODEL_FILE_PATTERN.test(originalUrl)) {
    return originalUrl;
  }

  const hrefPattern = /href=["']([^"']+\.(?:stl|3mf|obj|step|stp|iges|igs|zip)(?:\?[^"']*)?)["']/i;
  const match = html.match(hrefPattern);
  return match?.[1] ? resolveUrl(match[1], baseUrl) : "";
}

export async function readModelMetadata(rawUrl: string) {
  const targetUrl = new URL(rawUrl.trim());
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return { status: 400, body: { error: "Informe uma URL publica http ou https." } };
  }
  if (!isAllowedImportHost(targetUrl.hostname)) {
    return {
      status: 400,
      body: {
        error: `Host nao permitido para importacao: ${targetUrl.hostname}`,
        allowedHosts: getAllowedModelImportHosts(),
      },
    };
  }

  const response = await fetch(targetUrl, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent": "INOVAPRO3D catalog metadata importer",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    return { status: 502, body: { error: `Nao foi possivel ler o link. Status ${response.status}.` } };
  }

  const finalUrl = response.url || targetUrl.toString();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return {
      status: 200,
      body: {
        title: basenameFromUrl(finalUrl),
        description: "",
        images: [],
        sourceUrl: finalUrl,
        modelUrl: DIRECT_MODEL_FILE_PATTERN.test(finalUrl) ? finalUrl : "",
        sourceHost: new URL(finalUrl).hostname,
      },
    };
  }

  const html = await response.text();
  const image = findMetaContent(html, ["og:image", "twitter:image", "image"]);
  const description = findMetaContent(html, ["og:description", "twitter:description", "description"]);
  const title = findTitle(html);
  const canonical = findMetaContent(html, ["og:url"]) || finalUrl;

  return {
    status: 200,
    body: {
      title,
      description,
      images: image ? [resolveUrl(image, finalUrl)] : [],
      sourceUrl: canonical,
      modelUrl: findDirectModelUrl(html, finalUrl, finalUrl),
      sourceHost: new URL(finalUrl).hostname,
    },
  };
}
