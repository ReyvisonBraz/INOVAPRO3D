const DIRECT_MODEL_FILE_PATTERN = /\.(stl|3mf|obj|step|stp|iges|igs|zip)(\?.*)?$/i;
const DEFAULT_MODEL_IMPORT_HOSTS = ["makerworld.com", "bambulab.com", "bambulab.cn"];
const BAMBU_API_BASE_URL = "https://api.bambulab.com/v1/design-service/design";

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

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<boostme>[\s\S]*?<\/boostme>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function looksEnglish(text: string): boolean {
  const m = text.match(/\b(the|and|with|for|this|that|from|your|print(?:ed|able)?|model|file|design|object|thing|remix|base|stand|holder|bracket|wall|ring|box|clip)\b/gi);
  return (m?.length ?? 0) >= 2;
}

async function translateToPtBR(text: string): Promise<string> {
  if (!text.trim() || !looksEnglish(text)) return text;
  // Skip translation for long texts — MyMemory caps at 500 chars; truncating would silently drop content
  if (text.length > 500) return text;
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-BR`,
    );
    if (!res.ok) return text;
    const data = (await res.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText.trim();
    }
  } catch { /* silent fallback */ }
  return text;
}

// Strips common site-name suffixes and noisy 3D-printing prefixes from titles
function cleanRawTitle(title: string): string {
  return title
    .replace(/\s*[|\-–—]\s*(Thingiverse|Printables|MakerWorld|Cults3D|MyMiniFactory|GrabCAD|Free 3D Models?|3D Models?|STL Files?|Free Download).*$/i, "")
    .replace(/^(3D Printed?|Printable|FDM)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function secondsToPrintTime(seconds?: number) {
  if (!seconds || seconds <= 0) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function parseMakerWorldLink(url: URL) {
  const isMakerWorldHost =
    url.hostname.toLowerCase() === "makerworld.com" ||
    url.hostname.toLowerCase().endsWith(".makerworld.com");
  if (!isMakerWorldHost) return null;

  const designId = url.pathname.match(/\/models\/(\d+)/i)?.[1];
  if (!designId) return null;

  const profileId = url.hash.match(/profileId-(\d+)/i)?.[1] || "";
  return { designId, profileId };
}

function getImageUrlsFromPictures(pictures: unknown) {
  if (!Array.isArray(pictures)) return [];
  return pictures
    .map((picture) => {
      if (!picture || typeof picture !== "object") return "";
      const url = (picture as { url?: unknown }).url;
      return typeof url === "string" ? url : "";
    })
    .filter(Boolean);
}

function pickMakerWorldInstance(instances: unknown, profileId: string) {
  if (!Array.isArray(instances)) return null;
  const typedInstances = instances.filter(
    (instance): instance is Record<string, any> => !!instance && typeof instance === "object",
  );
  return (
    typedInstances.find((instance) => String(instance.id) === profileId) ||
    typedInstances.find((instance) => String(instance.profileId) === profileId) ||
    typedInstances.find((instance) => Boolean(instance.isDefault)) ||
    typedInstances[0] ||
    null
  );
}

function buildMakerWorldSourceUrl(targetUrl: URL, design: Record<string, any>) {
  const slug = typeof design.slug === "string" && design.slug ? `-${design.slug}` : "";
  return `${targetUrl.origin}${targetUrl.pathname.includes("/pt/") ? "/pt" : "/en"}/models/${design.id}${slug}`;
}

async function readMakerWorldMetadata(targetUrl: URL) {
  const makerWorldLink = parseMakerWorldLink(targetUrl);
  if (!makerWorldLink) return null;

  const response = await fetch(`${BAMBU_API_BASE_URL}/${makerWorldLink.designId}`, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      "origin": "https://makerworld.com",
      "referer": targetUrl.toString(),
    },
    redirect: "follow",
  });

  if (!response.ok) {
    return null;
  }

  const design = (await response.json()) as Record<string, any>;
  const instance = pickMakerWorldInstance(design.instances, makerWorldLink.profileId);
  const modelInfo = instance?.extention?.modelInfo;
  const settings = modelInfo?.projectSettings || {};
  const plates = Array.isArray(modelInfo?.plates) ? modelInfo.plates : [];
  const firstPlate = plates[0] || {};
  const images = [
    ...(typeof instance?.cover === "string" ? [instance.cover] : []),
    ...getImageUrlsFromPictures(instance?.pictures),
    ...(typeof design.coverUrl === "string" ? [design.coverUrl] : []),
    ...getImageUrlsFromPictures(design.designExtension?.design_pictures),
  ];

  const uniqueImages = Array.from(new Set(images.filter(Boolean)));
  const tags = Array.isArray(design.tagsTranslated) && design.tagsTranslated.length > 0
    ? design.tagsTranslated
    : Array.isArray(design.tags)
      ? design.tags
      : [];

  const rawTitle = cleanRawTitle(design.titleTranslated || design.title || "Modelo MakerWorld");
  const rawDesc = stripHtml(design.summaryTranslated || design.summary || "");
  const [translatedTitle, translatedDesc] = await Promise.all([
    translateToPtBR(rawTitle),
    translateToPtBR(rawDesc),
  ]);

  return {
    status: 200,
    body: {
      title: translatedTitle || rawTitle,
      description: translatedDesc || rawDesc,
      images: uniqueImages,
      sourceUrl: buildMakerWorldSourceUrl(targetUrl, design),
      modelUrl: "",
      sourceHost: targetUrl.hostname,
      license: design.license || design.licenseDescriptionInfo?.title || "",
      author: design.designCreator?.name || "",
      tags,
      technical: {
        infill: parseInt(String(settings.sparseInfillDensity || "").replace(/\D/g, ""), 10) || undefined,
        resolution: settings.layerHeight ? `${settings.layerHeight}mm` : undefined,
        printTime: secondsToPrintTime(instance?.prediction || firstPlate.prediction),
        weight: Number(instance?.weight || firstPlate.weight) || undefined,
      },
    },
  };
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

  const makerWorldMetadata = await readMakerWorldMetadata(targetUrl);
  if (makerWorldMetadata) {
    return makerWorldMetadata;
  }

  const response = await fetch(targetUrl, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    if (response.status === 403) {
      return {
        status: 502,
        body: {
          error:
            "O site bloqueou a leitura automatica deste link. Se for MakerWorld, confira se a URL contem /models/ID.",
        },
      };
    }
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
  const rawDescription = stripHtml(findMetaContent(html, ["og:description", "twitter:description", "description"]));
  const rawTitle = cleanRawTitle(findTitle(html));
  const canonical = findMetaContent(html, ["og:url"]) || finalUrl;

  const [translatedTitle, translatedDesc] = await Promise.all([
    translateToPtBR(rawTitle),
    translateToPtBR(rawDescription),
  ]);

  return {
    status: 200,
    body: {
      title: translatedTitle || rawTitle,
      description: translatedDesc || rawDescription,
      images: image ? [resolveUrl(image, finalUrl)] : [],
      sourceUrl: canonical,
      modelUrl: findDirectModelUrl(html, finalUrl, finalUrl),
      sourceHost: new URL(finalUrl).hostname,
    },
  };
}
