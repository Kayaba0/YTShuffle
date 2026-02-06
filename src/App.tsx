import { useMemo, useState, useEffect } from "react";
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
  const [bootingFromUrl, setBootingFromUrl] = useState(false);

  useEffect(() => {
    // Direct link support: /player?list=PLAYLIST_ID (or full playlist url encoded)
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("list");
    if (!raw) return;

    let playlistId = "";
    const trimmed = raw.trim();

    try {
      // if it's a URL
      if (trimmed.startsWith("http")) {
        const u = new URL(trimmed);
        playlistId = u.searchParams.get("list") || "";
      } else {
        // if it contains list=... anywhere
        const m = trimmed.match(/[?&]list=([^&]+)/i);
        playlistId = m ? decodeURIComponent(m[1]) : trimmed;
      }
    } catch {
      const m = trimmed.match(/[?&]list=([^&]+)/i);
      playlistId = m ? decodeURIComponent(m[1]) : trimmed;
    }

    if (!playlistId) return;

    setBootingFromUrl(true);
    handleShuffle(`https://www.youtube.com/playlist?list=${playlistId}`).finally(() => {
      setBootingFromUrl(false);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    window.location.href = "/";
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
  const isDirectPlayerLink = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return window.location.pathname.startsWith("/player") && Boolean(p.get("list"));
    } catch {
      return false;
    }
  })();

  if (state.screen === "home" && isDirectPlayerLink && (bootingFromUrl || isLoading)) {
    return <LoadingScreen />;
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
              <Home onShuffle={(url) => {
  const trimmed = url.trim();
  let playlistId = "";
  try {
    const u = new URL(trimmed);
    playlistId = u.searchParams.get("list") || "";
  } catch {
    const m = trimmed.match(/[?&]list=([^&]+)/i);
    playlistId = m ? decodeURIComponent(m[1]) : trimmed;
  }
  if (!playlistId) return;
  window.location.href = `/player?list=${encodeURIComponent(playlistId)}`;
}} isLoading={isLoading} />
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





function LoadingScreen() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-black" />
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_15%_10%,rgba(236,72,153,0.28),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(251,146,60,0.20),transparent_45%),radial-gradient(circle_at_60%_90%,rgba(139,92,246,0.22),transparent_50%)]" />
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border border-white/10 bg-white/5 backdrop-blur-glass shadow-glass grid place-items-center">
            <div className="h-9 w-9 rounded-full border-2 border-white/30 border-t-transparent animate-spin" />
          </div>
          <div className="pointer-events-none absolute -inset-7 rounded-full opacity-50 blur-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(255,90,189,0.35),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(165,104,255,0.30),transparent_55%),radial-gradient(circle_at_60%_40%,rgba(255,138,76,0.22),transparent_55%)]" />
        </div>
        <div className="mt-5 text-sm tracking-wide text-white/80">Loading...</div>
      </div>
    </div>
  );
}
