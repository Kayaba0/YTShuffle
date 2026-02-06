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

  // UI: un unico scroll. API: paginazione trasparente per caricare i risultati.
  const maxPages = 10; // fino a 500 items
  let pageToken: string | undefined = undefined;
  const out: PlaylistItem[] = [];

  for (let page = 0; page < maxPages; page++) {
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
