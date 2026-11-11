#!/usr/bin/env python3
"""MUSE RADAR — public-source daily discovery, Python standard library only.

No API keys: Google News + Google Trends produce UNVERIFIED leads only.
Optional YOUTUBE_API_KEY: public short-video candidates with source URLs.
Optional APIFY_TOKEN: public Instagram / TikTok data (third-party actor).
Never represent candidate posts as a platform-wide trending ranking.
"""
import datetime as dt
import email.utils
import html
import json
import math
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)
NOW = dt.datetime.now(dt.timezone.utc)
EARLIEST = NOW - dt.timedelta(days=14)
KEYWORDS = [
    ("로블록스 메이크업", "character", ("로블록스", "roblox")),
    ("토미에 메이크업", "character", ("토미에", "tomie", "富江")),
    ("사와코 메이크업", "character", ("사와코", "sawako")),
    ("고양이 메이크업", "character", ("고양이 메이크업", "cat makeup")),
    ("인형 메이크업", "character", ("인형 메이크업", "doll makeup")),
    ("발레코어 메이크업", "daily", ("발레코어", "balletcore")),
    ("뱀파이어 메이크업", "artistic", ("뱀파이어 메이크업", "vampire makeup")),
    ("픽셀 메이크업", "artistic", ("픽셀 메이크업", "pixel makeup")),
    ("그런지 메이크업", "artistic", ("그런지 메이크업", "grunge makeup")),
    ("Y2K 메이크업", "artistic", ("y2k",)),
]
STOPWORDS = {"데일리", "한국", "기본", "추천", "초간단", "최신", "꾸안꾸", "인기", "뷰티", "요즘", "화장", "메이크업", "아이", "립", "숏폼"}


def request(url, payload=None, headers=None, timeout=38):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    extra = {"User-Agent": "MuseRadar/1.0 (public source research)", "Accept": "*/*", **(headers or {})}
    if body is not None:
        extra["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=extra, method="POST" if body else "GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read(6_000_000)


def timestamp(value):
    if not value:
        return None
    try:
        if isinstance(value, (float, int)) or (isinstance(value, str) and value.strip().replace(".", "", 1).isdigit()):
            numeric = float(value)
            if numeric > 1e12:
                numeric /= 1000
            return dt.datetime.fromtimestamp(numeric, tz=dt.timezone.utc)
        return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(dt.timezone.utc)
    except (TypeError, ValueError, OverflowError):
        try:
            return email.utils.parsedate_to_datetime(str(value)).astimezone(dt.timezone.utc)
        except (TypeError, ValueError):
            return None


def plain(value, limit=220):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", str(value or "")))).strip()[:limit]


def valid_video(post):
    try:
        u = urllib.parse.urlparse(str(post.get("url") or ""))
        host = (u.hostname or "").lower().removeprefix("www.")
        platform = post.get("platform")
        if u.scheme != "https":
            return False
        if platform == "youtube":
            return host in ("youtube.com", "m.youtube.com", "youtu.be") and (u.path.startswith("/shorts/") or u.path == "/watch" or host == "youtu.be")
        if platform == "instagram":
            return host in ("instagram.com", "m.instagram.com") and bool(re.match(r"/reel/[A-Za-z0-9_-]+", u.path))
        if platform == "tiktok":
            return host in ("tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com") and ("/video/" in u.path or host.startswith(("vm.", "vt.")))
    except ValueError:
        pass
    return False


def rss(query, google_trends=False):
    if google_trends:
        url = "https://trends.google.com/trending/rss?geo=KR"
    else:
        url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": query, "hl": "ko", "gl": "KR", "ceid": "KR:ko"})
    root = ET.fromstring(request(url))
    out = []
    for item in root.findall(".//item"):
        title = plain(item.findtext("title"), 160)
        link = item.findtext("link") or ""
        pub = timestamp(item.findtext("pubDate"))
        if title and link.startswith("https://") and (pub is None or pub > EARLIEST):
            out.append({"title": title, "url": link, "description": "뉴스·검색 키워드: 릴스 유행 여부는 미검증.", "source": "google_trends" if google_trends else "news", "published_at": pub.isoformat() if pub else None})
    return out


def collect_leads():
    leads, state = [], {"news": False, "google_trends": False}
    for q in ['"캐릭터 메이크업" 릴스 when:7d', '"메이크업 챌린지" 틱톡 when:7d', '"뷰티" "릴스" 유행 when:7d', '"Korean makeup trend" when:7d']:
        try:
            leads.extend(rss(q))
            state["news"] = True
        except Exception as e:
            print("News search:", plain(e))
    try:
        source = rss("", google_trends=True)
        pattern = re.compile("메이크업|뷰티|화장|cosmetic|makeup|beauty", re.I)
        leads.extend(item for item in source if pattern.search(item["title"]))
        state["google_trends"] = True
    except Exception as e:
        print("Google Trends:", plain(e))
    seen, unique = set(), []
    for item in sorted(leads, key=lambda p: p.get("published_at") or "", reverse=True):
        ident = item["title"].casefold()
        if ident not in seen:
            unique.append(item)
            seen.add(ident)
    return unique[:18], state


def collect_youtube(api_key):
    queries = ["캐릭터 메이크업 shorts", "로블록스 메이크업 shorts", "토미에 메이크업 shorts", "메이크업 챌린지 shorts", "한국 아트 메이크업 shorts"]
    result, ok = {}, False
    after = (NOW - dt.timedelta(days=10)).isoformat().replace("+00:00", "Z")
    for term in queries:
        params = urllib.parse.urlencode({"part": "snippet", "type": "video", "q": term, "maxResults": 25, "videoDuration": "short", "publishedAfter": after, "regionCode": "KR", "relevanceLanguage": "ko", "order": "date", "key": api_key})
        try:
            records = json.loads(request("https://www.googleapis.com/youtube/v3/search?" + params))
            ok = True
            for rec in records.get("items", []):
                ident = (rec.get("id") or {}).get("videoId")
                sn = rec.get("snippet") or {}
                if not ident:
                    continue
                result[ident] = {"platform": "youtube", "url": "https://www.youtube.com/watch?v=" + ident, "title": plain(sn.get("title"), 140), "caption": plain(sn.get("description"), 400), "author": plain(sn.get("channelTitle"), 80), "published_at": sn.get("publishedAt"), "thumbnail": (sn.get("thumbnails") or {}).get("high", {}).get("url"), "views": None}
        except Exception as e:
            print("YouTube:", plain(e))
    # Search API short duration can include videos which are not actually Shorts.
    # Validate duration independently; label candidates rather than guaranteed Shorts.
    for offset in range(0, len(result), 50):
        batch = list(result)[offset:offset+50]
        try:
            params = urllib.parse.urlencode({"part": "contentDetails,statistics", "id": ",".join(batch), "key": api_key})
            details = json.loads(request("https://www.googleapis.com/youtube/v3/videos?" + params))
            for item in details.get("items", []):
                ident = item.get("id")
                if ident not in result:
                    continue
                result[ident]["views"] = (item.get("statistics") or {}).get("viewCount")
                duration = (item.get("contentDetails") or {}).get("duration", "")
                m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
                seconds = 3600*int(m.group(1) or 0)+60*int(m.group(2) or 0)+int(m.group(3) or 0) if m else 9999
                if seconds > 180:
                    result.pop(ident, None)
        except Exception as e:
            print("Video duration:", plain(e))
    return list(result.values()), ok


def apify(actor, params, token):
    actor = urllib.parse.quote(actor.replace("/", "~"), safe="~")
    endpoint = "https://api.apify.com/v2/acts/" + actor + "/run-sync-get-dataset-items?format=json&clean=true&timeout=150"
    rows = json.loads(request(endpoint, params, {"Authorization": "Bearer " + token}, timeout=175))
    return rows if isinstance(rows, list) else []


def collect_social(token):
    """Public-source data discovery. Third-party Apify service can incur charges."""
    posts, status = [], {"instagram": False, "tiktok": False}
    try:
        # Source: Apify's official Instagram Hashtag Scraper actor.
        # Its schema accepts "hashtags", "resultsType": "reels" and
        # "resultsLimit". Requests use the secret APIFY_TOKEN on the runner,
        # never inside public JavaScript.
        #
        # Rotating hashtags bounds paid volume while still exploring new looks.
        rotating_tags = [
            "로블록스메이크업", "토미에메이크업", "메이크업챌린지",
            "아트메이크업", "코스프레메이크업", "고양이메이크업",
            "인형메이크업", "픽셀메이크업"
        ]
        rotation = (NOW.timetuple().tm_yday * 12 + NOW.hour // 2) % len(rotating_tags)
        selected_tags = ["메이크업", "캐릭터메이크업", rotating_tags[rotation]]
        max_per_tag = max(1, min(10, int(os.getenv("IG_RESULTS_PER_TAG", "4"))))
        rows = apify("apify/instagram-hashtag-scraper", {
            "hashtags": selected_tags,
            "resultsType": "reels",
            "keywordSearch": False,
            "resultsLimit": max_per_tag
        }, token)
        status["instagram"] = True
        for item in rows:
            if not isinstance(item, dict):
                continue
            typ = str(item.get("type") or item.get("productType") or "").lower()
            if not ("video" in typ or "reel" in typ or item.get("isVideo") is True):
                continue
            code = item.get("shortCode") or item.get("shortcode")
            raw_url = item.get("url") or item.get("postUrl") or ""
            match = re.search(r"/reel/([A-Za-z0-9_-]+)", str(raw_url))
            code = code or (match.group(1) if match else None)
            if not code:
                continue
            url = "https://www.instagram.com/reel/" + str(code) + "/"
            thumbnail = (
                item.get("coverUrl") or item.get("displayUrl")
                or item.get("thumbnailUrl") or item.get("thumbnail")
            )
            caption = plain(item.get("caption") or item.get("text"), 500)
            posts.append({
                "platform": "instagram", "url": url,
                "title": plain(item.get("caption") or item.get("text"), 140),
                "caption": caption,
                "author": plain(item.get("ownerUsername") or item.get("username"), 80),
                "published_at": item.get("takenAt") or item.get("timestamp") or item.get("takenAtTimestamp"),
                "thumbnail": thumbnail if str(thumbnail or "").startswith("https://") else None,
                "views": item.get("views") or item.get("videoViewCount"),
                "source_method": "apify-instagram-hashtag-reels",
            })
    except Exception as e:
        print("Instagram collection:", plain(e))
    if not os.getenv("ENABLE_TIKTOK") == "1":
        return posts, status
    try:
        rows = apify("clockworks/tiktok-scraper", {"hashtags": ["캐릭터메이크업", "로블록스메이크업", "토미에메이크업"], "resultsPerPage": 20, "shouldDownloadVideos": False}, token)
        status["tiktok"] = True
        for item in rows:
            creator = item.get("authorMeta") or {}
            posts.append({"platform": "tiktok", "url": item.get("webVideoUrl") or item.get("url"), "title": plain(item.get("text") or item.get("desc"), 140), "caption": plain(item.get("text") or item.get("desc"), 500), "author": plain(creator.get("name") or item.get("author"), 80), "published_at": item.get("createTimeISO") or item.get("createTime"), "thumbnail": (item.get("videoMeta") or {}).get("coverUrl"), "views": item.get("playCount")})
    except Exception as e:
        print("TikTok:", plain(e))
    return posts, status


def labels(text):
    text = plain(text, 700).lower()
    found = [(title, category) for title, category, aliases in KEYWORDS if any(a.lower() in text for a in aliases)]
    for m in re.finditer(r"(?<![\w가-힣])([가-힣a-z0-9]{2,16})\s*(?:메이크업|메컵|makeup|화장법)", text, re.I):
        name = m.group(1)
        if name not in STOPWORDS:
            title = name + " 메이크업"
            if title not in [x[0] for x in found] and not any(name in x[0].lower() for x in found):
                found.append((title, "other"))
    return found[:5]


def aggregate(posts, previous):
    dedup = {}
    for item in posts:
        if not isinstance(item, dict) or not valid_video(item):
            continue
        d = timestamp(item.get("published_at"))
        if d is None or not EARLIEST <= d <= NOW + dt.timedelta(days=1):
            continue
        item["published_at"] = d.isoformat()
        dedup[item["url"]] = item
    groups = {}
    for p in dedup.values():
        for title, category in labels(p.get("title", "") + " " + p.get("caption", "")):
            ident = re.sub(r"[^가-힣a-z0-9]", "", title.lower())
            g = groups.setdefault(ident, {"id": ident, "title": title, "category": category, "posts": {}})
            g["posts"][p["url"]] = p
    prior = {i.get("id"): i for i in previous if isinstance(i, dict)}
    out = []
    for g in groups.values():
        sources = sorted(g["posts"].values(), key=lambda p: p["published_at"], reverse=True)
        authors = len({p["platform"] + ":" + str(p.get("author") or p["url"]) for p in sources})
        recent = max(0, (NOW-timestamp(sources[0]["published_at"])).total_seconds()/86400)
        scores = round(15*authors + 3*len(sources) + 15*math.exp(-recent/4), 1)
        out.append({"id": g["id"], "title": g["title"], "category": g["category"], "description": "공개 영상에서 관찰된 메이크업 콘셉트.", "subtitle": "K-BEAUTY / SOCIAL VIDEO", "status": "여러 크리에이터가 참여" if authors >= 3 else "반복 발견" if authors >= 2 else "새로운 신호", "score": scores, "post_count": len(sources), "author_count": authors, "first_seen": prior.get(g["id"], {}).get("first_seen") or sources[-1]["published_at"], "latest_at": sources[0]["published_at"], "thumbnail": next((p.get("thumbnail") for p in sources if (p.get("thumbnail") or "").startswith("https://")), None), "art": "default", "example": False, "keywords": [], "source_posts": [{key: p.get(key) for key in ("platform", "url", "title", "author", "published_at", "views", "thumbnail")} for p in sources[:8]]})
    return sorted(out, key=lambda x: x["score"], reverse=True)[:30], list(dedup.values())


def run():
    def load(name, fallback):
        try:
            return json.loads((DATA/name).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return fallback

    old = load("trends.json", {})
    news, lead_status = collect_leads()
    incoming = []
    source_status = {"youtube": False, "instagram": False, "tiktok": False, "ai": False, **lead_status}
    if os.getenv("YOUTUBE_API_KEY"):
        incoming, source_status["youtube"] = collect_youtube(os.environ["YOUTUBE_API_KEY"])
    if os.getenv("APIFY_TOKEN") and os.getenv("ENABLE_INSTAGRAM", "1") == "1":
        found, social_status = collect_social(os.environ["APIFY_TOKEN"])
        incoming.extend(found)
        source_status.update(social_status)
    cached = load("post_index.json", {"posts": []})
    videos, saved = aggregate([*(cached.get("posts") or []), *incoming], old.get("trends") or [])
    (DATA/"post_index.json").write_text(json.dumps({"updated_at": NOW.isoformat(), "posts": saved}, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    payload = {"version": 2, "updated_at": NOW.isoformat(), "source_status": source_status, "trends": videos, "leads": news, "note": "확인된 원본 영상과 미검증 뉴스·검색 키워드는 구분하여 표시합니다."}
    encoded = json.dumps(payload, ensure_ascii=False, indent=2)
    (DATA/"trends.json").write_text(encoded+"\n", encoding="utf-8")
    (DATA/"trends.js").write_text("// Generated daily. Never insert API keys here.\nwindow.__MUSE_DATA__ = "+encoded+";\n", encoding="utf-8")
    feed = ['<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>MUSE RADAR</title><link>https://github.com/</link><description>Korean beauty short-form trends</description>']
    for group in videos[:15]:
        post = group["source_posts"][0]
        feed.append("<item><title>"+html.escape(group["title"])+"</title><link>"+html.escape(post["url"])+"</link></item>")
    (ROOT/"feed.xml").write_text("".join(feed)+"</channel></rss>\n", encoding="utf-8")
    print("MUSE RADAR: source-linked concepts =", len(videos), ", unverified leads =", len(news), "; source status =", source_status)


if __name__ == "__main__":
    run()
