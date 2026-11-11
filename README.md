# MUSE RADAR — 한국 뷰티 릴스 트렌드 레이더

한국 메이크업 콘셉트를 모아보고, 주제를 클릭해 관련 Instagram Reels / TikTok / YouTube 영상 원본을 확인하는 정적 웹사이트입니다.

## 현재 구현

- 반응형 메이크업 트렌드 대시보드
- 클릭 가능한 콘셉트 카드 및 영상 갤러리
- 브라우저 북마크, 검색, 카테고리 필터
- GitHub Actions를 이용한 한국 시간 **매일 오전 9시 10분** 데이터 갱신 시도
- 실제 영상 원본 링크와 미검증 검색 키워드 구분
- 원본 영상 수와 참여 크리에이터 수를 기반으로 한 **관측 점수** (플랫폼 알고리즘의 공식 순위가 아님)

## GitHub Pages 켜기

1. 무료 GitHub 계정에서는 저장소를 **Public**으로 만들어야 GitHub Pages를 쓸 수 있습니다. 저장소의 Settings → General → Danger Zone → Change repository visibility에서 변경할 수 있습니다.
2. Settings → Pages → Build and deployment → **Source: GitHub Actions**를 선택합니다.
3. Actions → **MUSE RADAR daily refresh and Pages deploy** → Run workflow (main)를 클릭하면 최초 실행과 배포를 시작할 수 있습니다.
4. 배포에 성공하면 GitHub Pages URL에서 사이트를 열 수 있습니다.

## 데이터 연결 (선택)

GitHub → Settings → Secrets and variables → Actions에 다음 키가 있으면 실제 영상 검색 범위가 늘어납니다.

- `YOUTUBE_API_KEY`: YouTube Data API 검색. 3분 이하 공개 영상 후보. 모든 결과가 공식 Shorts로 분류되는 것은 아닙니다.
- `APIFY_TOKEN`: Apify Instagram/TikTok 공개 영상 데이터 수집. 유료일 수 있고 플랫폼 제한의 영향을 받습니다.

키가 없어도 매일 실행되어 Google News와 Google Trends에서 **미검증 트렌드 후보**를 수집합니다. 영상 링크가 없는 키워드를 검증된 릴스처럼 표시하지 않습니다. 릴스 영상은 플랫폼 설정에 따라 임베드 재생이 제한될 수 있으며, 원본 링크로 이동할 수 있습니다.

## 실행·테스트

```bash
python -m unittest discover -s tests -v
python scripts/update.py
python -m http.server 8000
```

- `index.html`, `assets/`: 프런트엔드
- `scripts/update.py`: 매일 실행하는 데이터 수집기
- `data/trends.json`, `data/trends.js`, `data/post_index.json`: 자동 갱신 데이터
- `.github/workflows/daily-radar.yml`: 예약 실행·배포
- `tests/test_update.py`: 무인증 테스트

### 정확성 주의

수집 실행 성공은 실제 새 트렌드 확인과 다릅니다. 수집된 데이터가 부족하면 예시 콘셉트와 미검증 검색 후보를 표시하며 신규 유행이나 검증된 영상 건수를 만들어내지 않습니다.
