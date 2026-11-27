// Shrinks a picture on the phone before it is saved or uploaded. A 6 MB camera
// photo becomes roughly 60-150 KB, so uploads are quick, cheap on mobile data and
// never hit the server's 5 MB limit.

export const MAX_SIDE = 1024; // longest side in pixels
export const QUALITY = 0.8;

// the size a picture should be scaled to: never bigger than before, never above max
export function fitWithin(width, height, max = MAX_SIDE) {
  const longest = Math.max(width, height);
  const scale = longest > max ? max / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const toBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// Returns a smaller picture (a Blob), or the original file if it cannot be improved.
export async function compressImage(file, { maxSide = MAX_SIDE, quality = QUALITY } = {}) {
  // GIFs and SVGs would lose animation or sharpness, so they are left alone
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let bitmap;
  try {
    // "from-image" turns photos the right way up, as the phone's camera meant
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // the browser could not read it; keep the original
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    // WebP is smallest; older Safari silently gives PNG instead, so fall back to JPEG
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob(canvas, "image/jpeg", quality);
    }
    if (!blob) return file;
    return blob.size < file.size ? blob : file;
  } finally {
    bitmap.close?.();
  }
}
