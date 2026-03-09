"use client";

import { useState, useEffect, useRef } from "react";

const ease = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

interface FadeImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  /** Preload immediately even if not rendered yet */
  preload?: boolean;
}

/**
 * Image with smooth opacity fade-in on load.
 * Starts invisible, fades in once the image is decoded & ready.
 */
export function FadeImage({
  src,
  alt = "",
  className = "",
  style,
  loading = "eager",
}: FadeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If the image is already cached by the browser, onLoad fires synchronously
  // before React can attach the handler. Check on mount.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalHeight > 0) {
      setLoaded(true);
    }
  }, []);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onLoad={() => setLoaded(true)}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: `opacity 0.6s ${ease}`,
      }}
    />
  );
}

/** Preload a list of image URLs into the browser cache */
export function preloadImages(urls: string[]) {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}
