const allowedTags = new Set([
  "p",
  "h2",
  "h3",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "iframe",
  "br",
]);

function cleanUrl(value: string) {
  const trimmed = value.trim();

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed.replace(/"/g, "&quot;");
  }

  return "";
}

function getAttribute(attributes: string, name: string) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  return attributes.match(pattern)?.[1] ?? "";
}

function cleanYoutubeEmbedUrl(value: string) {
  const trimmed = value.trim();
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/,
    /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ];

  for (const pattern of patterns) {
    const videoId = trimmed.match(pattern)?.[1];

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  return "";
}

export function sanitizeHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, rawTag, attributes) => {
      const tag = rawTag.toLowerCase();
      const isClosing = match.startsWith("</");

      if (!allowedTags.has(tag)) {
        return "";
      }

      if (isClosing) {
        return tag === "br" || tag === "img" ? "" : `</${tag}>`;
      }

      if (tag === "a") {
        const href = cleanUrl(getAttribute(attributes, "href"));
        return href
          ? `<a href="${href}" target="_blank" rel="noopener noreferrer">`
          : "<a>";
      }

      if (tag === "img") {
        const src = cleanUrl(getAttribute(attributes, "src"));
        const alt = getAttribute(attributes, "alt").replace(/"/g, "&quot;");
        return src ? `<img src="${src}" alt="${alt}" />` : "";
      }

      if (tag === "iframe") {
        const src = cleanYoutubeEmbedUrl(getAttribute(attributes, "src"));
        const title =
          getAttribute(attributes, "title").replace(/"/g, "&quot;") ||
          "YouTube video";

        return src
          ? `<iframe src="${src}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen>`
          : "";
      }

      return tag === "br" ? "<br />" : `<${tag}>`;
    })
    .replace(/\s(on[a-z]+|style|class|id)=["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}
