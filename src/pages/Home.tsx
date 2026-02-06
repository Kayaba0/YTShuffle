import { useEffect, useRef, useState } from "react";
import { FiShuffle, FiLink, FiX, FiEdit2, FiCheck } from "react-icons/fi";

const STORAGE_KEY = "ytrandom_recent_playlists";

type RecentItem = {
  url: string;
  name: string;
};

export default function Home({
  onShuffle,
  isLoading,
}: {
  onShuffle: (url: string) => void;
  isLoading: boolean;
}) {
  const [value, setValue] = useState("");
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setRecent(saved);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function persist(next: RecentItem[]) {
    setRecent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveRecent(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    const existing = recent.find((r) => r.url === trimmed);
    const item: RecentItem = existing ?? { url: trimmed, name: trimmed };
    const next = [item, ...recent.filter((r) => r.url !== trimmed)].slice(0, 10);
    persist(next);
  }

  function removeRecent(url: string) {
    persist(recent.filter((r) => r.url !== url));
  }

  function submit() {
    if (isLoading) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    setOpen(false);
    onShuffle(trimmed);
  }

  function startEdit(item: RecentItem) {
    setEditing(item.url);
    setTempName(item.name);
  }

  function confirmEdit(url: string) {
    persist(
      recent.map((r) =>
        r.url === url ? { ...r, name: tempName || r.name } : r
      )
    );
    setEditing(null);
    setTempName("");
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-3xl">
        <div className="rounded-[28px] border border-white/10 bg-white/5 shadow-glass backdrop-blur-glass p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-pink-400 via-orange-300 to-violet-400 bg-clip-text text-transparent">
              YTShuffle
            </span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/65">
            Paste the URL of a YouTube playlist and press{" "}
            <span className="text-white/85 font-semibold">SHUFFLE</span>
          </p>

          <div className="mt-7">
            <div ref={wrapperRef} className="relative">
              <div
                className={`mt-2 flex items-center gap-3 border border-white/10 bg-black/35 px-4 py-3 ${
                  open && !value && recent.length > 0
                    ? "rounded-t-2xl rounded-b-none"
                    : "rounded-2xl"
                }`}
              >
                <FiLink className="text-white/60" />
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => {
                    if (!value && recent.length > 0) setOpen(true);
                  }}
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="w-full bg-transparent outline-none text-sm placeholder:text-white/30"
                />
              </div>

              {open && !value && recent.length > 0 && (
                <div className="absolute z-20 -mt-px w-full rounded-b-2xl border border-white/10 bg-black/80 backdrop-blur-glass shadow-glass overflow-hidden">
                  {recent.map((r) => (
                    <div
                      key={r.url}
                      className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10"
                    >
                      {editing === r.url ? (
                        <input
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-sm"
                          autoFocus
                          onFocus={(e) => e.currentTarget.select()}
                          onClick={(e) => e.currentTarget.select()}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setValue(r.url);
                            setOpen(false);
                          }}
                          className="flex-1 text-left truncate"
                          title={r.name}
                        >
                          {r.name}
                        </button>
                      )}

                      {editing === r.url ? (
                        <button
                          onClick={() => confirmEdit(r.url)}
                          className="text-white/70 hover:text-white"
                          title="Save"
                        >
                          <FiCheck />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(r)}
                          className="text-white/50 hover:text-white"
                          title="Rename"
                        >
                          <FiEdit2 />
                        </button>
                      )}

                      <button
                        onClick={() => removeRecent(r.url)}
                        className="text-white/40 hover:text-white"
                        title="Remove"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={isLoading}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold
                         bg-gradient-to-r from-pink-500/40 via-orange-400/30 to-violet-500/40
                         hover:brightness-110 transition disabled:opacity-70"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="relative h-4 w-4">
                    <span className="absolute inset-0 rounded-full border border-white/30" />
                    <span className="absolute inset-0 rounded-full border-t border-white/90 animate-spin" />
                  </span>
                  Loading…
                </span>
              ) : (
                <>
                  <FiShuffle />
                  SHUFFLE
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
