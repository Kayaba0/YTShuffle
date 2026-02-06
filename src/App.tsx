import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Home from "./pages/Home";
import Player from "./pages/Player";
import type { PlaylistItem } from "./types/youtube";
import { fetchPlaylistItems, parsePlaylistIdFromUrl } from "./lib/youtube";

export type ViewState =
  | { screen: "home" }
  | {
      screen: "player";
      playlistId: string;
      items: PlaylistItem[];
      shuffledIds: string[];
      currentIndex: number;
    };

export default function App() {
  const [state, setState] = useState<ViewState>({ screen: "home" });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const bgOrbs = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => ({
      id: i,
      top: `${8 + i * 11}%`,
      left: `${(i * 14) % 92}%`,
      size: 220 + i * 55,
      delay: i * 0.15,
    }));
  }, []);

  async function handleShuffle(inputUrl: string) {
    setGlobalError(null);
    setIsLoading(true);

    const playlistId = parsePlaylistIdFromUrl(inputUrl);
    if (!playlistId) {
      setGlobalError("URL non valido: incolla un link di playlist YouTube (parametro list=...).");
      setIsLoading(false);
      return;
    }

    try {
      const items = await fetchPlaylistItems(playlistId);
      if (items.length === 0) {
        setGlobalError("Playlist vuota o non accessibile (privata/non trovata).");
        setIsLoading(false);
        return;
      }

      const videoIds = items.map((x) => x.videoId);
      const shuffled = shuffleArray(videoIds);

      setState({ screen: "player", playlistId, items, shuffledIds: shuffled, currentIndex: 0 });
      setIsLoading(false);
} catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
      setGlobalError(msg);
      setIsLoading(false);
    }
  }

  function goHome() {
    setGlobalError(null);
    setIsLoading(false);
    setState({ screen: "home" });
  }

  function setCurrentByVideoId(videoId: string) {
    if (state.screen !== "player") return;
    const idx = state.shuffledIds.findIndex((id) => id === videoId);
    if (idx < 0) return;
    setState({ ...state, currentIndex: idx });
  }


  const itemsById = useMemo(() => {
    if (state.screen !== "player") return new Map<string, PlaylistItem>();
    const m = new Map<string, PlaylistItem>();
    for (const it of state.items) m.set(it.videoId, it);
    return m;
  }, [state]);

  function isPlayable(videoId: string) {
    const it = itemsById.get(videoId);
    if (!it) return false;
    const t = (it.title || "").toLowerCase();
    if (t === "private video" || t === "deleted video") return false;
    if (t.includes("private video") || t.includes("deleted video")) return false;
    return true;
  }


  function next() {
    if (state.screen !== "player") return;

    let i = state.currentIndex;
    const last = state.shuffledIds.length - 1;

    while (i < last) {
      i += 1;
      const id = state.shuffledIds[i];
      if (isPlayable(id)) {
        setState({ ...state, currentIndex: i });
        return;
      }
    }

    // fallback: stay where you are if no playable item ahead
  }

  function prev() {
    if (state.screen !== "player") return;

    let i = state.currentIndex;

    while (i > 0) {
      i -= 1;
      const id = state.shuffledIds[i];
      if (isPlayable(id)) {
        setState({ ...state, currentIndex: i });
        return;
      }
    }

    // If we reached the start, ensure we're on the first playable item (or stay at 0)
    if (state.shuffledIds.length > 0 && isPlayable(state.shuffledIds[0])) {
      setState({ ...state, currentIndex: 0 });
    }
  }

  function reshuffleKeepCurrent() {
    if (state.screen !== "player") return;
    const uniqueIds = Array.from(new Set(state.items.map((x) => x.videoId)));
    const newOrder = shuffleArray(uniqueIds);
    // On reshuffle we restart from the first video of the new order
    setState({ ...state, shuffledIds: newOrder, currentIndex: 0 });
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Backdrop: dark + gradient pink/orange/violet */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-black" />
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_15%_10%,rgba(236,72,153,0.28),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(251,146,60,0.20),transparent_45%),radial-gradient(circle_at_60%_90%,rgba(139,92,246,0.22),transparent_50%)]" />
      </div>

      {/* Floating orbs */}
      <div className="absolute inset-0 -z-10">
        {bgOrbs.map((o) => (
          <motion.div
            key={o.id}
            className="absolute rounded-full blur-3xl opacity-25"
            style={{ top: o.top, left: o.left, width: o.size, height: o.size }}
            initial={{ scale: 0.9, opacity: 0.10 }}
            animate={{ scale: [0.9, 1.05, 0.95], opacity: [0.10, 0.22, 0.14] }}
            transition={{ duration: 8 + o.id, repeat: Infinity, ease: "easeInOut", delay: o.delay }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-0 pb-6 md:pb-8">

        {globalError && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <div className="font-semibold">Errore</div>
            <div className="opacity-90">{globalError}</div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {state.screen === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mt-10"
            >
              <Home onShuffle={handleShuffle} isLoading={isLoading} />
            </motion.div>
          ) : (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mt-8"
            >
              <Player
                playlistId={state.playlistId}
                items={state.items}
                shuffledIds={state.shuffledIds}
                currentIndex={state.currentIndex}
                onPrev={prev}
                onNext={next}
                onReshuffle={reshuffleKeepCurrent}
                onSelectVideo={setCurrentByVideoId}
                onBackHome={goHome}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}



function shuffleArray<T>(input: T[]): T[] {
  const arr = input.slice(); // copy
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}



