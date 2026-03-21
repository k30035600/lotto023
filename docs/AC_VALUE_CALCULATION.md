# 평균 AC값 계산 방법

## 1. AC값이란?

**AC (Arithmetic Complexity)**: 번호 간격의 다양성을 나타내는 지표
- 번호들 사이의 차이값의 고유 개수를 계산
- 값의 범위: 0 ~ 10

## 2. AC값 계산 공식

### 기본 계산 과정

```javascript
function calculateAC(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const diffs = new Set();
    
    // 모든 번호 쌍의 차이값 계산
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            diffs.add(Math.abs(sorted[j] - sorted[i]));
        }
    }
    
    // AC값 = 고유 차이값 개수 - 5
    return diffs.size - 5;
}
```

### 구체적인 예시

**예시 1: [1, 2, 3, 4, 5, 6]**
```
차이값:
  2-1=1, 3-1=2, 4-1=3, 5-1=4, 6-1=5
  3-2=1, 4-2=2, 5-2=3, 6-2=4
  4-3=1, 5-3=2, 6-3=3
  5-4=1, 6-4=2
  6-5=1

고유 차이값: {1, 2, 3, 4, 5}
개수: 5
AC값 = 5 - 5 = 0 (간격이 매우 단조로움)
```

**예시 2: [1, 5, 10, 20, 30, 45]**
```
차이값:
  5-1=4, 10-1=9, 20-1=19, 30-1=29, 45-1=44
  10-5=5, 20-5=15, 30-5=25, 45-5=40
  20-10=10, 30-10=20, 45-10=35
  30-20=10, 45-20=25
  45-30=15

고유 차이값: {4, 9, 19, 29, 44, 5, 15, 25, 40, 10, 20, 35}
개수: 12
AC값 = 12 - 5 = 7 (간격이 다양함)
```

**예시 3: [10, 15, 20, 25, 30, 35]**
```
차이값:
  15-10=5, 20-10=10, 25-10=15, 30-10=20, 35-10=25
  20-15=5, 25-15=10, 30-15=15, 35-15=20
  25-20=5, 30-20=10, 35-20=15
  30-25=5, 35-25=10
  35-30=5

고유 차이값: {5, 10, 15, 20, 25}
개수: 5
AC값 = 5 - 5 = 0 (등간격)
```

## 3. 평균 AC값 계산

### 계산 과정

```javascript
// 1단계: 해당 회차 이전의 모든 회차 데이터 필터링
const statRounds = AppState.allLotto645Data.filter(r => 
    r.round < roundNum && 
    r.numbers && 
    Array.isArray(r.numbers) && 
    r.numbers.length >= 6
);

// 2단계: 각 회차의 AC값 계산
const acs = statRounds.map(r => {
    const ns = r.numbers.slice(0, 6)
        .map(n => Number(n))
        .filter(n => !Number.isNaN(n));
    
    if (ns.length === 6) {
        return calculateAC(ns);  // AC값 계산
    }
    return null;
}).filter(ac => ac != null);

// 3단계: AC값들의 평균 계산
let refAcAvg = 5.0; // 기본값
if (acs.length > 0) {
    refAcAvg = acs.reduce((a, b) => a + b, 0) / acs.length;
}
```

### 구체적인 예시

**1215회차 기준:**
- 이전 회차: 1회차 ~ 1214회차 (총 1214개)
- 각 회차의 AC값:
  - 1회차: AC값 5
  - 2회차: AC값 7
  - 3회차: AC값 4
  - ...
  - 1214회차: AC값 6
- 평균 계산: `(5 + 7 + 4 + ... + 6) / 1214 ≈ 5.0`

**생성된 번호의 AC값이 6인 경우:**
- `acDist = |6 - 5.0| = 1.0`

## 4. AC값 거리 계산

```javascript
const gameAc = calculateAC(nums);  // 생성된 번호의 AC값
const acDist = Math.abs(gameAc - refAcAvg);  // 평균과의 거리
```

## 5. 정성도 점수 반영

```
score = (hotMatch × 100) 
      - (sumDist × 0.5) 
      - (oddEvenDist × 10) 
      - (acDist × 5)  ← AC값 거리 페널티
      - (hotColdDist × 15)
```

**AC값이 과거 통계 평균에 가까울수록 점수가 높아집니다.**

## 6. AC값의 의미

- **AC값이 낮음 (0~3)**: 번호들이 규칙적으로 배치됨 (등간격, 연속 등)
- **AC값이 중간 (4~6)**: 번호들이 적절히 분산됨 (일반적인 패턴)
- **AC값이 높음 (7~10)**: 번호들이 불규칙하게 분산됨 (다양한 간격)

**일반적으로 AC값 4~6이 가장 흔하며, 평균도 약 5.0입니다.**
