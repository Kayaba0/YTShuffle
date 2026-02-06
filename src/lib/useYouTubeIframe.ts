import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type Options = {
  onEnded?: () => void;
  onError?: () => void;
};

type PlayerApi = {
  isReady: boolean;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  mountRef: React.RefObject<HTMLDivElement>;
};

function loadYouTubeIframeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

export function useYouTubeIframe(videoId: string, options?: Options): PlayerApi {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const onEndedRef = useRef(options?.onEnded);
  const onErrorRef = useRef(options?.onError);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    onEndedRef.current = options?.onEnded;
    onErrorRef.current = options?.onError;
  }, [options?.onEnded, options?.onError]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await loadYouTubeIframeApi();
      if (cancelled || !mountRef.current) return;

      if (playerRef.current) return;

      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setIsReady(true);
            setIsPlaying(true);
          },
          onStateChange: (e: any) => {
            if (e.data === 1) setIsPlaying(true);
            if (e.data === 2) setIsPlaying(false);
            if (e.data === 0) onEndedRef.current?.();
          },
          onError: () => {
            // Skip immediately if video is unavailable
            onErrorRef.current?.();
          },
        },
      });
    }

    init();

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.loadVideoById(videoId);
    } catch {}
  }, [videoId]);

  const api = useMemo<PlayerApi>(() => {
    return {
      isReady,
      isPlaying,
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      toggle: () => (isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()),
      mountRef,
    };
  }, [isReady, isPlaying]);

  return api;
}
