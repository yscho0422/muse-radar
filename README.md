# MUSE RADAR — Korean Beauty Trend Radar

A static website for discovering Korean character/art makeup concepts in public short-form videos. The site has a clickable concept gallery; when real videos have been collected, the gallery plays native platform embeds or provides a link to the original post.

## GitHub Pages setup

1. Create a **public GitHub repository** and upload all files at the root of the repository (keep `.github/workflows/daily-radar.yml`). Name the default branch `main`.
2. Visit **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Visit **Actions → Daily Beauty Radar and GitHub Pages → Run workflow** to run collection and deployment immediately, or push to `main`.
4. The Pages URL will appear in the Actions deployment result and under Settings → Pages.
5. Every day at **09:10 Asia/Seoul**, GitHub Actions attempts to refresh the dataset and deploy the page. GitHub scheduled jobs can be delayed.

**To collect real videos**, configure repository secrets under **Settings → Secrets and variables → Actions**:

- `YOUTUBE_API_KEY` for YouTube Data API v3. These are candidates of short videos (up to 3 minutes), not a guarantee of YouTube's Shorts classification.
- `APIFY_TOKEN` for Apify public Instagram and TikTok scrapers. This is a third-party service and may cost money; actors can change their input/output format and platform policies may prevent retrieval.
- `OPENAI_API_KEY` (optional) to help classify additional new makeup concepts. Without it the code uses known keywords and a novel-name detection regex; this is not ML-powered.

**No keys?** The website still deploys and attempts public Google News and Google Trends searches each day, but these are shown ONLY as **unverified watchlist leads**, not as video-proven trends. Until videos are collected, Roblox and Tomie cards are marked **examples** and contain search links, not fabricated reels. Do not place keys in HTML or repository code.

## Files

- `index.html`, `assets/styles.css`, `assets/app.js`: responsive site, searches, saved looks and embeddable video gallery.
- `data/trends.json`, `data/trends.js`: daily generated site data.
- `data/post_index.json`: deduplicated recent posts used for multi-day analysis.
- `scripts/update.py`: public source collection and trend grouping (Python standard library).
- `.github/workflows/daily-radar.yml`: daily update + same-run Pages deploy.
- `tests/test_update.py`: collector tests.

## Local tests

```bash
python -m unittest discover -s tests -v
python -m http.server 8000
```

Then open `http://localhost:8000`. No external server or API is required for browsing examples; real video collection requires API access.

## Caveats

- **Repository does not equal a live site.** GitHub connection, repository creation, and Pages enabling must actually succeed before a public URL exists.
- Public source APIs can be limited, delayed, blocked, or unavailable. A successful daily workflow does not guarantee new trending reels.
- Instagram/TikTok embed availability depends on platform access policy.
- Score is computed from observed unique creators, post count, and recency. It is **not** the internal Instagram/TikTok recommendation algorithm.
- The project does not collect private posts, downloads, or bypass restrictions.