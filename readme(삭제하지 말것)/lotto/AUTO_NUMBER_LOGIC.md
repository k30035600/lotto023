# 자동번호 생성 로직 설명

## 자동선택 모드 번호 생성 프로세스

### 1. 초기화 (`initializeGameForAutoMode`)
- 현재 세트 초기화
- 선택공 배열 초기화
- 결과 영역 초기화
- 체크박스 리셋
- 전역 선택공 영역 활성화

### 2. 비동기 번호 생성 (`generateAutoModeNumbersAsync`)

#### 주요 특징:
- **5개 게임**을 순차적으로 생성
- 각 게임마다 **최대 20회 시도**
- 조건을 만족하는 번호가 나올 때까지 재시도
- 조건을 만족하지 못하면 완화된 조건으로 생성

#### 생성 과정:
1. `generateNumbersForGame(gameIndex, skipRender=true)` 호출
2. 생성된 번호 유효성 검사
3. 제약 조건 확인 (`passesConstraints`)
4. 조건 만족 시 해당 게임 저장 및 렌더링
5. 조건 불만족 시 재시도 (최대 20회)
6. 20회 실패 시 완화된 조건으로 생성

### 3. 개별 게임 번호 생성 (`generateNumbersForGame`)

#### 자동 모드 (`mode === "auto"`)일 때:

**자동선택 필터 (`activeFilters.statFilter === "auto"`)일 경우:**
- 선택공 무시
- 완전히 랜덤 생성
- 필터 적용:
  - 통계 필터 (당첨순/출현순) 적용 가능
  - 홀짝 필터 적용 가능
  - 연속 필터 적용 가능
- 홀짝 비율에 맞춰 `selectNumbersWithOddEvenRatio`로 생성

**수동선택 필터 (`activeFilters.statFilter === "none"`)일 경우:**
- 선택공 우선 포함
- 나머지를 자동 생성
- 필터 적용:
  - 핫콜 필터 적용 가능
  - 홀짝 필터 적용 가능
  - 연속 필터 적용 가능

#### 반자동 모드 (`mode === "semi-auto"`)일 때:
- 기존 입력된 공 유지
- 선택공을 순서대로 추가
- 나머지는 홀짝 비율에 맞춰 자동 생성

### 4. 홀짝 비율 선택 (`selectNumbersWithOddEvenRatio`)

#### 로직:
1. 목표 홀짝 비율 확인:
   - 홀4:짝2 (`odd`) → 홀수 4개, 짝수 2개
   - 홀2:짝4 (`even`) → 홀수 2개, 짝수 4개
   - 홀3:짝3 (`balanced`) → 홀수 3개, 짝수 3개
   - 홀짝없음 (`none`) → 비율 제한 없음

2. 기존 번호의 홀짝 개수 계산

3. 필요한 홀수/짝수 개수 계산:
   ```
   needOdd = targetOdd - currentOdd
   needEven = targetEven - currentEven
   ```

4. 번호 풀에서 홀수/짝수 분리

5. 목표 비율에 맞춰 선택:
   - 홀수 풀에서 필요한 개수만큼 선택
   - 짝수 풀에서 필요한 개수만큼 선택
   - 목표 비율이 맞지 않으면 재시도

### 5. 제약 조건 확인 (`passesConstraints`)

#### 확인 항목:
1. **통계 필터** (`checkStatFilter`):
   - 당첨순/출현순 필터가 적용된 경우, 해당 번호들만 사용

2. **연속 필터** (`checkSequence`):
   - 연속없음: 연속된 번호 쌍이 없어야 함
   - 연속 1회/2회/3회: 정확히 해당 개수의 연속 쌍이 있어야 함

3. **핫콜 필터** (`checkHotCold`):
   - 핫4:콜2, 핫2:콜4, 핫3:콜3 비율 확인

4. **홀짝 필터** (`checkOddEvenRatio`):
   - 홀4:짝2, 홀2:짝4, 홀3:짝3 비율 확인

### 6. 재시도 메커니즘

#### `generateNumbersForGame` 내부:
- 자동선택 모드: 최대 **50회** 재시도
- 일반 모드: 최대 **1000회** 재시도

#### `generateAutoModeNumbersAsync` 내부:
- 각 게임마다 최대 **20회** 시도
- 실패 시 `generateSingleGameWithRelaxedConstraints` 호출
- 완화된 조건에서 최대 **15회** 추가 시도

### 7. 성능 최적화

#### 현재 설정:
- 게임별 시도 횟수: 20회 (30회에서 감소)
- 게임 간 지연: 5ms (10ms에서 감소)
- 시도 간 지연 빈도: 15회마다 (10회마다에서 증가)
- `generateNumbersForGame` 재시도: 50회 (100회에서 감소)
- 완화된 조건 시도: 15회 (20회에서 감소)

## 주요 함수들

- `initializeGameForAutoMode()`: 자동선택 모드 초기화
- `generateAutoModeNumbersAsync()`: 비동기 번호 생성 (5개 게임)
- `generateNumbersForGame(gameIndex, skipRender)`: 개별 게임 번호 생성
- `selectNumbersWithOddEvenRatio(pool, existingNumbers, totalNeeded)`: 홀짝 비율에 맞춰 번호 선택
- `passesConstraints(numbers, filters)`: 제약 조건 확인
- `generateSingleGameWithRelaxedConstraints(gameIndex)`: 완화된 조건으로 생성






