// Decide how a file should be previewed.
//
// The stored contentType is the first source of truth, but records uploaded
// before it was captured have none, so fall back to the file extension.

const EXTENSION_KINDS = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  pdf: "pdf",
  mp4: "video",
  webm: "video",
  mov: "video",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  txt: "text",
  md: "text",
  csv: "text",
  json: "text",
  js: "text",
  jsx: "text",
  ts: "text",
  css: "text",
  html: "text",
  yml: "text",
  yaml: "text",
};

export function previewKind(fileName, contentType) {
  if (contentType) {
    if (contentType.startsWith("image/")) {
      return "image";
    }
    if (contentType.startsWith("video/")) {
      return "video";
    }
    if (contentType.startsWith("audio/")) {
      return "audio";
    }
    if (contentType === "application/pdf") {
      return "pdf";
    }
    if (contentType.startsWith("text/") || contentType === "application/json") {
      return "text";
    }
  }
  const extension = fileName.split(".").pop()?.toLowerCase();
  return EXTENSION_KINDS[extension] ?? "none";
}
