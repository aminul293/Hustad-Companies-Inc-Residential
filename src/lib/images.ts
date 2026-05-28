/**
 * Shared image processing utilities for the Hustad Tablet Platform.
 */

/**
 * Helper to downscale and compress images to keep storage and payload sizes manageable.
 * Defaults to 1024px width and 0.7 JPEG quality.
 */
export async function compressImage(dataUrl: string, maxWidth = 1024, quality = 0.7): Promise<string> {
  if (typeof window === "undefined") return dataUrl;
  
  if (!dataUrl || typeof dataUrl !== "string" || (!dataUrl.startsWith("data:") && !dataUrl.startsWith("http"))) {
    return dataUrl;
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    if (dataUrl.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      try {
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
      } catch (err) {
        console.warn("[compressImage] Failed to compress image (likely tainted canvas/CORS):", err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
