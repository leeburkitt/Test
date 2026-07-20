/**
 * Downscales an image client-side before upload. Phone camera photos are
 * often 5-15MB at full resolution — far more detail than reading a label
 * needs, and large enough to fail on a real mobile connection. 1600px on
 * the long edge at JPEG 0.85 keeps text legible while typically landing
 * well under 1MB.
 */
export async function resizeImageFile(file: File, maxDimension = 1600, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}
