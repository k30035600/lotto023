# 자동번호 생성·정합성 코드 전수조사 (ShareHarmony Lotto)

> 기준 시점: 저장소 내 `app.js`·`server.py`·`modules/`·`utils/` 기준 (단일 앱 트랙).

---

## 1. 한눈에 보는 구조

| 구분 | 역할 | 주요 위치 |
|------|------|-----------|
| **난수·후보 생성** | 홀짝·연속·핫콜·AC·합계·제외수·과거당첨 제외 등 | `app.js` `pickSix`, `pickSixWithFilters`, `generateNumbersWithFilters` |
| **“신뢰도” 점수** | UI 표시용 0~100 (필터 일치 가중) | `app.js` `calculateAIProbability` |
| **행운번호 5게임** | 필터 초기화 + `collectTrust100HarmonyPoolAsync` → `pickFiveFromHarmonySortedEntries` → `ensureFiveLuckySlotsWithFallbackAsync` | `app.js` `applyReceiveLuckyNumbersEnvironment`, `generateGoldenAiGames`, `runGoldenAiGamesWork` |
| **Perfect BoB 100게임** | 행운번호와 **동일** 수집·정렬·5게임 선정(합 중복 회피·보충); 목표 개수만 100·시도 상한 36000 | `app.js` `runPerfectBobGamesWork` |
| **게임 모드별 UI 생성** | 수동·반자동·AI·행운(구 `bob`/`perfect`는 `manual`/`auto`로 정리) | `app.js` `generateGame`, 모드 버튼 순환 |
| **저장 목록 정렬** | 미추첨: `computeBobHarmonyKey`만(신뢰도% 제외 — 생성 게이트 차이). 추첨완료: BoB 탭/기본 분기 | `app.js` `compareSavedResultRowsBob`, `compareSavedResultRowsDrawn`, `compareSavedResultRowsPending`(폴백) |
| **Perfect·행운 후보 점수** | 미추첨 시 조회구간 핫·평균합(`computeBobHarmonyKey`와 동일 전제) | `app.js` `computePerfectSortKey` |
| **데이터 적재** | xlsx → 정규화(`perfectRank` 등, 파일 호환) | `modules/dataLoader.js` |
| **품질·무작위 기준선** | 앱 생성과 **별도** (롤링 무작위) | `utils/quality_report_rolling.py` |
| **미추첨 상위 K 유지** | CLI 정리 스크립트 | `utils/prune_lotto023_pending_perfect_top.py` |

---

## 2. 자동 생성 핵심 함수 (`app.js`)

### 2.1 `calculateAIProbability(numbers)` (~`3106`)

- **입력**: 길이 6(호출부에서 보통 정렬된 배열).
- **합계**: `getSumRange()` 구간 내 +25, ±20 이내 +12.
- **홀짝**: 드롭다운 `filterOddEven` — `none`이면 만점(+20), 아니면 목표와 일치/±1 부분점.
- **핫콜**: `getOverallHotColdNumbers()`의 핫 집합 — `filterHotCold` 동일 패턴.
- **연속**: `countSequentialPairs` — `filterConsecutive` 동일 패턴.
- **AC**: `calculateAC` — `filterAC` 동일 패턴.
- **상한**: `Math.min(score, 100)`.

**정합성 포인트**: `generateNumbersWithFilters`가 `skipOptionFilters`일 때는 DOM 필터를 `none`으로 두고 뽑지만, **행운/골든 루틴**은 `calculateAIProbability >= 100`을 선호한다면, **생성 단계**와 **채점 단계**가 같은 필터를 보도록 맞춰야 한다(현재는 대부분 `skipOptionFilters`/행운 초기화로 정렬).

### 2.2 `generateNumbersWithFilters(...)` (~`3760`)

- **파라미터**: `existingNumbers`, `skipSumRange`, `excludeCombos`, `skipOptionFilters`, `avoidExtremes`.
- **내부**: `pickSixWithFilters`로 후보 생성 → 합계(`getSumRange`) → `isPastWinningCombo` → `excludeCombos` → `avoidExtremes` 시 `isExtremeCombination`.
- **시도 횟수**: `avoidExtremes`면 1200, 아니면 300; 실패 시 완화된 fallback (`pickSixWithFilters` 또는 `pickSix`).

### 2.3 `pickSixWithFilters` (~`3798`)

- `pickSix` + 셔플 기반으로 6개 구성 후 **홀짝·연속·핫콜·AC**를 필터 문자열과 비교.
- `existingNumbers`가 있으면 반자동/일부 고정 시 나머지만 채움.

### 2.4 보조

- `pickSix` (~`884`): 기본 무작위 6개(제외수 반영).
- `isPastWinningCombo` (~`3722`): 과거 당첨 6개와 동일 조합 제외.
- `isExtremeCombination` (~`3741`): 핫/콜 극단(5개 이상 한쪽) 회피(행운·골든 쪽).
- `getSumRange` (~`3711`): 합계 하한·상한 (UI 입력·통계 연동).

### 2.5 통계·핫 소스

- `getHotColdNumbersBeforeRound(targetRound)` (~`441`): **특정 회차 미만** 데이터로 핫/콜 (저장 시 실제핫 기록 등).
- `getHotColdNumbers` (~`456`): 조회 구간 기반.
- `getOverallHotColdNumbers`: `calculateAIProbability`·일부 생성에서 사용 (~`3746` 근처 호출).

---

## 3. 트리거(누가 생성을 부르는가)

| 트리거 | 함수 | 비고 |
|--------|------|------|
| **행운번호 받기** 버튼 | `generateGoldenAiGames` → `runGoldenAiGamesWork` | `collectTrust100HarmonyPoolAsync`(160·650시도) 후 harmony 정렬·5게임 선정·보충 |
| **Perfect top 5 (BoB)** | `runPerfectBobGamesWork` | 동일 `collectTrust100HarmonyPoolAsync`(100·36000시도), 동일 `pickFive`·`ensureFive…`, 차이는 LottoBoB 저장·모드 `bob`뿐 |
| **게임공 AI추천/행운** | `generateGame` (~`2659` 근반) | 모드별 `generateNumbersWithFilters` / `skipOpt`·`avoidExt` |
| **반자동 번호 채움** | 동일 `generateGame` 분기 | 기존 공 유지 후 나머지 생성 |

---

## 4. 정합성·정렬 (저장 목록·B of B)

### 4.1 당첨 등위

- `getLottoRank` (~`4376`): 1~5등, `matchCount`, `isBonusMatch`.

### 4.2 B of B 정렬 키 (통계 적합도)

- `computePerfectSortKey` (~`5296`):  
  - **추첨 완료**: 당첨 6개 일치 수↑, `|게임합−당첨합|`↓.  
  - **미추첨**: `computeBobHarmonyKey`와 동일 — `currentStatsRounds` 우선, 비면 `allLotto645Data` 폴백으로 핫 22·구간 평균합.
- `comparePerfectSortForRound` (~`4464`): 위 키로 비교, 동률 시 세트·게임.

### 4.3 저장 목록 BoB 점수 (`bobQualityScore`)

- **미추첨**: `computeBobHarmonyKey`만(핫 22 겹침·구간 평균합 근접). **`calculateAIProbability`로 목록을 정렬하지 않음** — 수집 단계에서 행운번호·`runPerfectBobGamesWork` 모두 **신뢰도 100% 게이트**로 통일했으나, 풀 내 대부분 동률(100)이므로 순위는 harmony로 구분.
- **추첨완료**: `computeBobHarmonyKey`(당첨 일치·합 차), `Perfect순위` 있으면 가중.

### 4.4 저장 목록 행 순서

- **미추첨**: 항상 `compareSavedResultRowsBob` — 위 harmony 점수. BoB 탭은 배지만 토글.
- **추첨완료·BoB 탭 OFF**: `compareSavedResultRowsDrawn` — 일치수↓, 보너스↓, 합차↓, 세트↓, 게임↑.
- **추첨완료·BoB 탭 ON**: `compareSavedResultRowsBob`(추첨분기, 시트 순위 반영 가능).
- `compareSavedResultRowsPending`: 당첨 데이터 없을 때 `compareSavedResultRowsDrawn` 폴백용만.

### 4.5 Lotto023 시트 재작성

- `buildLotto023PerfectRewriteRows` (~`4608`), `rewriteLotto023RowsByPerfectOrder` (~`4679`): 상단 네비 B of B 토글 시 서버 `rewrite-lotto023` 연동.

---

## 5. 서버·파일

- **`/api/save-perfect`·`perfect.json`**: 제거됨(B of B 정리). Lotto023 시트의 `Perfect순위` 열은 **기존 파일 읽기** 호환만 유지할 수 있음.

---

## 6. Python 유틸 (앱 JS와의 관계)

- **`utils/quality_report_rolling.py`**: 회차별 당첨 vs **무작위 티켓** 분포 — **자동 생성 알고리즘과 직접 공유 코드 없음** (해석용).
- **`utils/prune_lotto023_pending_perfect_top.py`**: 미추첨 회차만 B of B(미추첨) 키로 정렬 후 상위 K — **앱 `computePerfectSortKey` 미추첨 분기와 맞출 목적** (문서·주석 참고).
- **`utils/ai_analysis.py`**: Gemini Q&A — 번호 생성과 무관.

---

## 7. 레거시·문서와의 차이

- **`readme(삭제하지 말것)/lotto/AUTO_NUMBER_LOGIC.md`**: `generateAutoModeNumbersAsync`, `generateNumbersForGame`, `passesConstraints` 등 **구버전/다른 모듈 구조**를 설명하는 면이 있어, **현 `app.js`의 `generateNumbersWithFilters` 중심 흐름과 1:1 일치하지 않을 수 있음**. 코드 기준은 항상 **`app.js` 최신**을 따름.

---

## 8. 정합성 점검 체크리스트 (개발용)

1. **행운 전환 시** `filter*`가 `none`으로 맞는지 (`applyReceiveLuckyNumbersEnvironment` + 행운 클릭 분기).
2. **`calculateAIProbability`와 `pickSixWithFilters`**가 같은 `filterOddEven`/`filterHotCold`/… DOM 값을 쓰는지 (반자동·AI는 `skipOptionFilters` 여부 주의).
3. **미추첨 Perfect/BoB 통계 키**: `computePerfectSortKey`·`computeBobHarmonyKey` 모두 `currentStatsRounds` 우선, 비면 `allLotto645Data` 폴백 (`round < 저장회차`).
4. **행운 vs BoB·수집 게이트**: `runGoldenAiGamesWork`·`runPerfectBobGamesWork` 모두 후보 `calculateAIProbability < 100` 탈락. 목록 `bobQualityScore`(미추첨)는 harmony만(100% 동률 구분).
5. **`Perfect순위`**: `modules/dataLoader.js`에서만 `perfectRank`로 들어오고, UI 배지·툴팁은 `loadAndDisplayResults` 쪽.
6. **Perfect순위**: UI 배지는 제거됨; 파일에 값이 있어도 표시만 생략.

---

## 9. 관련 파일 목록 (빠른 grep용)

```
app.js                          # 생성·채점·정렬·저장 UI 대부분
modules/dataLoader.js           # Lotto023 정규화, Perfect순위 → perfectRank
modules/state.js                # perfectSortPending, resultListRoundFilter 등
server.py                       # save-lotto023, rewrite-lotto023(시트 전체 덮어쓰기 등)
utils/quality_report_rolling.py
utils/prune_lotto023_pending_perfect_top.py
docs/PERFECT_AND_QUALITY.md
docs/QUALITY_REPORT_ROLLING.md
```

이 문서는 **코드 위치 추적용 인벤토리**이며, 동작 변경 시 **함수명·줄 번호는 리팩터 후 달라질 수 있으므로** grep으로 재확인하는 것을 권장합니다.
