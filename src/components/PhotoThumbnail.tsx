"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { InspectionPhoto } from "@/types/session";
import { getPhotoObjectURL } from "@/lib/photoStorage";

interface PhotoThumbnailProps {
  photo: InspectionPhoto;
  className?: string;
}

/**
 * SHARED PHOTO THUMBNAIL (v2)
 * Intelligent source resolution for forensic photos.
 * Order: Remote Cloud URL -> Local IndexedDB Blob -> Legacy Base64 Fallback
 */
export function PhotoThumbnail({ photo, className }: PhotoThumbnailProps) {
  const [url, setUrl] = useState<string | null>(
    photo.remoteUrl || 
    (photo.localUri && photo.localUri.startsWith("data:") ? photo.localUri : null)
  );

  useEffect(() => {
    // If we already have a remote URL or legacy base64, we're done
    if (photo.remoteUrl || (photo.localUri && photo.localUri.startsWith("data:"))) {
      setUrl(photo.remoteUrl || photo.localUri!);
      return;
    }

    // Attempt to load from IndexedDB
    let isMounted = true;
    getPhotoObjectURL(photo.storageKey).then((blobUrl) => {
      if (isMounted && blobUrl) {
        setUrl(blobUrl);
      }
    });

    return () => {
      isMounted = false;
      // Note: Object URLs are memoized in the storage layer to avoid excessive recreation.
      // We do not revoke them here to allow back/forth navigation without flickering.
    };
  }, [photo.remoteUrl, photo.localUri, photo.storageKey]);

  if (!url) {
    return (
      <div className={cn("bg-white/5 flex items-center justify-center animate-pulse", className)}>
        <RefreshCw className="w-4 h-4 text-white/10 animate-spin" />
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={photo.label || "Inspection photo"} 
      className={cn("object-cover", className)}
      loading="lazy"
    />
  );
}
