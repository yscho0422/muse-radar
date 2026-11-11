# MUSE RADAR — 한국 뷰티 릴스 트렌드 레이더

한국 메이크업 콘셉트를 모아보고, 주제를 클릭해 관련 Instagram Reels / TikTok / YouTube 영상 원본을 확인하는 정적 웹사이트입니다.

## 현재 구현

- 반응형 메이크업 트렌드 대시보드
- 클릭 가능한 콘셉트 카드 및 영상 갤러리
- 브라우저 북마크, 검색, 카테고리 필터
- GitHub Actions를 이용한 한국 시간 **2시간마다 17분** 데이터 갱신 시도
- 실제 영상 원본 링크와 미검증 검색 키워드 구분
- 원본 영상 수와 참여 크리에이터 수를 기반으로 한 **관측 점수** (플랫폼 알고리즘의 공식 순위가 아님)


## Instagram 릴스 수집 활성화 (2026-11)

Instagram의 **공개 릴스**를 수집하려면 Apify 계정의 API 토큰이 필요합니다. 공식 Meta Instagram 계정 연동이 아니라 제3자 공개 데이터 수집 방식이며, 실패·차단 또는 이용 요금이 발생할 수 있습니다.

1. [Apify](https://console.apify.com/)에서 계정을 만든 뒤 **Settings → API & Integrations / API tokens**에서 API 토큰을 복사합니다. API 토큰을 코드나 공개 페이지에 붙여 넣지 마세요.
2. [GitHub Actions secrets](https://github.com/yscho0422/muse-radar/settings/secrets/actions)에서 **New repository secret**을 클릭하고, Name: `APIFY_TOKEN`, Secret: Apify 토큰 값으로 저장합니다.
3. [MUSE RADAR Actions](https://github.com/yscho0422/muse-radar/actions/workflows/daily-radar.yml)를 열어 **Run workflow → main → Run workflow**를 실행합니다. 작업 로그의 `Update trend data` 및 배포 성공 여부를 확인합니다.
4. 성공하면 저장된 공개 릴스 URL과 썸네일이 사이트에 나타납니다. 최신 자료를 보려면 웹사이트의 **Refresh** 버튼을 누르면 됩니다.

이 프로젝트의 스케줄은 **한국 시간 기준 2시간마다(0,2,4시 등 17분)** 한 번 실행을 시도합니다. 자동 수집량은 Instagram 태그당 최대 4개, 실행당 최대 3개 태그로 제한했습니다. 별도로 `ENABLE_TIKTOK=0`으로 TikTok 유료 검색을 꺼두었습니다. 수집량 제한이 지출 상한을 보장하지는 않으므로 Apify 사용량·청구 한도를 별도로 확인하세요.

> **Refresh 버튼과 수집기 차이:** GitHub Pages는 정적 사이트여서 GitHub 비밀 토큰을 가진 서버 수집기를 버튼 하나로 직접 실행할 수 없습니다. **Refresh**는 현재 공개 영상 검색 및 배포된 데이터의 즉시 다시 읽기이고, **Instagram 재수집 ↗**는 GitHub의 안전한 수동 실행 화면을 여는 버튼입니다. Apify 토큰을 등록한 이후부터 Instagram을 새로 수집할 수 있습니다.

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
