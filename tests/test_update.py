"""Offline smoke tests for MUSE RADAR data integrity."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("radar", Path(__file__).resolve().parents[1] / "scripts" / "update.py")
radar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(radar)

class RadarTests(unittest.TestCase):
    def test_known_makeup_concepts(self):
        found = [name for name, _ in radar.labels("토미에 메이크업, 로블록스 메이크업")]
        self.assertIn("토미에 메이크업", found)
        self.assertIn("로블록스 메이크업", found)

    def test_real_video_urls_only(self):
        self.assertTrue(radar.valid_video({"platform": "instagram", "url": "https://www.instagram.com/reel/ABC123/"}))
        self.assertFalse(radar.valid_video({"platform": "instagram", "url": "https://example.com/reel/ABC123/"}))
        self.assertFalse(radar.valid_video({"platform": "youtube", "url": "javascript:alert(1)"}))

    def test_grouping_posts(self):
        now = radar.NOW.isoformat()
        posts = [
          {"platform": "youtube", "url": "https://www.youtube.com/watch?v=ABC12345678", "title": "토미에 메이크업", "author": "alice", "published_at": now},
          {"platform": "youtube", "url": "https://www.youtube.com/watch?v=DEF12345678", "title": "토미에 메이크업", "author": "bob", "published_at": now}
        ]
        groups, cache = radar.aggregate(posts, [])
        t = next(x for x in groups if x["title"] == "토미에 메이크업")
        self.assertEqual(t["post_count"], 2)
        self.assertEqual(t["author_count"], 2)
        self.assertEqual(len(cache), 2)

if __name__ == "__main__":
    unittest.main()
