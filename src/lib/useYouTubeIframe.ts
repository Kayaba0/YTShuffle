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
  currentTime: number;
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
  const pendingVideoIdRef = useRef<string | null>(null);
  const onEndedRef = useRef(options?.onEnded);
  const onErrorRef = useRef(options?.onError);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    onEndedRef.current = options?.onEnded;
    onErrorRef.current = options?.onError;
  }, [options?.onEnded, options?.onError]);

  useEffect(() => {
    async function init() {
      if (!videoId) return;
      await loadYouTubeIframeApi();
      if (!mountRef.current) return;
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
            setIsReady(true);
            const pending = pendingVideoIdRef.current;
            if (pending) {
              pendingVideoIdRef.current = null;
              try {
                playerRef.current?.loadVideoById(pending);
              } catch {}
            }
          },
          onStateChange: (e: any) => {
            if (e.data === 1) setIsPlaying(true);
            if (e.data === 2) setIsPlaying(false);
            if (e.data === 0) {
              setIsPlaying(false);
              setCurrentTime(0);
              onEndedRef.current?.();
            }
          },
          onError: () => {
            onErrorRef.current?.();
          },
        },
      });
    }

    init();
  }, [videoId]);

  useEffect(() => {
    return () => {
      try {
        playerRef.current?.destroy();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!videoId) return;
    if (!playerRef.current) return;

    if (!isReady) {
      pendingVideoIdRef.current = videoId;
      return;
    }

    setCurrentTime(0);

    try {
      const current = playerRef.current?.getVideoData?.()?.video_id as string | undefined;
      if (current !== videoId) {
        playerRef.current.loadVideoById(videoId);
      }
    } catch {
      try {
        playerRef.current.loadVideoById(videoId);
      } catch {}
    }
  }, [videoId, isReady]);

  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    const interval = window.setInterval(() => {
      try {
        const t = Number(playerRef.current?.getCurrentTime?.() ?? 0);
        if (Number.isFinite(t)) setCurrentTime(t);
      } catch {}
    }, 250);

    return () => window.clearInterval(interval);
  }, [isReady]);

  const api = useMemo<PlayerApi>(() => {
    return {
      isReady,
      isPlaying,
      currentTime,
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      toggle: () => (isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()),
      mountRef,
    };
  }, [isReady, isPlaying, currentTime]);

  return api;
}
