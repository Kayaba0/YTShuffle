import { useLayoutEffect, useMemo, useRef } from "react";
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

export default function Player(props: Props) {
  const { items, shuffledIds, currentIndex } = props;

  const currentVideoId = shuffledIds[currentIndex];
  const currentItem = items.find((x) => x.videoId === currentVideoId) ?? items[0];

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

  // Auto-scroll to the currently playing item (scroll ONLY inside the list box)
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


  return (
    <div className="flex justify-center">
      <div className="w-full max-w-5xl space-y-4">
        {/* Back button */}
        <button
          type="button"
          onClick={props.onBackHome}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/35 backdrop-blur-glass h-11 w-11 hover:bg-white/10 transition"
          aria-label="Torna alla home"
          title="Torna alla home"
        >
          <FiArrowLeft className="text-[20px] text-white/80" />
        </button>

        {/* Player card */}
        <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-glass backdrop-blur-glass p-4 md:p-6">
          <div className="min-w-0">
            <div className="mt-1 font-semibold tracking-tight truncate">
              {currentItem?.title ?? "—"}
            </div>
            <div className="mt-1 text-xs text-white/55 truncate">
              {currentItem?.channelTitle ?? ""}
            </div>
          </div>

          <div className="mt-5 rounded-2xl overflow-hidden border border-white/10 bg-black/45">
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <div ref={yt.mountRef} className="absolute inset-0 h-full w-full" />
            </div>
          </div>

          {/* Controls */}
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
              <div className="w-px h-7 bg-white/10 mx-1" />
              <GlassIconButton onClick={props.onReshuffle} label="Reshuffle" icon={<FiShuffle />} tone="purple" />
            </div>
          </div>
        </div>

        {/* List card */}
        <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-glass backdrop-blur-glass p-4 md:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold tracking-tight">Video list</div>
            </div>

            <div className="text-xs text-white/60">
              <span className="text-white/85 font-semibold">{currentIndex + 1}</span> / {shuffledIds.length}
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
                        ? "w-full min-w-0 text-left rounded-2xl p-[1px] bg-gradient-to-r from-pink-500/35 via-orange-400/22 to-violet-500/35"
                        : "w-full min-w-0 text-left rounded-2xl border border-white/10 bg-black/30 hover:bg-white/8 transition flex gap-3 px-3 py-2"
                    }
                    initial={false}
                    animate={{ scale: active ? 1.01 : 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {active ? (
                      <div className="w-full rounded-2xl border border-white/15 bg-black/35 backdrop-blur-glass transition flex gap-3 px-3 py-2">
                        <img
                          src={it.thumbnailUrl}
                          alt=""
                          className="h-14 w-24 shrink-0 rounded-xl object-cover border border-white/10 bg-black/40"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-white/50 truncate">
                            #{idx + 1} • {it.channelTitle}
                          </div>
                          <div className="mt-1 text-sm font-semibold truncate">{it.title}</div>
                        </div>

                        <div className="self-center text-xs text-white/75 rounded-full border border-white/15 bg-white/10 px-2 py-1 shrink-0">
                          Playing
                        </div>
                      </div>
                    ) : (
                      <>
                        <img
                          src={it.thumbnailUrl}
                          alt=""
                          className="h-14 w-24 shrink-0 rounded-xl object-cover border border-white/10 bg-black/40"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-white/50 truncate">
                            #{idx + 1} • {it.channelTitle}
                          </div>
                          <div className="mt-1 text-sm font-semibold truncate">{it.title}</div>
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
    </div>
  );
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
        "rounded-2xl p-[1px] bg-gradient-to-br",
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
          "hover:bg-white/10 transition",
          size,
        ].join(" ")}
      >
        <span className="text-white/90">{icon}</span>
      </span>
    </button>
  );
}
