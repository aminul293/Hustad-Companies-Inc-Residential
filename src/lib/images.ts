/**
 * Shared image processing utilities for the Hustad Tablet Platform.
 */

/**
 * Helper to downscale and compress images to keep storage and payload sizes manageable.
 * Defaults to 1024px width and 0.7 JPEG quality.
 */
export async function compressImage(dataUrl: string, maxWidth = 1024, quality = 0.7): Promise<string> {
  if (typeof window === "undefined") return dataUrl;
  
  // If it's not a data URL or already small enough, we might skip, 
  // but usually camera photos are large.
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
