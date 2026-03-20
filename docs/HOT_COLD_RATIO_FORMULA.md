# 핫/콜 비율 계산 공식

## 1. 핫/콜 번호 분류 공식

### 단계 1: 각 번호의 통계 계산
각 번호(1~45)에 대해 다음 3가지 통계를 계산합니다:

1. **당첨 횟수 (winCount)**: 해당 번호가 당첨번호(보너스 제외)로 나온 횟수
2. **출현 횟수 (appCount)**: 해당 번호가 당첨번호 + 보너스번호로 나온 횟수
3. **연속 출현 횟수 (seqCount)**: 해당 번호가 연속된 번호 쌍의 일부로 등장한 횟수
   - 예: [1, 2, 5, 10, 11, 20] → 1,2와 10,11이 연속 → 1,2,10,11 각각 +1

### 단계 2: 정렬 기준
다음 순서로 정렬합니다:
1. **당첨 횟수** 내림차순 (높은 순)
2. **출현 횟수** 내림차순 (높은 순)
3. **연속 출현 횟수** 내림차순 (높은 순)
4. **번호** 내림차순 (높은 순)

### 단계 3: 핫/콜 분류
- **핫 (Hot)**: 상위 22개 번호
- **콜 (Cold)**: 하위 23개 번호 (역순 정렬)

```javascript
// 코드 예시
var sorted = [...].sort(function (a, b) {
    if (b.count !== a.count) return b.count - a.count;        // 당첨 횟수
    if (b.appCount !== a.appCount) return b.appCount - a.appCount;  // 출현 횟수
    if (b.seqCount !== a.seqCount) return b.seqCount - a.seqCount;  // 연속 출현 횟수
    return b.number - a.number;  // 번호
});
var hot = sorted.slice(0, 22).map(s => s.number);      // 상위 22개
var cold = sorted.slice(22).reverse().map(s => s.number); // 하위 23개
```

## 2. 핫/콜 비율 거리 계산 공식 (정성도 점수용)

생성된 번호 조합에서 핫/콜 비율이 실제 통계와 얼마나 다른지 계산합니다:

### 공식
```
hotMatch = 생성된 번호 중 핫 번호 개수 (0~6)
coldMatch = 생성된 번호 중 콜 번호 개수 (0~6)

refHotAvg = 3.0  // 실제 통계 평균 핫 개수
refColdAvg = 3.0  // 실제 통계 평균 콜 개수

hotColdDist = |hotMatch - refHotAvg| + |coldMatch - refColdAvg|
```

### 예시
- 생성된 번호: 핫 6개, 콜 0개
  - `hotColdDist = |6 - 3| + |0 - 3| = 3 + 3 = 6`
  
- 생성된 번호: 핫 3개, 콜 3개 (실제 통계와 일치)
  - `hotColdDist = |3 - 3| + |3 - 3| = 0 + 0 = 0` ✅ 최적

- 생성된 번호: 핫 4개, 콜 2개
  - `hotColdDist = |4 - 3| + |2 - 3| = 1 + 1 = 2`

## 3. 정성도 점수에 반영

```
score = (hotMatch × 100) 
      - (sumDist × 0.5) 
      - (oddEvenDist × 10) 
      - (acDist × 5) 
      - (hotColdDist × 15)  ← 핫/콜 비율 거리 페널티
```

**핫/콜 비율이 실제 통계(핫3:콜3)에 가까울수록 점수가 높아집니다.**

## 4. 실제 통계 (최근 100회차 기준)

- **핫3:콜3**: 34% (가장 많음)
- **핫4:콜2**: 25%
- **핫2:콜4**: 24%
- **핫1:콜5**: 9%
- **핫5:콜1**: 7%
- **핫6:콜0**: 1% (매우 드묾)

**평균**: 핫 3.00개, 콜 3.00개
