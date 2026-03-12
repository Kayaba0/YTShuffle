import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiSkipBack,
  FiSkipForward,
  FiPlay,
  FiPause,
  FiShuffle,
} from "react-icons/fi";
import type { PlaylistItem } from "../types/youtube";
import { useYouTubeIframe } from "../lib/useYouTubeIframe";

type Props = {
  playlistId: string;
  items: PlaylistItem[];
  shuffledIds: string[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onReshuffle: () => void;
  onSelectVideo: (videoId: string) => void;
  onBackHome: () => void;
};

type LyricLine = {
  time: number;
  text: string;
};

type LyricsState = {
  plainLyrics: string;
  syncedLyrics: string;
  sourceLabel: string;
};

const EMPTY_LYRICS: LyricsState = {
  plainLyrics: "Lyrics non trovate.",
  syncedLyrics: "",
  sourceLabel: "",
};

export default function Player(props: Props) {
  const { items, shuffledIds, currentIndex } = props;

  const currentVideoId = shuffledIds[currentIndex];
  const currentItem = items.find((x) => x.videoId === currentVideoId) ?? items[0];

  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsState, setLyricsState] = useState<LyricsState>(EMPTY_LYRICS);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  const yt = useYouTubeIframe(currentVideoId, {
    onEnded: props.onNext,
    onError: props.onNext,
  });

  const orderedList = useMemo(() => {
    const map = new Map(items.map((x) => [x.videoId, x]));
    return shuffledIds
      .map((id, idx) => ({ idx, item: map.get(id) }))
      .filter((x) => Boolean(x.item));
  }, [items, shuffledIds]);

  const listRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const el = list.querySelector('[data-active="true"]') as HTMLElement | null;
    if (!el) return;

    const id = requestAnimationFrame(() => {
      const target = el.offsetTop - list.clientHeight * 0.35;
      const max = Math.max(0, list.scrollHeight - list.clientHeight);
      const clamped = Math.max(0, Math.min(max, target));
      list.scrollTo({ top: clamped, behavior: "smooth" });
    });

    return () => cancelAnimationFrame(id);
  }, [currentIndex]);

  const lyricsCacheRef = useRef<Map<string, LyricsState>>(new Map());

  useEffect(() => {
    if (!showLyrics || !currentItem?.title) return;

    let cancelled = false;
    const cacheKey = currentItem.videoId;
    const cached = lyricsCacheRef.current.get(cacheKey);
    if (cached) {
      setLyricsState(cached);
      return;
    }

    async function fetchLyrics() {
      setLoadingLyrics(true);
      setLyricsState({ plainLyrics: "", syncedLyrics: "", sourceLabel: "" });

      try {
        const queries = buildLyricsQueries(currentItem.title, currentItem.channelTitle);
        const result = await fetchLyricsFromQueries(queries, currentItem.title, currentItem.channelTitle);
        const finalState = result ?? EMPTY_LYRICS;

        if (!cancelled) {
          lyricsCacheRef.current.set(cacheKey, finalState);
          setLyricsState(finalState);
        }
      } catch {
        if (!cancelled) setLyricsState({ plainLyrics: "Errore nel recupero lyrics.", syncedLyrics: "", sourceLabel: "" });
      } finally {
        if (!cancelled) setLoadingLyrics(false);
      }
    }

    fetchLyrics();

    return () => {
      cancelled = true;
    };
  }, [showLyrics, currentItem?.videoId, currentItem?.title, currentItem?.channelTitle]);

  const syncedLines = useMemo(() => parseSyncedLyrics(lyricsState.syncedLyrics), [lyricsState.syncedLyrics]);
  const activeLyricIndex = useMemo(() => {
    if (!syncedLines.length) return -1;

    const compensatedTime = Math.max(0, yt.currentTime + 0.18);
    let low = 0;
    let high = syncedLines.length - 1;
    let idx = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (syncedLines[mid].time <= compensatedTime) {
        idx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return idx;
  }, [syncedLines, yt.currentTime]);

  const mobileLyricsScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopLyricsScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileActiveLineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const desktopActiveLineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const previousMobileActiveLyricIndexRef = useRef(-1);
  const previousDesktopActiveLyricIndexRef = useRef(-1);

  useEffect(() => {
    previousMobileActiveLyricIndexRef.current = -1;
    previousDesktopActiveLyricIndexRef.current = -1;
  }, [currentVideoId, showLyrics, lyricsState.syncedLyrics]);

  useEffect(() => {
    if (!showLyrics || activeLyricIndex < 0) return;
    if (previousMobileActiveLyricIndexRef.current === activeLyricIndex) return;
    previousMobileActiveLyricIndexRef.current = activeLyricIndex;

    const container = mobileLyricsScrollRef.current;
    const line = mobileActiveLineRefs.current[activeLyricIndex];
    if (!container || !line) return;

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const lineTop = line.offsetTop;
    const lineBottom = lineTop + line.offsetHeight;
    const upperBand = containerTop + container.clientHeight * 0.2;
    const lowerBand = containerTop + container.clientHeight * 0.8;
    const targetTop = Math.max(0, lineTop - container.clientHeight * 0.24);

    if (lineTop < upperBand || lineBottom > lowerBand || lineTop < containerTop || lineBottom > containerBottom) {
      container.scrollTo({ top: targetTop, behavior: "smooth" });
    }
  }, [activeLyricIndex, showLyrics]);

  useEffect(() => {
    if (!showLyrics || activeLyricIndex < 0) return;
    if (previousDesktopActiveLyricIndexRef.current === activeLyricIndex) return;
    previousDesktopActiveLyricIndexRef.current = activeLyricIndex;

    const container = desktopLyricsScrollRef.current;
    const line = desktopActiveLineRefs.current[activeLyricIndex];
    if (!container || !line) return;

    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const lineTop = line.offsetTop;
    const lineBottom = lineTop + line.offsetHeight;
    const upperBand = containerTop + container.clientHeight * 0.22;
    const lowerBand = containerTop + container.clientHeight * 0.72;
    const targetTop = Math.max(0, lineTop - container.clientHeight * 0.22);

    if (lineTop < upperBand || lineBottom > lowerBand || lineTop < containerTop || lineBottom > containerBottom) {
      container.scrollTo({ top: targetTop, behavior: "auto" });
    }
  }, [activeLyricIndex, showLyrics]);

  const mainColumn = (
    <div className="w-full max-w-5xl space-y-4 overflow-visible">
      <button
        type="button"
        onClick={props.onBackHome}
        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/35 backdrop-blur-glass h-11 w-11 hover:bg-white/10 transition"
        aria-label="Torna alla home"
        title="Torna alla home"
      >
        <FiArrowLeft className="text-[20px] text-white/80" />
      </button>

      <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-glass backdrop-blur-glass p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mt-1 font-semibold tracking-tight truncate">
              {currentItem?.title ?? "—"}
            </div>
            <div className="mt-1 text-xs text-white/55 truncate">
              {currentItem?.channelTitle ?? ""}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLyrics((v) => !v)}
            className={[
              "shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold tracking-[0.18em] backdrop-blur-glass transition",
              showLyrics
                ? "border-white/20 bg-white/14 text-white hover:bg-white/18"
                : "border-white/10 bg-black/35 text-white/85 hover:bg-white/10",
              "border xl:border-white/10 xl:bg-black/35 xl:text-white/85 xl:hover:bg-white/10",
            ].join(" ")}
          >
            LYRICS
          </button>
        </div>

        <div className="mt-5 rounded-2xl overflow-hidden border border-white/10 bg-black/45">
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <div ref={yt.mountRef} className="absolute inset-0 h-full w-full" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
            <GlassIconButton onClick={props.onPrev} label="Prev" icon={<FiSkipBack />} tone="cool" />
            <GlassIconButton
              onClick={yt.toggle}
              label={yt.isPlaying ? "Pause" : "Play"}
              icon={yt.isPlaying ? <FiPause /> : <FiPlay />}
              tone="hot"
              big
            />
            <GlassIconButton onClick={props.onNext} label="Next" icon={<FiSkipForward />} tone="cool" />
            <div className="mx-1 h-7 w-px bg-white/10" />
            <GlassIconButton onClick={props.onReshuffle} label="Reshuffle" icon={<FiShuffle />} tone="purple" />
          </div>
        </div>
      </div>

      {showLyrics && (
        <div className="xl:hidden rounded-[28px] border border-white/10 bg-white/5 shadow-glass backdrop-blur-glass p-4 md:p-6">
          <div
            ref={mobileLyricsScrollRef}
            className="max-h-[60vh] overflow-y-auto overflow-x-hidden overscroll-contain pr-2"
          >
            {loadingLyrics ? (
              <div className="pt-2 text-sm text-white/60">Loading lyrics...</div>
            ) : syncedLines.length > 0 ? (
              <div className="space-y-2 pb-2">
                {syncedLines.map((line, index) => {
                  const active = index === activeLyricIndex;
                  const passed = index < activeLyricIndex;
                  return (
                    <div
                      key={`${line.time}-${index}`}
                      ref={(node) => {
                        mobileActiveLineRefs.current[index] = node;
                      }}
                      className={[
                        "rounded-2xl px-3 py-2 text-[14px] leading-[1.35] transition-colors duration-75",
                        active
                          ? "border border-white/30 bg-white/[0.05] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.07)]"
                          : passed
                          ? "border border-transparent text-white/70"
                          : "border border-transparent text-white/48",
                      ].join(" ")}
                    >
                      {line.text}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.35] text-white/78">
                {lyricsState.plainLyrics || "Lyrics non trovate."}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-glass backdrop-blur-glass p-4 md:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold tracking-tight">Video list</div>
          </div>

          <div className="text-xs text-white/60">
            <span className="font-semibold text-white/85">{currentIndex + 1}</span> / {shuffledIds.length}
          </div>
        </div>

        <div ref={listRef} className="mt-4 h-[560px] overflow-y-auto overflow-x-hidden pr-1">
          <div className="space-y-4">
            {orderedList.map(({ idx, item }) => {
              const it = item!;
              const active = idx === currentIndex;

              return (
                <motion.button
                  key={`${it.videoId}-${idx}`}
                  type="button"
                  data-active={active}
                  onClick={() => props.onSelectVideo(it.videoId)}
                  className={
                    active
                      ? "w-full min-w-0 rounded-2xl bg-gradient-to-r from-pink-500/35 via-orange-400/22 to-violet-500/35 p-[1px] text-left"
                      : "flex w-full min-w-0 gap-3 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-left transition hover:bg-white/8"
                  }
                  initial={false}
                  animate={{ scale: active ? 1.01 : 1 }}
                  transition={{ duration: 0.15 }}
                >
                  {active ? (
                    <div className="flex w-full gap-3 rounded-2xl border border-white/15 bg-black/35 px-3 py-2 backdrop-blur-glass transition">
                      <img
                        src={it.thumbnailUrl}
                        alt=""
                        className="h-14 w-24 shrink-0 rounded-xl border border-white/10 bg-black/40 object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs text-white/50">
                          #{idx + 1} • {it.channelTitle}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">{it.title}</div>
                      </div>

                      <div className="shrink-0 self-center rounded-full border border-white/15 bg-white/10 px-2 py-1 text-xs text-white/75">
                        Playing
                      </div>
                    </div>
                  ) : (
                    <>
                      <img
                        src={it.thumbnailUrl}
                        alt=""
                        className="h-14 w-24 shrink-0 rounded-xl border border-white/10 bg-black/40 object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs text-white/50">
                          #{idx + 1} • {it.channelTitle}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">{it.title}</div>
                      </div>
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-5xl overflow-visible pb-6">
        {mainColumn}

        {showLyrics && (
          <div className="pointer-events-none absolute left-[calc(100%+16px)] top-[60px] bottom-6 hidden w-[380px] xl:block">
            <div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-glass backdrop-blur-glass">
              <div
                ref={desktopLyricsScrollRef}
                className="h-full overflow-y-auto overflow-x-hidden overscroll-contain pr-2"
              >
                {loadingLyrics ? (
                  <div className="pt-2 text-sm text-white/60">Loading lyrics...</div>
                ) : syncedLines.length > 0 ? (
                  <div className="space-y-2 pb-2">
                    {syncedLines.map((line, index) => {
                      const active = index === activeLyricIndex;
                      const passed = index < activeLyricIndex;
                      return (
                        <div
                          key={`${line.time}-${index}`}
                          ref={(node) => {
                            desktopActiveLineRefs.current[index] = node;
                          }}
                          className={[
                            "rounded-2xl px-3 py-2 text-[14px] leading-[1.35] transition-colors duration-75",
                            active
                              ? "border border-white/30 bg-white/[0.05] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.07)]"
                              : passed
                              ? "border border-transparent text-white/70"
                              : "border border-transparent text-white/48",
                          ].join(" ")}
                        >
                          {line.text}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.35] text-white/78">
                    {lyricsState.plainLyrics || "Lyrics non trovate."}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fetchJson(url: string) {
  return fetch(url, {
    headers: {
      Accept: "application/json",
    },
  }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

type LrcLibResult = {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  plainLyrics?: string;
  syncedLyrics?: string;
};

async function fetchLyricsFromQueries(queries: string[], title: string, channelTitle: string) {
  const seen = new Set<string>();
  const normalizedNeedle = normalizeForSearch(`${title} ${channelTitle}`);

  for (const query of queries) {
    const trimmed = query.trim();
    if (!trimmed) continue;
    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const data = (await fetchJson(`https://lrclib.net/api/search?q=${encodeURIComponent(trimmed)}`)) as LrcLibResult[];
    if (!Array.isArray(data) || data.length === 0) continue;

    const ranked = data
      .filter((entry) => entry.plainLyrics || entry.syncedLyrics)
      .map((entry) => ({
        entry,
        score: scoreLyricsCandidate(entry, normalizedNeedle, trimmed),
      }))
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) continue;
    const winner = ranked[0].entry;

    return {
      plainLyrics: winner.plainLyrics || "Lyrics non trovate.",
      syncedLyrics: winner.syncedLyrics || "",
      sourceLabel: `${winner.artistName ?? ""} ${winner.trackName ?? ""}`.trim(),
    } satisfies LyricsState;
  }

  return null;
}

function scoreLyricsCandidate(entry: LrcLibResult, normalizedNeedle: string, query: string) {
  const hay = normalizeForSearch(`${entry.artistName ?? ""} ${entry.trackName ?? ""} ${entry.albumName ?? ""}`);
  const queryNorm = normalizeForSearch(query);
  const queryWords = queryNorm.split(" ").filter(Boolean);
  const needleWords = normalizedNeedle.split(" ").filter(Boolean);

  let score = 0;
  for (const word of queryWords) if (hay.includes(word)) score += 6;
  for (const word of needleWords) if (hay.includes(word)) score += 3;
  if (hay.includes(queryNorm)) score += 12;
  if (entry.syncedLyrics) score += 8;
  return score;
}

function buildLyricsQueries(title: string, channelTitle: string) {
  const cleaned = cleanVideoTitle(title);
  const artistTitle = splitArtistAndTrack(cleaned);
  const queries = [title, cleaned];

  if (artistTitle) {
    queries.push(`${artistTitle.artist} ${artistTitle.track}`);
    queries.push(`${artistTitle.track} ${artistTitle.artist}`);
  }

  const fallbackChannel = cleanChannelTitle(channelTitle);
  if (fallbackChannel && !cleaned.toLowerCase().includes(fallbackChannel.toLowerCase())) {
    queries.push(`${fallbackChannel} ${cleaned}`);
    if (artistTitle) queries.push(`${fallbackChannel} ${artistTitle.track}`);
  }

  queries.push(removeFeaturingNoise(cleaned));

  return Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
}

function cleanVideoTitle(input: string) {
  return input
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*(official|video|visualizer|lyrics?|audio|mv|hd|4k|hq|ver\.?|version|live|remaster(ed)?|performance|prod\.?|feat\.?|ft\.?|sub\.? espanol|english lyrics?|romanized|ost|soundtrack)[^)]*\)/gi, " ")
    .replace(/\b(official|video|visualizer|lyrics?|audio|mv|hd|4k|hq|remaster(ed)?|performance|prod\.? by|topic)\b/gi, " ")
    .replace(/[|•]/g, " - ")
    .replace(/[_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function removeFeaturingNoise(input: string) {
  return input
    .replace(/\b(feat\.?|ft\.?)\s+[^-–—,(\[]+/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanChannelTitle(input: string) {
  return input
    .replace(/\b(official|vevo|topic)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitArtistAndTrack(input: string) {
  const match = input.match(/^(.+?)\s[-–—]\s(.+)$/);
  if (!match) return null;
  return {
    artist: match[1].trim(),
    track: match[2].trim(),
  };
}

function normalizeForSearch(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseSyncedLyrics(input: string): LyricLine[] {
  if (!input) return [];

  return input
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/);
      if (!match) return null;
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = Number(match[3] ?? "0");
      const fractionSeconds = String(match[3] ?? "").length === 3 ? fraction / 1000 : fraction / 100;
      const text = match[4].trim();
      if (!text) return null;
      return {
        time: minutes * 60 + seconds + fractionSeconds,
        text,
      } satisfies LyricLine;
    })
    .filter((line): line is LyricLine => Boolean(line));
}

function GlassIconButton({
  onClick,
  icon,
  label,
  tone,
  big,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "cool" | "hot" | "purple";
  big?: boolean;
}) {
  const ring =
    tone === "hot"
      ? "from-pink-500/35 via-orange-400/28 to-violet-500/32"
      : tone === "purple"
      ? "from-violet-500/32 via-fuchsia-500/26 to-pink-500/28"
      : "from-cyan-400/26 via-indigo-500/24 to-fuchsia-500/22";

  const size = big ? "h-11 w-11 text-[18px]" : "h-10 w-10 text-[16px]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl bg-gradient-to-br p-[1px]",
        ring,
        "shadow-glass",
        "transition hover:brightness-110 active:brightness-95",
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      <span
        className={[
          "inline-flex items-center justify-center rounded-2xl",
          "border border-white/10 bg-black/35 backdrop-blur-glass",
          "transition hover:bg-white/10",
          size,
        ].join(" ")}
      >
        <span className="text-white/90">{icon}</span>
      </span>
    </button>
  );
}
