# 🎵 YTShuffle

Modern YouTube Playlist Shuffle Player built with **React + Vite +
TypeScript + Tailwind CSS**.

YTShuffle lets you load any public YouTube playlist and play it in a
fully randomized order with a clean, modern glass-style interface.

🔗 Live Demo: [YTShuffle](https://ytshuffle.vercel.app/)

📦 Tech Stack: React · Vite · TypeScript · Tailwind · YouTube Iframe API

------------------------------------------------------------------------

## ✨ Features

-   🎲 True random shuffle (Fisher--Yates algorithm)
-   🔁 Auto-skip unavailable / private videos
-   📜 Scrollable playlist with active video highlight
-   🔗 Direct playlist links: `/player?list=PLAYLIST_ID`
-   💾 Playlist caching (30-hour expiration)
-   ⚡ Up to 1500 videos per playlist
-   📱 Responsive design (mobile-friendly)
-   🌙 Modern dark glass UI with gradient accents
-   🚀 Free deployment ready (Vercel)

------------------------------------------------------------------------

## 🔗 Direct Playlist Access

You can open a playlist directly via URL:

https://ytshuffle.vercel.app/player?list=PLAYLIST_ID

✔ Automatically loads\
✔ Shuffles on each visit\
✔ Shows loading screen while fetching

------------------------------------------------------------------------

## 🧠 How It Works

### Playlist Fetching

Uses **YouTube Data API v3** (`playlistItems.list`)

-   50 items per request\
-   Automatically paginates up to 1500 videos\
-   Deduplicates results\
-   Stops if playlist ends earlier

### Caching Strategy

To reduce API usage:

-   Results are stored in `localStorage`
-   Cache duration: **30 hours**
-   If cached → no API call is made
-   After expiration → playlist is refreshed

Cache key format:

`ytrandom_playlist_cache_v1_<playlistId>`

### Video Playback

Uses **YouTube Iframe API**

-   Does not consume API quota
-   Auto-plays next video
-   Skips unavailable content
-   Syncs UI with current playing video

------------------------------------------------------------------------

## 📊 API Usage

YouTube Data API quota cost:

  Videos Loaded   API Calls   Quota Used
  --------------- ----------- ------------
  50              1           1 unit
  500             10          10 units
  1500            30          30 units

Default YouTube quota: **10,000 units/day**

Playback itself does **not** consume quota.

------------------------------------------------------------------------

## 🛠 Installation

### 1️⃣ Clone Repository

``` bash
git clone https://github.com/Kayaba0/YTShuffle.git
cd YTShuffle
```

### 2️⃣ Install Dependencies

``` bash
npm install
```

### 3️⃣ Add YouTube API Key

Create a `.env` file in the root:

    VITE_YT_API_KEY=YOUR_API_KEY_HERE

⚠ Note: `VITE_` variables are exposed in the frontend.\
Restrict your API key by:

-   Application restriction → HTTP Referrers\
-   API restriction → YouTube Data API v3 only

------------------------------------------------------------------------

### 4️⃣ Run Locally

``` bash
npm run dev
```

Open:

http://localhost:5173

------------------------------------------------------------------------

## 🚀 Production Build

``` bash
npm run build
```

Output folder:

`/dist`

------------------------------------------------------------------------

## 🌍 Deployment (Vercel)

If using client-side routing (`/player`), add:

`vercel.json` in root:

``` json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Then deploy via GitHub integration or Vercel CLI.

------------------------------------------------------------------------

## 🔮 Future Improvements

-   Autoplay handling improvements (browser restrictions)
-   PWA support
-   Installable web app
-   Advanced playlist management
-   Background progressive loading
-   SEO metadata optimization

------------------------------------------------------------------------

## 📜 License

MIT License

------------------------------------------------------------------------

## 👨‍💻 Author

Developed by Kayaba0\
Built with ❤️ using React & YouTube API
