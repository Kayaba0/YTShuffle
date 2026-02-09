import type { PlaylistItem } from "../types/youtube";



const API_KEY = import.meta.env.VITE_YT_API_KEY as string | undefined;

export function parsePlaylistIdFromUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const list = url.searchParams.get("list");
    if (list && list.length > 5) return list;
    return null;
  } catch {
    const raw = input.trim();
    if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) return raw;
    return null;
  }
}


export async function fetchPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  if (!API_KEY) {
    throw new Error("Manca VITE_YT_API_KEY in .env. Aggiungila e riavvia `npm run dev`.");
  }

  // Cache client-side per ridurre le chiamate API.
  // TTL: 30 ore (come richiesto)
  const CACHE_TTL_MS = 30 * 60 * 60 * 1000;
  const cacheKey = `ytrandom_playlist_cache_v1_${playlistId}`;

  const readCache = (): PlaylistItem[] | null => {
    try {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { cachedAt: number; items: PlaylistItem[] };
      if (!parsed?.cachedAt || !Array.isArray(parsed.items)) return null;
      const age = Date.now() - parsed.cachedAt;
      if (age > CACHE_TTL_MS) return null;
      return parsed.items;
    } catch {
      return null;
    }
  };

  const writeCache = (items: PlaylistItem[]) => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(cacheKey, JSON.stringify({ cachedAt: Date.now(), items }));
    } catch {
      // ignore
    }
  };

  const cached = readCache();
  if (cached && cached.length > 0) return cached;

  // UI: un unico scroll. API: paginazione trasparente per caricare i risultati.
  // 50 items per pagina -> per 1500 servono max 30 pagine.
  const maxItems = 1500;
  let pageToken: string | undefined = undefined;
  const out: PlaylistItem[] = [];

  while (out.length < maxItems) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("key", API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    const json = await res.json();

    if (!res.ok) {
      const message =
        json?.error?.message ||
        "Errore YouTube API. Controlla API key, quota, playlistId e permessi della playlist.";
      throw new Error(message);
    }

    const items = (json?.items ?? []) as any[];
    for (const it of items) {
      if (out.length >= maxItems) break;
      const sn = it?.snippet;
      const videoId = sn?.resourceId?.videoId as string | undefined;
      if (!videoId) continue;

      const thumbs = sn?.thumbnails ?? {};
      const thumb =
        thumbs?.maxres?.url ||
        thumbs?.standard?.url ||
        thumbs?.high?.url ||
        thumbs?.medium?.url ||
        thumbs?.default?.url ||
        "";

      out.push({
        videoId,
        title: (sn?.title as string | undefined) ?? "Untitled",
        channelTitle:
          (sn?.videoOwnerChannelTitle as string | undefined) ??
          (sn?.channelTitle as string | undefined) ??
          "",
        thumbnailUrl: thumb,
        position: typeof sn?.position === "number" ? sn.position : out.length,
      });
    }

    pageToken = json?.nextPageToken as string | undefined;
    if (!pageToken) break;
  }

  // Salva cache solo se abbiamo risultati
  if (out.length > 0) writeCache(out);

  return out;
}


export function buildEmbedUrl(videoId: string): string {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("playsinline", "1");
  return url.toString();
}
