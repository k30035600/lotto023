/** API 서버 베이스 URL 가져오기 */
function getApiBaseUrl() {
    // Railway 등 배포 환경에서는 현재 도메인을 사용, 로컬 테스트 시에는 localhost:8000 등이 될 수 있음
    return window.location.origin;
}

// constants.js에서 로드된 전역 변수들이 사용됩니다.
// DEFAULT_SET_COUNT: 기본 세트 수
// LOTTO_CONSTANTS: 로또 관련 상수
// HOT_COLD_RATIO_MAP: 핫/콜 비율 맵
// ODD_EVEN_RATIO_MAP: 홀/짝 비율 맵

/** 전역 상태 관리 모듈 */
// AppState는 modules/state.js에서 로드됩니다.

// Removed redundant: let activeFilters = AppState.activeFilters;
// Use AppState.activeFilters directly instead

// loadLotto645Data, loadLotto023Data 및 관련 유틸리티는 dataLoader.js에서 로드됩니다.

// getAllNumbers, sortNumbers, getOddEvenNumbers 등은 generator.js 또는 statistics.js의 기능을 사용하거나, 
// app.js 내부에서 필요한 최소한의 유틸리티만 남겨둡니다. 
// (주의: generator.js의 함수들은 전역으로 노출되지 않았을 수 있으므로 확인 필요. 
// 하지만 현재 구조상 script 태그로 로드하므로 전역에 있을 가능성이 높음.
// 안전을 위해, app.js에서 *내부적으로만* 쓰이는 간단한 유틸리티는 남겨두거나, 
// generator.js가 전역으로 노출하는 함수명과 겹치지 않게 주의해야 함.
// 여기서는 `calculateWinStats` 등 statistics.js와 명확히 겹치는 함수들을 제거합니다.)

/**
 * 통계 데이터 초기화
 * @param {Array} lottoData - 로또 데이터 배열
 */
function initializeStats(lottoData) {
    if (!lottoData) return;

    // 회차별 당첨번호는 이 데이터만 사용 (Lotto645.xlsx 전용, API 병합 없음)
    AppState.allLotto645Data = lottoData;
    AppState.currentStatsRounds = lottoData || [];

    // 회차 및 합계 범위 설정
    if (lottoData.length > 0) {
        const rounds = lottoData.map(r => r && r.round ? Number(r.round) : NaN).filter(n => !isNaN(n));
        if (rounds.length > 0) {
            AppState.startRound = Math.min(...rounds);
            AppState.endRound = Math.max(...rounds);
        }

        const sums = lottoData.map(r => {
            const nums = (r && Array.isArray(r.numbers)) ? r.numbers : [];
            return nums.length > 0 ? nums.reduce((a, b) => a + (Number(b) || 0), 0) : NaN;
        }).filter(n => !isNaN(n) && n >= 21 && n <= 255);

        if (sums.length > 0) {
            AppState.sumRangeStart = Math.min(...sums);
            AppState.sumRangeEnd = Math.max(...sums);
        }
    }

    // statistics.js의 initializeStatistics 함수를 사용하여 통계 계산
    if (typeof initializeStatistics === 'function') {
        const stats = initializeStatistics(lottoData, LOTTO_CONSTANTS.MAX_NUMBER);

        // AppState 업데이트
        AppState.winStatsMap = stats.winStatsMap;
        AppState.appearanceStatsMap = stats.appearanceStatsMap;
        AppState.winPercentageCache = stats.winPercentageMap;
        AppState.appearancePercentageCache = stats.appearancePercentageMap;
        AppState.overallHotColdCache = stats.hotCold;

        // winStats 배열 생성 (정렬)
        AppState.winStats = Array.from(AppState.winStatsMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => a.number - b.number);

        // 기존 호환성을 위해 avgPercentageCache 설정
        AppState.avgPercentageCache = stats.winPercentageMap;
    } else {
        console.error('initializeStatistics function not found in statistics.js');
    }

    // 평균 횟수 캐시 계산
    const avgCount = lottoData.length > 0
        ? lottoData.reduce((sum, round) => sum + (round.numbers ? round.numbers.length : 0), 0) / (lottoData.length * LOTTO_CONSTANTS.SET_SIZE)
        : 0;
    AppState.avgCountCache = avgCount;

    // 현재 통계 업데이트
    updateCurrentStats();

    // 월별 평균 차트 렌더링 추가
    if (typeof renderMonthlyAverageChart === 'function') {
        renderMonthlyAverageChart(lottoData);
    }
}

/**
 * 현재 통계 업데이트
 */
function updateCurrentStats() {
    if (!AppState.winStats || AppState.winStats.length === 0) {
        AppState.currentStats = [];
        return;
    }

    AppState.currentStats = AppState.winStats.map(stat => ({
        number: stat.number,
        count: stat.count,
        percentage: AppState.avgPercentageCache
            ? (AppState.avgPercentageCache.get(stat.number) || 0)
            : 0
    }));
}

/**
 * 통계 기준으로 정렬
 * @param {Array} numbers - 정렬할 번호 배열
 * @param {boolean} byCount - true면 횟수로, false면 비율로 정렬
 * @param {boolean} descending - true면 내림차순, false면 오름차순
 * @returns {Array<number>} 정렬된 번호 배열
 */
function sortByStat(numbers, byCount = true, descending = true) {
    if (!AppState.winStatsMap || AppState.winStatsMap.size === 0) {
        return numbers;
    }

    const percentageMap = AppState.avgPercentageCache || new Map();

    return numbers.slice().sort((a, b) => {
        let valueA, valueB;

        if (byCount) {
            valueA = AppState.winStatsMap.get(a) || 0;
            valueB = AppState.winStatsMap.get(b) || 0;
        } else {
            valueA = percentageMap.get(a) || 0;
            valueB = percentageMap.get(b) || 0;
        }

        if (descending) {
            return valueB - valueA;
        } else {
            return valueA - valueB;
        }
    });
}

/**
 * 모든 로또 번호 (1~45) 배열 반환
 * @returns {Array} 1부터 45까지의 숫자 배열
 */
function getAllNumbers() {
    return Array.from({ length: LOTTO_CONSTANTS.MAX_NUMBER }, (_, i) => i + 1);
}

/**
 * 통계 기준으로 필터링된 번호 반환
 * @param {boolean} highCount - true면 높은 순위, false면 낮은 순위
 * @returns {Array<number>} 필터링된 번호 배열
 */
function getFilteredNumbersByCount(highCount = true) {
    if (!AppState.winStats || AppState.winStats.length === 0) {
        return getAllNumbers();
    }

    const sortedStats = AppState.winStats.slice().sort((a, b) => {
        if (highCount) {
            return b.count - a.count;
        } else {
            return a.count - b.count;
        }
    });

    // 상위/하위 절반 반환
    const halfLength = Math.ceil(sortedStats.length / 2);
    return sortedStats.slice(0, halfLength).map(stat => stat.number);
}

/**
 * 전체 데이터를 기준으로 한 핫/콜 번호 계산 및 반환
 */
function getOverallHotColdNumbers() {
    if (!AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return { hot: [], cold: [] };
    }

    if (AppState.overallHotColdCache) return AppState.overallHotColdCache;

    const overallWinStatsMap = calculateWinStats(AppState.allLotto645Data);
    const sortedStats = Array.from(overallWinStatsMap.entries())
        .map(([number, count]) => ({ number, count }))
        .sort((a, b) => b.count - a.count);

    const halfLength = Math.ceil(sortedStats.length / 2);
    const hot = sortedStats.slice(0, halfLength).map(stat => stat.number);
    const cold = sortedStats.slice(halfLength).map(stat => stat.number);

    AppState.overallHotColdCache = { hot, cold };
    return AppState.overallHotColdCache;
}

/**
 * 핫/콜 번호 계산 및 반환
 * @returns {Object} {hot: 핫 번호 배열, cold: 콜 번호 배열}
 */
function getHotColdNumbers() {
    if (!AppState.winStats || AppState.winStats.length === 0) {
        return { hot: [], cold: [] };
    }

    const sortedStats = AppState.winStats.slice().sort((a, b) => b.count - a.count);
    const halfLength = Math.ceil(sortedStats.length / 2);

    const hot = sortedStats.slice(0, halfLength).map(stat => stat.number);
    const cold = sortedStats.slice(halfLength).map(stat => stat.number);

    return { hot, cold };
}

/**
 * 선호 번호 가져오기 (현재는 선택된 선호 번호 반환)
 * @returns {Array<number>} 선호 번호 배열
 */
function getPreferredNumbers() {
    return AppState.selectedPreferredNumbers || [];
}

function shuffledPool(filterOdd = false, filterEven = false) {
    let numbers = getAllNumbers();

    const oddEvenFilter = filterOdd ? "odd" : (filterEven ? "even" : "none");
    numbers = applyOddEvenFilter(numbers, oddEvenFilter);

    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
}

function hasSequential(sorted) {
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            return true;
        }
    }
    return false;
}

function countSequentialPairs(sorted) {
    let count = 0;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            count++;
        }
    }
    return count;
}

function checkOddEvenRatio(sorted, oddEvenFilter) {
    if (!oddEvenFilter || oddEvenFilter === "none") {
        return true;
    }

    const { odd, even } = getOddEvenNumbers();
    const oddSet = new Set(odd);
    const evenSet = new Set(even);

    const oddCount = sorted.filter(n => oddSet.has(n)).length;
    const evenCount = sorted.filter(n => evenSet.has(n)).length;

    const targetRatio = ODD_EVEN_RATIO_MAP[oddEvenFilter];
    return targetRatio ? oddCount === targetRatio.odd && evenCount === targetRatio.even : true;
}

function checkStatFilter(sorted, statFilter) {
    if (!isStatFilter(statFilter)) {
        return true;
    }
    const highCountNumbers = new Set(getFilteredNumbersByCount(true));
    return sorted.every(n => highCountNumbers.has(n));
}

function checkSequence(sorted, sequenceFilter) {
    if (!sequenceFilter || sequenceFilter === "none") {
        const hasSeq = hasSequential(sorted);
        return !hasSeq;
    }
    const sequentialCount = countSequentialPairs(sorted);
    const requiredCount = parseInt(sequenceFilter) || 0;
    return sequentialCount === requiredCount;
}

function checkHotCold(sorted, hotColdFilter, statFilter) {
    if (!canApplyHotColdFilter(statFilter) || !hotColdFilter || hotColdFilter === "none") {
        return true;
    }

    const { hot, cold } = getHotColdNumbers();
    const hotSet = new Set(hot);
    const coldSet = new Set(cold);

    const hotCount = sorted.filter(n => hotSet.has(n)).length;
    const coldCount = sorted.filter(n => coldSet.has(n)).length;

    const targetRatio = HOT_COLD_RATIO_MAP[hotColdFilter];
    return targetRatio ? hotCount === targetRatio.hot && coldCount === targetRatio.cold : true;
}

function passesConstraints(nums, filters) {
    const sorted = sortNumbers(nums);

    const statFilterCheck = checkStatFilter(sorted, filters.statFilter);
    const sequenceCheck = checkSequence(sorted, filters.sequence);
    const hotColdCheck = checkHotCold(sorted, filters.hotCold, filters.statFilter);
    const oddEvenCheck = checkOddEvenRatio(sorted, filters.oddEven);

    return statFilterCheck && sequenceCheck && hotColdCheck && oddEvenCheck;
}

function getFilteredPool() {
    const pool = getAllNumbers();
    let filteredPool = pool;

    const isCount = isCountFilter(AppState.activeFilters.statFilter);
    const isPercentage = isPercentageFilter(AppState.activeFilters.statFilter);

    if (isCount || isPercentage) {
        const highCountNumbers = new Set(getFilteredNumbersByCount(true));
        filteredPool = filteredPool.filter(n => highCountNumbers.has(n));
        if (isCount) {
            const descending = AppState.activeFilters.statFilter === "count-desc";
            sortByStat(filteredPool, true, descending);
        } else {
            const descending = AppState.activeFilters.statFilter === "percentage-desc";
            sortByStat(filteredPool, false, descending);
        }
    }

    filteredPool = applyOddEvenFilter(filteredPool, AppState.activeFilters.oddEven);
    if (canApplyHotColdFilter(AppState.activeFilters.statFilter)) {
        filteredPool = applyHotColdFilter(filteredPool, AppState.activeFilters.hotCold);
    }

    return filteredPool;
}

function getOddEvenTargetCounts() {
    if (AppState.activeFilters.oddEven === "odd") return { oddCount: 4, evenCount: 2 };
    if (AppState.activeFilters.oddEven === "even") return { oddCount: 2, evenCount: 4 };
    if (AppState.activeFilters.oddEven === "balanced") return { oddCount: 3, evenCount: 3 };
    return null;
}

// selectNumbersWithOddEvenRatio는 game-logic.js에서 가져옴

function getOddEvenNumbers() {
    const odd = [];
    const even = [];
    for (let i = 1; i <= 45; i++) {
        if (i % 2 === 0) even.push(i);
        else odd.push(i);
    }
    return { odd, even };
}

function applyOddEvenFilter(numbers, oddEvenFilter) {
    if (numbers.length === 0 || oddEvenFilter === "none") {
        return numbers;
    }

    const { odd, even } = getOddEvenNumbers();
    const oddSet = new Set(odd);
    const evenSet = new Set(even);

    if (oddEvenFilter === "odd" || oddEvenFilter === "even" || oddEvenFilter === "balanced") {
        return numbers.filter(n => oddSet.has(n) || evenSet.has(n));
    }
    return numbers;
}

function applyHotColdFilter(numbers, hotColdFilter) {
    if (numbers.length === 0 || hotColdFilter === "none") {
        return numbers;
    }

    const { hot, cold } = getHotColdNumbers();
    const hotSet = new Set(hot);
    const coldSet = new Set(cold);

    if (hotColdFilter === "hot" || hotColdFilter === "cold" || hotColdFilter === "mixed") {
        return numbers.filter(n => hotSet.has(n) || coldSet.has(n));
    }
    return numbers;
}

function canApplyHotColdFilter(statFilter) {
    if (statFilter === 'none') {
        return false;
    }
    return isCountFilter(AppState.activeFilters.statFilter);
}

function isCountFilter(statFilter) {
    return statFilter === "count-desc" || statFilter === "count-asc";
}

function isPercentageFilter(statFilter) {
    return statFilter === "percentage-desc" || statFilter === "percentage-asc";
}

function isStatFilter(statFilter) {
    return isCountFilter(statFilter) || isPercentageFilter(statFilter);
}

/**
 * 게임 로직 모듈
 * 번호 생성, 필터링, 제약 조건 체크 등의 게임 로직을 담당합니다.
 */

/**
 * 홀짝 비율에 맞춰 번호 선택
 */
function selectNumbersWithOddEvenRatio(pool, existingNumbers, totalNeeded) {
    const targetCounts = getOddEvenTargetCounts();

    // 홀짝 비율 제한이 없으면 랜덤으로 선택
    if (!targetCounts) {
        const result = [...existingNumbers];
        const resultSet = new Set(result);
        const availablePool = pool.filter(n => !resultSet.has(n));
        const shuffled = [...availablePool].sort(() => Math.random() - 0.5);

        for (let i = 0; i < shuffled.length && result.length < totalNeeded; i++) {
            result.push(shuffled[i]);
        }

        return result.slice(0, totalNeeded);
    }

    const { oddCount: targetOdd, evenCount: targetEven } = targetCounts;

    // 기존 번호에서 홀수/짝수 개수 계산
    let currentOdd = existingNumbers.filter(n => n % 2 === 1).length;
    let currentEven = existingNumbers.filter(n => n % 2 === 0).length;

    const result = [...existingNumbers];
    const resultSet = new Set(result);

    // 풀에서 홀수/짝수 분리
    const oddPool = pool.filter(n => n % 2 === 1 && !resultSet.has(n));
    const evenPool = pool.filter(n => n % 2 === 0 && !resultSet.has(n));

    // 셔플
    const shuffledOdd = [...oddPool].sort(() => Math.random() - 0.5);
    const shuffledEven = [...evenPool].sort(() => Math.random() - 0.5);

    // 목표 비율에 맞춰 정확히 선택
    const needOdd = Math.max(0, targetOdd - currentOdd);
    const needEven = Math.max(0, targetEven - currentEven);
    const remaining = totalNeeded - result.length;

    // 목표 비율에 맞춰 홀수/짝수 선택
    let oddSelected = 0;
    let evenSelected = 0;

    // 우선순위: 목표 비율에 맞춰 선택
    while (result.length < totalNeeded) {
        const needOddNow = needOdd - oddSelected;
        const needEvenNow = needEven - evenSelected;
        const remainingSlots = totalNeeded - result.length;

        // 목표 비율을 우선적으로 맞춤
        if (needOddNow > 0 && oddSelected < shuffledOdd.length && oddSelected < needOdd) {
            result.push(shuffledOdd[oddSelected]);
            resultSet.add(shuffledOdd[oddSelected]);
            oddSelected++;
        } else if (needEvenNow > 0 && evenSelected < shuffledEven.length && evenSelected < needEven) {
            result.push(shuffledEven[evenSelected]);
            resultSet.add(shuffledEven[evenSelected]);
            evenSelected++;
        } else {
            // 목표 비율 달성 후 남은 자리 채우기
            if (oddSelected < shuffledOdd.length && (evenSelected >= shuffledEven.length || Math.random() < 0.5)) {
                result.push(shuffledOdd[oddSelected]);
                resultSet.add(shuffledOdd[oddSelected]);
                oddSelected++;
            } else if (evenSelected < shuffledEven.length) {
                result.push(shuffledEven[evenSelected]);
                resultSet.add(shuffledEven[evenSelected]);
                evenSelected++;
            } else {
                // 풀에 더 이상 번호가 없으면 중단
                break;
            }
        }
    }

    // 최종 결과의 홀짝 비율 확인 및 조정
    const finalOdd = result.filter(n => n % 2 === 1).length;
    const finalEven = result.filter(n => n % 2 === 0).length;

    // 목표 비율과 다르면 간단한 재시도 (성능 최적화)
    if (finalOdd !== targetOdd || finalEven !== targetEven) {
        // 풀에 충분한 홀수/짝수가 있는지 확인
        if (oddPool.length >= targetOdd && evenPool.length >= targetEven) {
            // 간단한 재시도: 목표 비율에 정확히 맞춤
            const retryResult = [...existingNumbers];
            const retrySet = new Set(retryResult);
            const retryOddPool = pool.filter(n => n % 2 === 1 && !retrySet.has(n));
            const retryEvenPool = pool.filter(n => n % 2 === 0 && !retrySet.has(n));

            // 재시도 시 기존 번호의 홀짝 개수 다시 계산
            const retryCurrentOdd = retryResult.filter(n => n % 2 === 1).length;
            const retryCurrentEven = retryResult.filter(n => n % 2 === 0).length;
            const retryNeedOdd = Math.max(0, targetOdd - retryCurrentOdd);
            const retryNeedEven = Math.max(0, targetEven - retryCurrentEven);

            const retryShuffledOdd = [...retryOddPool].sort(() => Math.random() - 0.5);
            const retryShuffledEven = [...retryEvenPool].sort(() => Math.random() - 0.5);

            // 목표 비율에 정확히 맞춰 선택
            for (let i = 0; i < retryNeedOdd && retryResult.length < totalNeeded && i < retryShuffledOdd.length; i++) {
                retryResult.push(retryShuffledOdd[i]);
            }
            for (let i = 0; i < retryNeedEven && retryResult.length < totalNeeded && i < retryShuffledEven.length; i++) {
                retryResult.push(retryShuffledEven[i]);
            }

            // 목표 비율이 맞는지 확인
            const finalRetryOdd = retryResult.filter(n => n % 2 === 1).length;
            const finalRetryEven = retryResult.filter(n => n % 2 === 0).length;

            if (finalRetryOdd === targetOdd && finalRetryEven === targetEven && retryResult.length === totalNeeded) {
                return retryResult.slice(0, totalNeeded);
            }
        }
    }

    return result.slice(0, totalNeeded);
}

/**
 * 6개 번호 선택 (기본)
 */
function pickSix() {
    const pool = shuffledPool(false, false);
    const poolSet = new Set(pool);
    let filteredPool = pool;

    if (isStatFilter(AppState.activeFilters.statFilter)) {
        const highCountNumbers = new Set(getFilteredNumbersByCount(true));
        filteredPool = pool.filter(n => highCountNumbers.has(n));
    }

    // 핫콜 필터: 수동선택 또는 자동선택 모드에서만 적용
    if (canApplyHotColdFilter(AppState.activeFilters.statFilter)) {
        filteredPool = applyHotColdFilter(filteredPool, AppState.activeFilters.hotCold);
    }

    const filteredPoolSet = new Set(filteredPool);
    const preferred = getPreferredNumbers().filter(n => poolSet.has(n) && filteredPoolSet.has(n));

    // 홀짝 비율에 맞춰 번호 선택
    const result = selectNumbersWithOddEvenRatio(filteredPool, preferred, LOTTO_CONSTANTS.SET_SIZE);

    return result.slice(0, LOTTO_CONSTANTS.SET_SIZE);
}

/**
 * 연속된 번호 쌍 찾기
 */
function findSequentialPairs(numbers) {
    const sorted = sortNumbers(numbers);
    const pairs = [];
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            pairs.push([sorted[i - 1], sorted[i]]);
        }
    }
    return pairs;
}

/**
 * UI 헬퍼 함수 모듈
 * UI 렌더링에 사용되는 유틸리티 함수들
 */

/**
 * 번호에 따른 공 클래스 반환 (동행복권 색상)
 */
function getBallClass(num) {
    if (num <= 10) return "ball-yellow";    // 1-10: 노란색 (#FBC400)
    if (num <= 20) return "ball-blue";      // 11-20: 파란색 (#69C8F2)
    if (num <= 30) return "ball-red";       // 21-30: 빨간색 (#FF7272)
    if (num <= 40) return "ball-gray";      // 31-40: 회색 (#AAAAAA)
    return "ball-green";                    // 41-45: 녹색 (#B0D840)
}

/**
 * RGB를 보색으로 변환
 */
function getComplementaryColor(hex) {
    // # 제거
    hex = hex.replace('#', '');

    // RGB 추출
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // 보색 계산 (255에서 각 값을 빼기)
    const compR = 255 - r;
    const compG = 255 - g;
    const compB = 255 - b;

    // 밝기 계산 (상대적 밝기)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // 밝은 배경이면 어두운 글자, 어두운 배경이면 밝은 글자
    if (brightness > 128) {
        return '#000000'; // 어두운 글자
    } else {
        return '#FFFFFF'; // 밝은 글자
    }
}

/**
 * 통계용 공 생성
 */
function createStatBall(num, size = 24, fontSize = "0.8rem", isNonMatching = false) {
    const ball = document.createElement("div");
    if (isNonMatching) {
        ball.className = "stat-ball";
        ball.style.backgroundColor = "#000000";
        ball.style.color = "#ffffff";
        ball.style.border = "2px solid #000000";
    } else {
        ball.className = `stat-ball ${getBallClass(num)}`;

        // 배경색에 따른 보색 계산 및 적용
        const bgColors = {
            'ball-yellow': '#FFD700',
            'ball-blue': '#0066FF',
            'ball-red': '#FF0000',
            'ball-gray': '#808080',
            'ball-green': '#00CC00'
        };

        const ballClass = getBallClass(num);
        const bgColor = bgColors[ballClass] || '#808080';
        const textColor = getComplementaryColor(bgColor);

        // 인라인 스타일로 보색 적용
        ball.style.color = textColor;
    }
    ball.style.width = `${size}px`;
    ball.style.height = `${size}px`;
    ball.style.fontSize = fontSize;
    ball.textContent = num;
    return ball;
}

/**
 * 플러스 기호 생성
 */
function createPlusSign(style = "color: #ffd54f; font-weight: bold; margin: 0 2px;") {
    const plus = document.createElement("span");
    plus.style.cssText = style;
    plus.textContent = "+";
    return plus;
}

/**
 * 애플리케이션 초기화 함수
 */
async function initializeApp() {
    const statsListEl = document.getElementById('statsList');
    const viewNumbersListEl = document.getElementById('viewNumbersList');
    const setLoadError = (msg) => {
        if (statsListEl) statsListEl.innerHTML = '<p class="load-error">' + msg + '</p>';
        if (viewNumbersListEl) viewNumbersListEl.innerHTML = '<p class="load-error">' + msg + '</p>';
    };

    try {
        if (typeof XLSX === 'undefined') {
            setLoadError('XLSX 라이브러리를 불러올 수 없습니다. 인터넷 연결과 스크립트를 확인해 주세요.');
            alert('SheetJS(XLSX) 라이브러리가 로드되지 않았습니다. 페이지를 새로고침하거나 인터넷 연결을 확인해 주세요.');
            return;
        }

        // 함수 참조 가져오기 (window 객체 또는 전역 스코프)
        const loadFunc = (typeof window !== 'undefined' && window.loadLotto645Data)
            ? window.loadLotto645Data
            : (typeof loadLotto645Data !== 'undefined' ? loadLotto645Data : null);

        if (!loadFunc || typeof loadFunc !== 'function') {
            throw new Error('loadLotto645Data 함수에 접근할 수 없습니다.');
        }

        // 회차별 당첨번호는 항상 Lotto645.xlsx만 사용. localStorage에 캐시된 과거 데이터가 있으면
        // Excel(예: 최종 1200회)과 달리 1201~1209회가 보일 수 있으므로, 로드 시 Lotto645 관련
        // localStorage 키를 제거해 두어 항상 서버의 Lotto645.xlsx만 읽어오도록 함.
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && /lotto645|Lotto645|allLotto645|회차별당첨/i.test(key)) keysToRemove.push(key);
            }
            keysToRemove.forEach(k => { localStorage.removeItem(k); });
            if (keysToRemove.length > 0) { /* Lotto645 관련 localStorage 키 제거 */ }
        } catch (e) { /* localStorage 비활성화 등 무시 */ }

        // XLSX 파일에서 데이터 로드 (서버 경로: /.source/Lotto645.xlsx)
        const lotto645Data = await loadFunc();
        // 서버의 Lotto645.xlsx 실제 행 수와 비교해 캐시 여부 검증
        try {
            const metaRes = await fetch(getApiBaseUrl() + '/api/lotto645-meta', { cache: 'no-store' });
            const meta = await metaRes.json().catch(() => ({}));
            if (meta.dataRows != null && meta.dataRows !== lotto645Data.length) {
                alert('회차별 당첨번호가 서버 데이터와 다릅니다.\n서버: ' + meta.dataRows + '회차, 수신: ' + lotto645Data.length + '건\n캐시를 비우고 강력 새로고침(Ctrl+Shift+R) 해 주세요.');
            }
        } catch (e) { /* 메타 조회 실패 시 무시 */ }
        if (lotto645Data.length === 0) {
            const errMsg = 'XLSX 파일을 불러올 수 없습니다. 서버를 실행한 뒤 접속해 주세요. (start-server.bat 또는 python server.py)';
            setLoadError(errMsg);
            alert(errMsg);
            return;
        }

        // 통계 초기화 (AppState.startRound, endRound 설정 포함)
        initializeStats(lotto645Data);

        // [Fix] 초기 화면 렌더링 (로딩 메시지 제거)
        if (typeof renderStats === 'function') renderStats(lotto645Data);
        if (typeof updateRoundRangeDisplay === 'function') updateRoundRangeDisplay();
        // 동행복권 최신 추첨정보
        try {
            const latestRes = await fetch(getApiBaseUrl() + '/api/lotto-latest', { cache: 'no-store' });
            const latestData = await latestRes.json().catch(() => ({}));
            if (latestData.returnValue === 'success' && latestData.drwNo != null) {
                AppState.latestRoundApi = latestData.drwNo;
                AppState.latestRoundDateApi = latestData.drwNoDate || '';
            }
        } catch (e) { /* 무시 */ }
        // Lotto645.xlsx 1회~동행복권 최신회차 검증, 누락 회차 있으면 서버에서 Excel 보완 (sync-lotto645)
        if (lotto645Data.length > 0 && AppState.latestRoundApi != null && AppState.endRound != null && AppState.latestRoundApi > AppState.endRound) {
            const missingCount = AppState.latestRoundApi - AppState.endRound;
            const base = getApiBaseUrl();
            try {
                // 누락이 소수(예: 9회)일 때만 fetch-missing-rounds 호출. 대량(예: 1200회)이면 URL/부하 방지를 위해 생략하고 sync만 호출
                if (missingCount > 0 && missingCount <= 100) {
                    const missingRounds = [];
                    for (let r = AppState.endRound + 1; r <= AppState.latestRoundApi; r++) missingRounds.push(r);
                    await fetch(base + '/api/fetch-missing-rounds?rounds=' + missingRounds.join(','), { cache: 'no-store' });
                }
                const syncRes = await fetch(base + '/api/sync-lotto645', { method: 'POST', cache: 'no-store' });
                const syncData = await syncRes.json().catch(() => ({}));
                if (syncData.returnValue === 'success' && syncData.added > 0) {
                    const newData = await loadFunc();
                    if (newData && newData.length > 0) {
                        initializeStats(newData);
                        const endInput = document.getElementById('endDate');
                        if (endInput && AppState.latestRoundDateApi) {
                            const apiDateObj = parseDate(String(AppState.latestRoundDateApi).trim());
                            if (apiDateObj && apiDateObj instanceof Date && !isNaN(apiDateObj.getTime())) {
                                endInput.value = formatDateYYMMDD(apiDateObj);
                            }
                        }
                        if (typeof updateRoundRangeDisplay === 'function') updateRoundRangeDisplay();
                        if (typeof renderStats === 'function') renderStats(newData);
                    }
                } else if (syncData.returnValue === 'fail' && syncData.error) {
                    alert('회차 추가 실패: ' + syncData.error + '\nExcel에서 Lotto645.xlsx를 닫고 새로고침 후 다시 시도하세요.');
                }
            } catch (syncErr) { /* 누락 회차 조회/동기화 실패 시 무시 */ }
        }

        // 날짜 입력 필드 초기값: 시작 1회(또는 Excel 첫 회차), 종료 동행복권 최신 당첨회차
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        const selectBtn = document.getElementById('selectDateRangeBtn');

        if (startDateInput && endDateInput && lotto645Data.length > 0) {
            // 시작일: 1회차 날짜 (Excel에 1회 있으면 사용, 없으면 가장 오래된 회차)
            const firstRound = lotto645Data[lotto645Data.length - 1];
            if (firstRound && firstRound.date) {
                const firstDate = parseDate(firstRound.date);
                startDateInput.value = formatDateYYMMDD(firstDate);
            }
            // 종료일: 동행복권 최신 당첨회차 날짜 (API 있으면 사용, 없으면 Excel 최신)
            if (AppState.latestRoundDateApi) {
                const apiDateObj = parseDate(String(AppState.latestRoundDateApi).trim());
                if (apiDateObj && apiDateObj instanceof Date && !isNaN(apiDateObj.getTime())) {
                    endDateInput.value = formatDateYYMMDD(apiDateObj);
                } else {
                    endDateInput.value = String(AppState.latestRoundDateApi).slice(0, 10).replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => `${y}/${m}/${d}`);
                }
            } else {
                const lastRound = lotto645Data[0];
                if (lastRound && lastRound.date) {
                    const lastDate = parseDate(lastRound.date);
                    endDateInput.value = formatDateYYMMDD(lastDate);
                } else {
                    const today = new Date();
                    endDateInput.value = formatDateYYMMDD(today);
                }
            }

            // 날짜 입력 필드 포맷 자동 정리 (blur 시)
            startDateInput.addEventListener('blur', function () {
                const value = this.value.trim();
                if (!value) {
                    updateRoundDisplay();
                    return;
                }

                // 4자리 이내 숫자는 회차로 처리
                if (isRoundInput(value)) {
                    const roundNum = parseInt(value);
                    const dateStr = convertRoundToDate(value);
                    if (dateStr) {
                        this.value = dateStr;
                        updateRoundDisplay();
                        updateRoundRangeDisplay();
                        // 종료일과 비교 검증
                        if (!validateDateRange()) {
                            this.value = '';
                            updateRoundDisplay();
                            return;
                        }
                    } else {
                        // 실제 회차 번호로 에러 메시지 표시 (앞의 0 제거된 숫자)
                        alert(`회차 ${roundNum}에 해당하는 데이터가 없습니다.`);
                        this.value = '';
                        updateRoundDisplay();
                    }
                    return;
                }

                // 6자리 숫자는 날짜로 처리 → 해당 날짜를 포함하는 회차의 날짜로 변환
                if (/^\d{6}$/.test(value)) {
                    const isStartDate = this.id === 'startDate';
                    const roundDate = convertDateToRoundDate(value, isStartDate);
                    if (roundDate) {
                        this.value = roundDate;
                        updateRoundDisplay();
                        updateRoundRangeDisplay();
                        // 종료일과 비교 검증
                        if (!validateDateRange()) {
                            this.value = '';
                            updateRoundDisplay();
                            return;
                        }
                    } else {
                        alert(`${isStartDate ? '시작일' : '종료일'}에 해당하는 회차를 찾을 수 없습니다.`);
                        this.value = '';
                        updateRoundDisplay();
                    }
                    return;
                }

                // yy/mm/dd 형식인 경우
                const date = parseDate(value);
                if (date && date !== '000000' && date !== '999999') {
                    this.value = formatDateYYMMDD(date);
                    updateRoundDisplay();
                    updateRoundRangeDisplay();
                    // 종료일과 비교 검증
                    if (!validateDateRange()) {
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                } else {
                    alert('날짜 또는 회차 형식이 올바르지 않습니다.');
                    this.value = '';
                    updateRoundDisplay();
                }
            });

            endDateInput.addEventListener('blur', function () {
                const value = this.value.trim();
                if (!value) {
                    updateRoundDisplay();
                    return;
                }

                // 4자리 이내 숫자는 회차로 처리
                if (isRoundInput(value)) {
                    const roundNum = parseInt(value);
                    const dateStr = convertRoundToDate(value);
                    if (dateStr) {
                        this.value = dateStr;
                        updateRoundDisplay();
                        updateRoundRangeDisplay();
                        // 시작일과 비교 검증
                        if (!validateDateRange()) {
                            this.value = '';
                            updateRoundDisplay();
                            return;
                        }
                    } else {
                        // 실제 회차 번호로 에러 메시지 표시 (앞의 0 제거된 숫자)
                        alert(`회차 ${roundNum}에 해당하는 데이터가 없습니다.`);
                        this.value = '';
                        updateRoundDisplay();
                    }
                    return;
                }

                // 6자리 숫자는 날짜로 처리 → 해당 날짜를 포함하는 회차의 날짜로 변환
                if (/^\d{6}$/.test(value)) {
                    const isStartDate = this.id === 'startDate';
                    const roundDate = convertDateToRoundDate(value, isStartDate);
                    if (roundDate) {
                        this.value = roundDate;
                        updateRoundDisplay();
                        updateRoundRangeDisplay();
                        // 시작일과 비교 검증
                        if (!validateDateRange()) {
                            this.value = '';
                            updateRoundDisplay();
                            return;
                        }
                    } else {
                        alert(`${isStartDate ? '시작일' : '종료일'}에 해당하는 회차를 찾을 수 없습니다.`);
                        this.value = '';
                        updateRoundDisplay();
                    }
                    return;
                }

                // yy/mm/dd 형식인 경우
                const date = parseDate(value);
                if (date && date !== '000000' && date !== '999999') {
                    this.value = formatDateYYMMDD(date);
                    updateRoundDisplay();
                    updateRoundRangeDisplay();
                    // 시작일과 비교 검증
                    if (!validateDateRange()) {
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                } else {
                    alert('날짜 또는 회차 형식이 올바르지 않습니다.');
                    this.value = '';
                    updateRoundDisplay();
                }
            });

            // 입력 중에도 실시간으로 변환 (입력 완료 시)
            startDateInput.addEventListener('input', function () {
                const value = this.value.trim();

                // 4자리 이내 숫자 입력 완료 시 회차로 변환
                if (isRoundInput(value)) {
                    const dateStr = convertRoundToDate(value);
                    if (dateStr) {
                        setTimeout(() => {
                            if (this.value.trim() === value) {
                                this.value = dateStr;
                                updateRoundRangeDisplay();
                            }
                        }, 500); // 입력 완료 후 0.5초 뒤 변환
                    }
                    return;
                }

                // 6자리 숫자 입력 완료 시 날짜로 변환 → 해당 날짜를 포함하는 회차의 날짜로 변환
                if (/^\d{6}$/.test(value)) {
                    const isStartDate = this.id === 'startDate';
                    const roundDate = convertDateToRoundDate(value, isStartDate);
                    if (roundDate) {
                        setTimeout(() => {
                            if (this.value.trim() === value) {
                                this.value = roundDate;
                                updateRoundRangeDisplay();
                            }
                        }, 500);
                    }
                    return;
                }

                updateRoundDisplay();
                updateRoundRangeDisplay();
            });

            endDateInput.addEventListener('input', function () {
                const value = this.value.trim();

                // 4자리 이내 숫자 입력 완료 시 회차로 변환
                if (isRoundInput(value)) {
                    const dateStr = convertRoundToDate(value);
                    if (dateStr) {
                        setTimeout(() => {
                            if (this.value.trim() === value) {
                                this.value = dateStr;
                                updateRoundDisplay();
                                updateRoundRangeDisplay();
                            }
                        }, 500);
                    }
                    return;
                }

                // 6자리 숫자 입력 완료 시 날짜로 변환 → 해당 날짜를 포함하는 회차의 날짜로 변환
                if (/^\d{6}$/.test(value)) {
                    const isStartDate = this.id === 'startDate';
                    const roundDate = convertDateToRoundDate(value, isStartDate);
                    if (roundDate) {
                        setTimeout(() => {
                            if (this.value.trim() === value) {
                                this.value = roundDate;
                                updateRoundDisplay();
                                updateRoundRangeDisplay();
                            }
                        }, 500);
                    }
                    return;
                }

                updateRoundDisplay();
                updateRoundRangeDisplay();
            });


            // 초기 회차 범위 표시
            updateRoundDisplay();
            updateRoundRangeDisplay();

            // 선택 버튼 클릭 시 날짜 필터링 적용
            // 선택 버튼 클릭 시 날짜 필터링 적용
            const selectBtnTag = document.getElementById('selectDateRangeBtn');
            if (selectBtnTag) {
                // console.log('[App] Attaching click event to selectDateRangeBtn');
                selectBtnTag.addEventListener('click', updateStatsByDateRange);
            } else {
                console.error('[App] selectDateRangeBtn not found!');
            }


        }

        // 기본값 설정 (1회차 ~ 가장 최근 회차)
        if (lotto645Data.length > 0) {
            const startRoundInput = document.getElementById('startRound');
            const endRoundInput = document.getElementById('endRound');

            const maxRound = lotto645Data[0].round; // 최신 회차
            const firstRound = 1; // 1회차부터 시작 (최근 30회 삭제)

            if (startRoundInput) startRoundInput.value = firstRound;
            if (endRoundInput) endRoundInput.value = maxRound;

            // 날짜 입력칸 동기화
            updateRoundDisplay();

            // 전체 범위로 필터링하여 렌더링
            setTimeout(() => {
                updateStatsByDateRange();
            }, 100);
        } else {
            renderStats(lotto645Data);
        }

        // 기본 정렬을 번호순으로 설정
        AppState.currentSort = 'number-asc';
        updateSortButtons('number');

        // 게임박스 초기화
        initializeGameBox();
        // 구간선택 기본값 반영 및 3자리만 입력·가운데 정렬
        const sumStartEl = document.getElementById('sumRangeStart');
        const sumEndEl = document.getElementById('sumRangeEnd');
        if (sumStartEl && AppState.sumRangeStart != null) sumStartEl.value = AppState.sumRangeStart;
        if (sumEndEl && AppState.sumRangeEnd != null) sumEndEl.value = AppState.sumRangeEnd;
        [sumStartEl, sumEndEl].forEach(el => {
            if (!el) return;
            el.style.textAlign = 'center';
            el.addEventListener('input', function () {
                const v = String(this.value).replace(/\D/g, '').slice(0, 3);
                this.value = v === '' ? '' : (parseInt(v, 10) > 255 ? 255 : v);
            });
        });
        // 회차별 당첨번호 합계필터 (999 또는 000=전체, 21~255=동일합계 회차)
        const sumFilterRoundEl = document.getElementById('sumFilterRound');
        if (sumFilterRoundEl) {
            sumFilterRoundEl.style.textAlign = 'center';
            sumFilterRoundEl.addEventListener('input', function () {
                const v = String(this.value).replace(/\D/g, '').slice(0, 3);
                this.value = v === '' ? '999' : v;
            });
            sumFilterRoundEl.addEventListener('change', () => {
                if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                    renderViewNumbersList(AppState.currentViewNumbersBaseData);
                }
            });
        }
        // 저장 회차 기본값 (최종회차+1)
        const saveRoundEl = document.getElementById('saveRound');
        if (saveRoundEl && AppState.endRound != null) saveRoundEl.value = AppState.endRound + 1;

        // 정렬 버튼 설정
        setupSortButtons();

        // 초기 정렬 상태 반영
        renderStatsList();
        renderNumberGrid();

        // 필터 이벤트 리스너 설정
        setupFilterListeners();

        // 저장 버튼 이벤트 리스너 설정
        setupSaveButton();

        // 결과박스 초기 로드
        loadAndDisplayResults();

        // 애플리케이션 초기화 완료 이벤트 발생 (다른 스크립트에서 사용 가능)
        if (typeof window.onAppInitialized === 'function') {
            window.onAppInitialized();
        }

        // 서버 시작 시간 표시
        fetch('/api/health')
            .then(res => res.json())
            .then(data => {
                const titleEl = document.querySelector('h1');
                if (titleEl) {
                    if (data.startTime) {
                        const timeSpan = document.createElement('span');
                        timeSpan.style.fontSize = '0.65rem';
                        timeSpan.style.fontWeight = 'bold';
                        timeSpan.style.marginLeft = '12px';
                        timeSpan.style.color = '#ffffff';
                        timeSpan.textContent = ` (로딩시간: ${data.startTime})`;
                        titleEl.appendChild(timeSpan);
                    }

                    // 타이틀 클릭 시 초기화 및 서버 종료
                    titleEl.style.cursor = 'pointer';
                    titleEl.title = '클릭 시 모든 데이터 초기화 및 서버 종료';
                    titleEl.addEventListener('click', () => {
                        if (confirm('모든 데이터를 초기화하고 서버를 종료하시겠습니까?')) {
                            // 로컬 스토리지 초기화
                            localStorage.clear();
                            // 서버 종료 요청
                            fetch('/api/shutdown', { method: 'POST' })
                                .then(() => {
                                    alert('서버가 종료되었습니다. 브라우저 창을 닫아주세요.');
                                    window.close(); // 동작하지 않을 수 있음 (브라우저 정책)
                                    document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;"><h1>서버가 종료되었습니다.</h1><p>창을 닫아주세요.</p></div>';
                                })
                                .catch(() => {
                                    alert('서버 종료 요청 중 오류가 발생했습니다.');
                                });
                        }
                    });


                }
            })
            .catch(err => { /* Server time fetch failed */ });
    } catch (error) {
        alert('애플리케이션 초기화 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 선택공 그리드 렌더링 함수 (정렬에 따라)
 */
function renderNumberGrid() {
    const centerPanel = document.querySelector('.center-panel');
    if (!centerPanel || !AppState || !AppState.winStats || AppState.winStats.length === 0) {
        return;
    }

    // 현재 정렬 방식에 따라 데이터 정렬
    let sortedStats = [...AppState.winStats];

    // 당첨통계의 정렬 방식에 따라 선택공 그리드 정렬
    if (AppState.currentSort === 'win-desc') {
        // 당첨순▼: 내림차순
        sortedStats.sort((a, b) => b.count - a.count);
    } else if (AppState.currentSort === 'win-asc') {
        // 당첨순▲: 오름차순
        sortedStats.sort((a, b) => a.count - b.count);
    } else if (AppState.currentSort === 'appearance-desc') {
        // 출현순▼: 보너스 포함, 내림차순
        sortedStats = Array.from(AppState.appearanceStatsMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => b.count - a.count);
    } else if (AppState.currentSort === 'appearance-asc') {
        // 출현순▲: 보너스 포함, 오름차순
        sortedStats = Array.from(AppState.appearanceStatsMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => a.count - b.count);
    } else if (AppState.currentSort === 'number-desc') {
        // 번호순▼: 내림차순
        sortedStats.sort((a, b) => b.number - a.number);
    } else if (AppState.currentSort === 'number-asc') {
        // 번호순▲: 오름차순
        sortedStats.sort((a, b) => a.number - b.number);
    } else if (AppState.currentSort === 'seq') {
        sortedStats.sort((a, b) => a.number - b.number);
    } else {
        // 기본: 번호순 오름차순
        sortedStats.sort((a, b) => a.number - b.number);
    }

    // 전체 섹션을 감싸는 박스 컨테이너 찾기 또는 생성
    let sectionBox = document.getElementById('numberGridSection');
    if (!sectionBox) {
        sectionBox = document.createElement('div');
        sectionBox.id = 'numberGridSection';
        sectionBox.className = 'stats-box';
        sectionBox.style.marginBottom = '6px';
        centerPanel.insertBefore(sectionBox, centerPanel.firstChild);
    }

    // 헤더 컨테이너 찾기 또는 생성
    let headerContainer = document.getElementById('numberGridHeaderContainer');
    if (!headerContainer) {
        headerContainer = document.createElement('div');
        headerContainer.id = 'numberGridHeaderContainer';
        headerContainer.style.display = 'flex';
        headerContainer.style.alignItems = 'center';
        headerContainer.style.justifyContent = 'space-between';
        headerContainer.style.marginBottom = '6px';
        headerContainer.style.gap = '16px';
        sectionBox.appendChild(headerContainer);
    }

    // 선택공 헤더 생성 (title 부분 생략 - 기존 로직 유지)
    let title = headerContainer.querySelector('h2');
    if (!title) {
        title = document.createElement('h2');
        title.textContent = '선택공';
        title.style.textAlign = 'left';
        title.style.margin = '0';
        title.style.marginBottom = 'clamp(8px, 1.5vw, 12px)';
        title.style.padding = '0';
        title.style.fontSize = 'clamp(1.1rem, 2.5vw, 1.3rem)';
        title.style.color = '#000000';
        title.style.fontWeight = '600';
        title.style.lineHeight = '1.2';
        title.style.flex = '0 0 auto';
        title.style.minHeight = 'auto';
        headerContainer.appendChild(title);
    } else {
        title.style.margin = '0';
        title.style.marginBottom = 'clamp(8px, 1.5vw, 12px)';
        title.style.padding = '0';
        title.style.fontSize = 'clamp(1.1rem, 2.5vw, 1.3rem)';
        title.style.lineHeight = '1.2';
        title.style.minHeight = 'auto';
    }

    // 필터 박스를 헤더 컨테이너로 이동
    const filterBox = document.getElementById('filterBox');
    if (filterBox && filterBox.parentElement !== headerContainer) {
        filterBox.style.display = 'flex';
        filterBox.style.flex = '0 0 auto';
        filterBox.style.marginBottom = '0';
        filterBox.style.width = '460px';
        filterBox.style.minWidth = '460px';
        filterBox.style.maxWidth = '460px';
        filterBox.style.padding = '0 clamp(4px, 0.8vw, 6px)';
        filterBox.style.marginLeft = 'auto';
        filterBox.style.minHeight = '0';
        headerContainer.appendChild(filterBox);
    }

    // 선택공 그리드 컨테이너 찾기 또는 생성
    let gridContainer = sectionBox.querySelector('.number-grid-container');
    if (!gridContainer) {
        gridContainer = document.createElement('div');
        gridContainer.className = 'number-grid-container';
        gridContainer.style.width = '100%';
        gridContainer.style.margin = '0 auto';
        sectionBox.appendChild(gridContainer);
    } else {
        gridContainer.innerHTML = '';
    }

    // 9x5 그리드로 고정 (9열 5행)
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = 'repeat(9, 1fr)';
    gridContainer.style.gap = 'clamp(3px, 0.8vw, 6px)';
    gridContainer.style.placeItems = 'center';
    gridContainer.style.justifyContent = 'center';

    // 당첨순 상위 6개 번호 찾기 (정렬된 순서 기준)
    const sortedByWin = [...sortedStats].sort((a, b) => b.count - a.count);
    const top6Numbers = new Set(sortedByWin.slice(0, 6).map(s => s.number));

    // 정렬된 순서대로 선택공 그리드에 배치
    // 모든 번호(1~45)가 포함되도록 보장
    const allNumbersSet = new Set(Array.from({ length: 45 }, (_, i) => i + 1));
    const sortedNumbers = sortedStats.map(s => s.number);

    // 정렬된 번호에 없는 번호들 추가 (통계가 0인 경우)
    allNumbersSet.forEach(num => {
        if (!sortedNumbers.includes(num)) {
            sortedNumbers.push(num);
        }
    });

    // 정렬된 순서대로 그리드에 배치
    sortedNumbers.forEach((number) => {
        // 해당 번호의 통계 정보 찾기
        const stat = sortedStats.find(s => s.number === number) || { number, count: 0 };

        const ball = createStatBall(stat.number, 24, '0.9rem');
        ball.style.cursor = 'pointer';
        ball.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease';

        // 당첨순 상위 6개는 검정색 테두리 (0.2px)
        if (top6Numbers.has(stat.number)) {
            ball.style.border = '0.2px solid #000000';
            ball.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.1)';
        }

        // 공 클릭 이벤트 추가
        ball.addEventListener('click', () => {
            if (currentSelectingGameIndex !== null && currentSelectingBallIndex !== null) {
                // 수동 모드 선택 중이면 번호 할당
                handleSelectBallClick(stat.number);
            } else {
                handleBallClick(stat.number);
            }
        });

        ball.addEventListener('mouseenter', () => {
            ball.style.transform = 'scale(1.1)';
            ball.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        });
        ball.addEventListener('mouseleave', () => {
            ball.style.transform = 'scale(1)';
            if (top6Numbers.has(stat.number)) {
                ball.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.1)';
            } else {
                ball.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
            }
        });
        gridContainer.appendChild(ball);
    });
}

/**
 * 한 라운드에서 연속 번호 쌍(2개) 추출
 */
function getConsecutivePairs(nums) {
    const pairs = [];
    for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i + 1] === nums[i] + 1) {
            pairs.push([nums[i], nums[i + 1]]);
        }
    }
    return pairs;
}

/**
 * 한 라운드에서 minLen개 이상 연속 run 추출
 */
function getConsecutiveRuns(nums, minLen) {
    const runs = [];
    let i = 0;
    while (i < nums.length) {
        const run = [nums[i]];
        while (i + 1 < nums.length && nums[i + 1] === nums[i] + 1) {
            i++;
            run.push(nums[i]);
        }
        if (run.length >= minLen) runs.push(run);
        i++;
    }
    return runs;
}

/**
 * 연속 번호 통계 계산
 * 연속 1회: 2개 연속 쌍 (1,2), (5,6) 등
 * 연속 2회: 3개 연속 run (1,2,3) + 2쌍 조합 (1,2 / 10,11)
 * 연속 3회: 3개 이상 연속 run (1,2,3), (1,2,3,4), (1,2,3,4,5) 등 + 3쌍 조합
 */
function computeConsecutiveStats(rounds, type) {
    if (!rounds || rounds.length === 0) return [];
    const map = new Map();
    rounds.forEach(r => {
        const nums = (r.numbers || []).map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (nums.length < 2) return;
        if (type === 1) {
            const pairs = getConsecutivePairs(nums);
            pairs.forEach(pair => {
                const key = pair.join(',');
                if (!map.has(key)) map.set(key, { numbers: pair, count: 0, rounds: [] });
                const entry = map.get(key);
                entry.count++;
                entry.rounds.push(r.round);
            });
        } else if (type === 2) {
            const runs3Plus = getConsecutiveRuns(nums, 3);
            runs3Plus.forEach(run => {
                for (let start = 0; start + 3 <= run.length; start++) {
                    const sub = run.slice(start, start + 3);
                    const key = sub.join(',');
                    if (!map.has(key)) map.set(key, { numbers: sub, count: 0, rounds: [] });
                    const entry = map.get(key);
                    entry.count++;
                    entry.rounds.push(r.round);
                }
            });
            const pairs = getConsecutivePairs(nums);
            if (pairs.length >= 2) {
                for (let i = 0; i < pairs.length; i++) {
                    for (let j = i + 1; j < pairs.length; j++) {
                        const p1 = pairs[i], p2 = pairs[j];
                        if (p1[1] >= p2[0] && p2[1] >= p1[0]) continue;
                        const key = p1[0] < p2[0] ? p1.join(',') + ' / ' + p2.join(',') : p2.join(',') + ' / ' + p1.join(',');
                        const numsArr = p1[0] < p2[0] ? [...p1, ...p2] : [...p2, ...p1];
                        if (!map.has(key)) map.set(key, { numbers: numsArr, display: p1.join(',') + ' / ' + p2.join(','), count: 0, rounds: [] });
                        const entry = map.get(key);
                        entry.count++;
                        entry.rounds.push(r.round);
                    }
                }
            }
            const runs3Only = runs3Plus.filter(run => run.length === 3);
            if (runs3Only.length >= 3) {
                for (let i = 0; i < runs3Only.length; i++) {
                    for (let j = i + 1; j < runs3Only.length; j++) {
                        for (let k = j + 1; k < runs3Only.length; k++) {
                            const arr = [runs3Only[i], runs3Only[j], runs3Only[k]].sort((a, b) => a[0] - b[0]);
                            const display = arr.map(r => r.join(',')).join(' / ');
                            const key = display;
                            const numsArr = arr.flat();
                            if (!map.has(key)) map.set(key, { numbers: numsArr, display: display, count: 0, rounds: [] });
                            const entry = map.get(key);
                            entry.count++;
                            entry.rounds.push(r.round);
                        }
                    }
                }
            }
        } else {
            const runs4Plus = getConsecutiveRuns(nums, 4);
            runs4Plus.forEach(run => {
                const key = run.join(',');
                if (!map.has(key)) map.set(key, { numbers: run, count: 0, rounds: [] });
                const entry = map.get(key);
                entry.count++;
                entry.rounds.push(r.round);
            });
            const pairs = getConsecutivePairs(nums);
            if (pairs.length >= 3) {
                for (let i = 0; i < pairs.length; i++) {
                    for (let j = i + 1; j < pairs.length; j++) {
                        for (let k = j + 1; k < pairs.length; k++) {
                            const sel = [pairs[i], pairs[j], pairs[k]];
                            const flat = sel.flat();
                            const sorted = [...new Set(flat)].sort((a, b) => a - b);
                            let isSingleRun = true;
                            for (let t = 1; t < sorted.length; t++) {
                                if (sorted[t] !== sorted[t - 1] + 1) { isSingleRun = false; break; }
                            }
                            if (isSingleRun && sorted.length >= 4) continue;
                            const runs = [];
                            const used = new Set();
                            sel.forEach(p => {
                                if (used.has(p[0] + ',' + p[1])) return;
                                const run = [p[0], p[1]];
                                used.add(p[0] + ',' + p[1]);
                                let changed = true;
                                while (changed) {
                                    changed = false;
                                    sel.forEach(q => {
                                        if (used.has(q[0] + ',' + q[1])) return;
                                        if (q[0] === run[run.length - 1]) {
                                            run.push(q[1]);
                                            used.add(q[0] + ',' + q[1]);
                                            changed = true;
                                        } else if (q[1] === run[0]) {
                                            run.unshift(q[0]);
                                            used.add(q[0] + ',' + q[1]);
                                            changed = true;
                                        }
                                    });
                                }
                                runs.push(run);
                            });
                            runs.sort((a, b) => a[0] - b[0]);
                            const display = runs.map(r => r.join(',')).join(' / ');
                            const numsArr = runs.flat();
                            const key = display;
                            if (!map.has(key)) map.set(key, { numbers: numsArr, display: display, count: 0, rounds: [] });
                            const entry = map.get(key);
                            entry.count++;
                            entry.rounds.push(r.round);
                        }
                    }
                }
            }
        }
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
}

/**
 * 연속 1회+2회+3회 통합
 */
function computeAllConsecutiveStats(rounds) {
    const s1 = computeConsecutiveStats(rounds, 1).map(e => ({ ...e, seqType: 1 }));
    const s2 = computeConsecutiveStats(rounds, 2).map(e => ({ ...e, seqType: 2 }));
    const s3 = computeConsecutiveStats(rounds, 3).map(e => ({ ...e, seqType: 3 }));
    return [...s1, ...s2, ...s3].sort((a, b) => b.count - a.count);
}

/**
 * 선택한 연속 행의 회차를 회차별 당첨번호에 출력 (당첨번호 내림차순)
 */
function renderViewNumbersFromSelectedRounds(roundNumbers) {
    const viewNumbersList = document.getElementById('viewNumbersList');
    const allData = AppState.allLotto645Data || [];
    if (!viewNumbersList || !allData.length) return;
    const roundSet = new Set(roundNumbers);
    const roundData = allData.filter(r => roundSet.has(r.round));
    const sorted = [...roundData].sort((a, b) => (b.round - a.round));
    viewNumbersList.innerHTML = '';
    if (sorted.length === 0) {
        viewNumbersList.innerHTML = '<p>선택한 회차가 없습니다.</p>';
        updateAverageSumDisplay([]);
        return;
    }
    sorted.forEach(round => viewNumbersList.appendChild(createRoundLineElement(round)));
    updateAverageSumDisplay(sorted);
}

/**
 * 통계 리스트 렌더링 함수
 */
function renderStatsList() {
    const statsList = document.getElementById('statsList');
    if (!statsList || !AppState) return;
    const seqType = AppState.seqFilterType;
    const isSeqMode = seqType != null && (seqType === 1 || seqType === 2 || seqType === 3);
    if (isSeqMode) {
        const rounds = AppState.currentStatsRounds || AppState.allLotto645Data || [];
        if (!rounds || rounds.length === 0) {
            statsList.innerHTML = '<p>데이터가 없습니다.</p>';
            return;
        }
        const seqStats = computeConsecutiveStats(rounds, seqType);
        if (seqStats.length === 0) {
            statsList.innerHTML = '<p>해당 조건의 연속 번호가 없습니다.</p>';
            return;
        }
        seqStats.sort((a, b) => {
            const na = a.numbers || [], nb = b.numbers || [];
            for (let i = 0; i < Math.min(na.length, nb.length); i++) {
                if (na[i] !== nb[i]) return na[i] - nb[i];
            }
            return na.length - nb.length;
        });
        const totalRounds = rounds.length;
        statsList.innerHTML = '';
        seqStats.forEach(entry => {
            const statLine = document.createElement('div');
            statLine.className = 'stat-line stat-line-seq';
            statLine.style.display = 'flex';
            statLine.style.alignItems = 'center';
            statLine.style.justifyContent = 'space-between';
            statLine.style.gap = '8px';
            statLine.style.padding = '0 8px';
            statLine.style.height = '28px';
            statLine.style.minHeight = '28px';
            statLine.style.boxSizing = 'border-box';
            statLine.style.cursor = 'pointer';
            statLine.title = '클릭 시 해당 회차를 우측 패널에 표시';
            const leftPart = document.createElement('div');
            leftPart.style.display = 'flex';
            leftPart.style.alignItems = 'center';
            leftPart.style.flex = '1';
            leftPart.style.minWidth = '0';
            leftPart.style.overflow = 'hidden';
            leftPart.style.gap = '4px';
            (entry.numbers || []).forEach(n => {
                const ball = createStatBall(n, 20, '0.8rem');
                leftPart.appendChild(ball);
            });
            const rightPart = document.createElement('div');
            rightPart.style.display = 'flex';
            rightPart.style.alignItems = 'center';
            rightPart.style.gap = '4px';
            rightPart.style.flexShrink = '0';
            const pct = totalRounds > 0 ? ((entry.count / totalRounds) * 100).toFixed(1) : '0.0';
            rightPart.innerHTML = '<span style="font-weight:700;">' + entry.count + '</span><span>회</span> <span style="color:#666;">(' + pct + '%)</span>';
            statLine.appendChild(leftPart);
            statLine.appendChild(rightPart);
            statLine.addEventListener('click', () => {
                AppState.selectedSeqRounds = entry.rounds;
                renderViewNumbersFromSelectedRounds(entry.rounds);
            });
            statsList.appendChild(statLine);
        });
        return;
    }
    if (!AppState.winStats || AppState.winStats.length === 0) return;

    // 현재 정렬 방식에 따라 데이터 정렬
    let sortedStats = [...AppState.winStats];
    let percentageMap = AppState.winPercentageCache || new Map();

    if (AppState.currentSort === 'win-desc') {
        // 당첨순▼: 보너스 제외, 내림차순
        sortedStats.sort((a, b) => b.count - a.count);
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'win-asc') {
        // 당첨순▲: 보너스 제외, 오름차순
        sortedStats.sort((a, b) => a.count - b.count);
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'appearance-desc') {
        // 출현순▼: 보너스 포함, 내림차순
        sortedStats = Array.from(AppState.appearanceStatsMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => b.count - a.count);
        percentageMap = AppState.appearancePercentageCache || new Map();
    } else if (AppState.currentSort === 'appearance-asc') {
        // 출현순▲: 보너스 포함, 오름차순
        sortedStats = Array.from(AppState.appearanceStatsMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => a.count - b.count);
        percentageMap = AppState.appearancePercentageCache || new Map();
    } else if (AppState.currentSort === 'number-desc') {
        // 번호순▼: 내림차순
        sortedStats.sort((a, b) => b.number - a.number);
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'number-asc') {
        // 번호순▲: 오름차순
        sortedStats.sort((a, b) => a.number - b.number);
        percentageMap = AppState.winPercentageCache || new Map();
    } else {
        // 기본: 번호순▼
        sortedStats.sort((a, b) => b.number - a.number);
        percentageMap = AppState.winPercentageCache || new Map();
    }

    // 리스트 렌더링
    statsList.innerHTML = '';
    sortedStats.forEach(stat => {
        const statLine = document.createElement('div');
        statLine.className = 'stat-line';
        statLine.style.display = 'flex';
        statLine.style.alignItems = 'center';
        statLine.style.gap = '8px';
        statLine.style.padding = '0 8px';
        statLine.style.height = '28px';
        statLine.style.minHeight = '28px';
        statLine.style.boxSizing = 'border-box';

        // 공
        const ball = createStatBall(stat.number, 24, '0.9rem');

        // 통계 정보 (우측 정렬)
        const statInfo = document.createElement('div');
        statInfo.style.marginLeft = 'auto';
        statInfo.style.display = 'flex';
        statInfo.style.alignItems = 'center';
        statInfo.style.gap = '8px';
        statInfo.style.fontSize = '0.9rem';

        const count = document.createElement('span');
        count.style.color = '#000000';
        count.textContent = `${stat.count}`;

        const countUnit = document.createElement('span');
        countUnit.style.color = '#000000';
        countUnit.style.fontWeight = '700';
        countUnit.textContent = '회';

        const percentage = percentageMap.get(stat.number) || 0;
        const percent = document.createElement('span');
        percent.style.color = '#666666';
        percent.textContent = `(${percentage.toFixed(1)}%)`;

        statInfo.appendChild(count);
        statInfo.appendChild(countUnit);
        statInfo.appendChild(percent);

        statLine.appendChild(ball);
        statLine.appendChild(statInfo);
        statsList.appendChild(statLine);
    });
}

/**
 * 게임박스 초기화
 */
function initializeGameBox() {
    const gameSetsContainer = document.getElementById('gameSetsContainer');
    if (!gameSetsContainer) return;

    gameSetsContainer.innerHTML = '';

    // 1~5게임 생성
    for (let i = 1; i <= 5; i++) {
        const gameSet = document.createElement('div');
        gameSet.id = `gameSet${i}`;
        gameSet.style.display = 'flex';
        gameSet.style.alignItems = 'center';
        gameSet.style.gap = '2px';
        gameSet.style.marginLeft = '12px';
        gameSet.style.padding = '10px 0';
        if (i < 5) {
            gameSet.style.borderBottom = '1px solid #e0e0e0';
        }
        gameSet.style.minHeight = '32px';
        gameSet.style.borderRadius = '0';
        gameSet.style.backgroundColor = 'transparent';

        // 게임 번호
        const gameNumber = document.createElement('span');
        gameNumber.textContent = `${i}게임`;
        gameNumber.style.fontSize = '0.85rem';
        gameNumber.style.fontWeight = '600';
        gameNumber.style.minWidth = '50px';
        gameNumber.style.color = '#000000';
        gameNumber.style.flexShrink = '0';

        // 자동/반자동/수동 토글 버튼 (너비 80px)
        const modeBtn = document.createElement('button');
        modeBtn.id = `modeBtn${i}`;
        modeBtn.className = 'filter-btn';
        modeBtn.textContent = '수동';
        modeBtn.style.width = '80px';
        modeBtn.dataset.gameIndex = i;
        modeBtn.dataset.mode = 'manual';
        modeBtn.style.flexShrink = '0';

        modeBtn.addEventListener('click', function () {
            const currentMode = this.dataset.mode;
            let newMode, newText;
            if (currentMode === 'manual') {
                newMode = 'auto';
                newText = '자동';
            } else if (currentMode === 'auto') {
                newMode = 'semi-auto';
                newText = '반자동';
            } else {
                newMode = 'manual';
                newText = '수동';
            }
            this.dataset.mode = newMode;
            this.textContent = newText;

            var cb = document.getElementById(`gameCheckbox${i}`);
            if (newMode === 'manual') {
                if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
                AppState.setSelectedBalls[i - 1] = [];
                if (cb) cb.checked = false;
            } else if (newMode === 'auto') {
                if (cb) cb.checked = true;
            } else if (newMode === 'semi-auto') {
                if (cb) cb.checked = false;
            }
            updateGameSet(i, newMode, true);
        });

        // 게임공 컨테이너 (한 라인으로, 스크롤 없음)
        const ballsContainer = document.createElement('div');
        ballsContainer.id = `gameBalls${i}`;
        ballsContainer.style.display = 'flex';
        ballsContainer.style.gap = '20px';
        ballsContainer.style.flex = '1';
        ballsContainer.style.flexWrap = 'nowrap';
        ballsContainer.style.minHeight = '24px';
        ballsContainer.style.overflowX = 'hidden';
        ballsContainer.style.overflowY = 'hidden';

        // 체크박스 (6개 공 선택 시에만 활성화)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `gameCheckbox${i}`;
        checkbox.dataset.gameIndex = i;
        checkbox.disabled = true;
        checkbox.style.flexShrink = '0';
        checkbox.style.marginLeft = 'auto';
        checkbox.style.marginRight = '12px'; // 우측 테두리에서 조금 띄움
        checkbox.addEventListener('change', function () {
            const gameIndex = parseInt(this.dataset.gameIndex);
            const modeBtn = document.getElementById(`modeBtn${gameIndex}`);
            const currentMode = modeBtn ? modeBtn.dataset.mode : 'manual';

            if (this.checked) {
                let numbers = AppState.setSelectedBalls[gameIndex - 1] || [];
                let validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);

                if (currentMode === 'manual' || currentMode === 'auto') {
                    if (validNumbers.length !== 6) {
                        alert('6개의 번호를 모두 선택해주세요.');
                        this.checked = false;
                        return;
                    }
                } else if (currentMode === 'semi-auto') {
                    // 반자동은 게임공이 1개 이상 5개 이하일 경우 체크 시 나머지 자동 생성
                    if (validNumbers.length >= 1 && validNumbers.length <= 5) {
                        const fullNumbers = generateNumbersWithFilters(validNumbers, true);
                        const newNumbers = fullNumbers.filter(n => !validNumbers.includes(n));
                        const allNumbers = [...validNumbers, ...newNumbers].slice(0, 6).sort((a, b) => a - b);
                        AppState.setSelectedBalls[gameIndex - 1] = allNumbers;
                        updateGameSet(gameIndex, 'semi-auto');
                    } else if (validNumbers.length === 6) {
                        // 이미 6개면 그냥 체크만 됨
                    } else if (validNumbers.length === 0) {
                        alert('반자동 모드는 1개 이상의 번호를 선택해야 합니다.');
                        this.checked = false;
                        return;
                    }
                }
            } else {
                // 해제 시 어떠한 상태 초기화나 버튼 비활성화도 하지 않고 그대로 유지
            }

            updateSaveBoxState();
        });

        // 합계 표시 영역
        const sumDisplay = document.createElement('span');
        sumDisplay.id = `gameSum${i}`;
        sumDisplay.textContent = ' [ 0 ]';
        sumDisplay.style.fontSize = '0.85rem';
        sumDisplay.style.color = '#ff0000';
        sumDisplay.style.fontWeight = 'bold';
        sumDisplay.style.textAlign = 'left';
        sumDisplay.style.flexShrink = '0';
        sumDisplay.style.minWidth = '80px';

        gameSet.appendChild(gameNumber);
        gameSet.appendChild(modeBtn);
        gameSet.appendChild(sumDisplay);
        gameSet.appendChild(ballsContainer);
        gameSet.appendChild(checkbox);

        gameSetsContainer.appendChild(gameSet);
    }

    // 초기 게임 생성
    generateAllGames();
}

/**
 * 정렬 버튼 설정
 */
function setupSortButtons() {
    const sortNumberBtn = document.getElementById('sortNumber');
    const sortWinBtn = document.getElementById('sortWin');
    const sortAppearanceBtn = document.getElementById('sortAppearance');

    if (sortNumberBtn) {
        sortNumberBtn.addEventListener('click', () => {
            AppState.selectedSeqRounds = null;
            const seqFilterEl = document.getElementById('seqFilter');
            if (seqFilterEl) seqFilterEl.value = 'none';
            AppState.seqFilterType = null;
            if (AppState.currentSort === 'number-desc') {
                AppState.currentSort = 'number-asc';
                sortNumberBtn.textContent = '번호순▲';
            } else {
                AppState.currentSort = 'number-desc';
                sortNumberBtn.textContent = '번호순▼';
            }
            updateSortButtons('number');
            renderStatsList();
            renderNumberGrid();
            if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                renderViewNumbersList(AppState.currentViewNumbersBaseData);
            }
        });
    }

    if (sortWinBtn) {
        sortWinBtn.addEventListener('click', () => {
            AppState.selectedSeqRounds = null;
            const seqFilterEl = document.getElementById('seqFilter');
            if (seqFilterEl) seqFilterEl.value = 'none';
            AppState.seqFilterType = null;
            if (AppState.currentSort === 'win-desc') {
                AppState.currentSort = 'win-asc';
                sortWinBtn.textContent = '당첨순▲';
            } else {
                AppState.currentSort = 'win-desc';
                sortWinBtn.textContent = '당첨순▼';
            }
            updateSortButtons('win');
            renderStatsList();
            renderNumberGrid();
            if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                renderViewNumbersList(AppState.currentViewNumbersBaseData);
            }
        });
    }

    if (sortAppearanceBtn) {
        sortAppearanceBtn.addEventListener('click', () => {
            AppState.selectedSeqRounds = null;
            const seqFilterEl = document.getElementById('seqFilter');
            if (seqFilterEl) seqFilterEl.value = 'none';
            AppState.seqFilterType = null;
            if (AppState.currentSort === 'appearance-desc') {
                AppState.currentSort = 'appearance-asc';
                sortAppearanceBtn.textContent = '출현순▲';
            } else {
                AppState.currentSort = 'appearance-desc';
                sortAppearanceBtn.textContent = '출현순▼';
            }
            updateSortButtons('appearance');
            renderStatsList();
            renderNumberGrid();
            if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                renderViewNumbersList(AppState.currentViewNumbersBaseData);
            }
        });
    }
    const seqFilterEl = document.getElementById('seqFilter');
    if (seqFilterEl) {
        seqFilterEl.addEventListener('change', () => {
            const val = seqFilterEl.value;
            if (val === 'none') {
                AppState.seqFilterType = null;
                AppState.currentSort = 'number-asc';
                AppState.selectedSeqRounds = null;
                updateSortButtons('number');
                if (AppState.currentViewNumbersBaseData && typeof renderViewNumbersList === 'function') {
                    renderViewNumbersList(AppState.currentViewNumbersBaseData);
                }
            } else {
                AppState.seqFilterType = parseInt(val, 10);
                AppState.currentSort = 'seq';
                updateSortButtons('seq');
            }
            renderStatsList();
            renderNumberGrid();
        });
    }
}

/**
 * 정렬 버튼 활성화 상태 업데이트
 */
function updateSortButtons(activeType) {
    const sortNumberBtn = document.getElementById('sortNumber');
    const sortWinBtn = document.getElementById('sortWin');
    const sortAppearanceBtn = document.getElementById('sortAppearance');
    const seqFilterEl = document.getElementById('seqFilter');

    [sortNumberBtn, sortWinBtn, sortAppearanceBtn].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    if (seqFilterEl) seqFilterEl.classList.remove('active');

    if (activeType === 'number' && sortNumberBtn) {
        sortNumberBtn.classList.add('active');
    } else if (activeType === 'win' && sortWinBtn) {
        sortWinBtn.classList.add('active');
    } else if (activeType === 'appearance' && sortAppearanceBtn) {
        sortAppearanceBtn.classList.add('active');
    } else if (activeType === 'seq' && seqFilterEl) {
        seqFilterEl.classList.add('active');
    }
}

/**
 * 필터 리스너 설정
 */
function setupFilterListeners() {
    const oddEvenFilter = document.getElementById('oddEvenFilter');
    const sequenceFilter = document.getElementById('sequenceFilter');
    const hotColdFilter = document.getElementById('hotColdFilter');

    if (oddEvenFilter) {
        oddEvenFilter.addEventListener('change', () => {
            generateAllGames();
        });
    }

    if (sequenceFilter) {
        sequenceFilter.addEventListener('change', () => {
            generateAllGames();
        });
    }

    if (hotColdFilter) {
        hotColdFilter.addEventListener('change', () => {
            generateAllGames();
        });
    }
}

/**
 * 공 클릭 핸들러 (선택공 그리드) — 모드선택 제거로 그리드 단독 클릭은 미사용, 수동 시 게임공 클릭으로 처리
 */
function handleBallClick(number) {
    // 수동 모드에서는 게임공 클릭으로 번호 선택/교체 처리
}

/**
 * 현재 선택 중인 게임 인덱스와 공 인덱스
 */
let currentSelectingGameIndex = null;
let currentSelectingBallIndex = null;

/**
 * 수동 모드 게임공 클릭 핸들러
 */
function handleManualBallClick(gameIndex, ballIndex) {
    const modeBtn = document.getElementById('modeBtn' + gameIndex);
    if (!modeBtn || modeBtn.dataset.mode !== 'manual') return;

    // 이미 번호가 있으면 삭제
    if (!AppState.setSelectedBalls) {
        AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
    }
    if (!AppState.setSelectedBalls[gameIndex - 1]) {
        AppState.setSelectedBalls[gameIndex - 1] = [];
    }

    if (AppState.setSelectedBalls[gameIndex - 1][ballIndex]) {
        // 번호 삭제
        AppState.setSelectedBalls[gameIndex - 1][ballIndex] = undefined;
        // 배열 정리
        AppState.setSelectedBalls[gameIndex - 1] = AppState.setSelectedBalls[gameIndex - 1].filter(n => n);
        const modeBtn = document.getElementById(`modeBtn${gameIndex}`);
        const currentMode = modeBtn ? modeBtn.dataset.mode : 'manual';
        const numbers = AppState.setSelectedBalls[gameIndex - 1] || [];
        updateGameSet(gameIndex, currentMode);
        // 합계 업데이트 (updateGameSet 내부에서도 하지만, 여기서도 명시적으로)
        updateGameSum(gameIndex, numbers);

        // 체크박스 상태 업데이트
        const checkbox = document.getElementById(`gameCheckbox${gameIndex}`);
        if (checkbox) {
            const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
            if (validNumbers.length < 6) {
                checkbox.checked = false;
                checkbox.disabled = true;
            }
        }
        updateSaveBoxState();
        return;
    }

    // 선택 모드일 때 게임공 클릭 시 선택 대기 상태로 설정
    currentSelectingGameIndex = gameIndex;
    currentSelectingBallIndex = ballIndex;

    // 선택공 그리드의 공에 선택 가능 표시
    const gridBalls = document.querySelectorAll('.number-grid-container .stat-ball');
    gridBalls.forEach(ball => {
        ball.style.opacity = '1';
        ball.style.cursor = 'pointer';
        ball.style.transform = 'scale(1)';
    });

    // 선택 중인 게임공 하이라이트
    const selectingBall = document.querySelector(`#gameBalls${gameIndex} > div:nth-child(${ballIndex + 1})`);
    if (selectingBall) {
        selectingBall.style.border = '2px solid #0066ff';
        selectingBall.style.boxShadow = '0 0 8px rgba(0, 102, 255, 0.5)';
    }
}

/**
 * 선택공 그리드의 공 클릭 핸들러 (수동/반자동 모드용)
 */
function handleSelectBallClick(number) {
    if (currentSelectingGameIndex === null || currentSelectingBallIndex === null) {
        return;
    }

    // 같은 게임에 이미 선택된 번호인지 확인
    if (!AppState.setSelectedBalls) {
        AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
    }
    if (!AppState.setSelectedBalls[currentSelectingGameIndex - 1]) {
        AppState.setSelectedBalls[currentSelectingGameIndex - 1] = [];
    }

    const currentNumbers = AppState.setSelectedBalls[currentSelectingGameIndex - 1] || [];
    // 이미 선택된 번호면 다른 위치에 있는 경우에만 교체 불가 (중복 방지)
    if (currentNumbers.includes(number) && currentNumbers[currentSelectingBallIndex] !== number) {
        alert('이미 선택된 번호입니다.');
        return;
    }

    AppState.setSelectedBalls[currentSelectingGameIndex - 1][currentSelectingBallIndex] = number;

    // 모드 버튼 확인하여 모드 결정
    const modeBtn = document.getElementById(`modeBtn${currentSelectingGameIndex}`);
    const currentMode = modeBtn ? modeBtn.dataset.mode : 'manual';

    // 반자동 모드인 경우 선택공으로 교체
    if (currentMode === 'semi-auto') {
        const selectingBallElement = document.querySelector(`#gameBalls${currentSelectingGameIndex} > div[data-ball-index="${currentSelectingBallIndex}"]`);
        if (selectingBallElement) {
            // 선택공으로 교체
            const newBall = createStatBall(number, 24, '0.9rem');
            newBall.style.cursor = 'pointer';
            newBall.dataset.gameIndex = currentSelectingGameIndex;
            newBall.dataset.ballIndex = currentSelectingBallIndex;
            newBall.dataset.isSelected = 'true';

            newBall.addEventListener('click', () => {
                const cb = document.getElementById(`gameCheckbox${currentSelectingGameIndex}`);
                if (cb && cb.checked) return; // 체크된 상태에서는 교체 불가

                // 하이라이트 초기화 (다른 모든 게임공의 하이라이트 제거)
                const allGameBalls = document.querySelectorAll('[id^="gameBalls"] > div');
                allGameBalls.forEach(b => {
                    if (b.dataset.isSelected === 'true') {
                        const bNum = parseInt(b.textContent);
                        const bClass = getBallClass(bNum);
                        const bgColors = {
                            'ball-yellow': '#FBC400',
                            'ball-blue': '#69C8F2',
                            'ball-red': '#FF7272',
                            'ball-gray': '#AAAAAA',
                            'ball-green': '#B0D840'
                        };
                        b.style.backgroundColor = bgColors[bClass] || '#808080';
                        b.style.color = '#ffffff';
                        b.style.border = 'none';
                    } else {
                        // 빈 공 또는 수동 모드 공의 하이라이트 제거
                        b.style.border = '';
                        b.style.boxShadow = '';
                    }
                });

                // 반자동 모드: 게임공 클릭 시 배경색을 보색으로 변경
                const ballClass = getBallClass(number);
                const bgColors = {
                    'ball-yellow': '#FBC400',
                    'ball-blue': '#69C8F2',
                    'ball-red': '#FF7272',
                    'ball-gray': '#AAAAAA',
                    'ball-green': '#B0D840'
                };
                const bgColor = bgColors[ballClass] || '#808080';
                const compHex = getComplementaryColor(bgColor);

                newBall.style.backgroundColor = compHex;
                newBall.style.color = bgColor; // 글자색은 배경색으로 (보색 대비)
                newBall.style.border = `2px solid ${bgColor}`;

                // 선택 대기 상태로 설정
                currentSelectingGameIndex = parseInt(newBall.dataset.gameIndex);
                currentSelectingBallIndex = parseInt(newBall.dataset.ballIndex);
            });
            selectingBallElement.replaceWith(newBall);
        }
        // 반자동 모드 합계 업데이트
        const numbers = AppState.setSelectedBalls[currentSelectingGameIndex - 1] || [];
        updateGameSum(currentSelectingGameIndex, numbers);

        // 반자동 모드에서 6개 선택되면 체크박스 활성화
        const checkbox = document.getElementById(`gameCheckbox${currentSelectingGameIndex}`);
        if (checkbox) {
            const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
            checkbox.disabled = validNumbers.length !== 6;
        }

    } else { // manual mode
        // 수동 모드 설정 반영
        AppState.setSelectedBalls[currentSelectingGameIndex - 1] = AppState.setSelectedBalls[currentSelectingGameIndex - 1].sort((a, b) => a - b);
        updateGameSet(currentSelectingGameIndex, currentMode);

        let numbers = AppState.setSelectedBalls[currentSelectingGameIndex - 1] || [];
        updateGameSum(currentSelectingGameIndex, numbers);

        const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);

        // 수동 모드에서 6개 선택되면 체크박스 활성화 및 선택 종료
        const checkbox = document.getElementById(`gameCheckbox${currentSelectingGameIndex}`);
        if (checkbox) {
            checkbox.disabled = validNumbers.length !== 6;
        }

        // 6개가 안 찼으면 다음 빈 공으로 자동 이동
        if (validNumbers.length < 6) {
            let nextEmptyIndex = -1;
            // 이미 0~5번째 인덱스를 순회하며 빈 곳을 찾음 (배열의 length 확인 혹은 undefined 확인)
            for (let i = 0; i < 6; i++) {
                if (!AppState.setSelectedBalls[currentSelectingGameIndex - 1][i]) {
                    nextEmptyIndex = i;
                    break;
                }
            }

            if (nextEmptyIndex !== -1) {
                // 선택 상태 초기화 후 바로 이어갈 수 있게 재설정
                currentSelectingBallIndex = nextEmptyIndex;

                // 하이라이트 재설정
                const allGameBalls = document.querySelectorAll('[id^="gameBalls"] > div');
                allGameBalls.forEach(ball => {
                    ball.style.border = '';
                    ball.style.boxShadow = '';
                });

                // 선택공 그리드의 공에 선택 가능 표시
                const gridBalls = document.querySelectorAll('.number-grid-container .stat-ball');
                gridBalls.forEach(ball => {
                    ball.style.opacity = '1';
                    ball.style.cursor = 'pointer';
                    ball.style.transform = 'scale(1)';
                });

                // 선택 중인 게임공 하이라이트 (방금 업데이트 된 DOM)
                const selectingBall = document.querySelector(`#gameBalls${currentSelectingGameIndex} > div:nth-child(${nextEmptyIndex + 1})`);
                if (selectingBall) {
                    selectingBall.style.border = '2px solid #0066ff';
                    selectingBall.style.boxShadow = '0 0 8px rgba(0, 102, 255, 0.5)';
                }

                // 함수 종료 방지, 다음 선택 대기
                return;
            }
        }
    }

    // 완전히 선택 종료되었을 경우 상태 초기화
    currentSelectingGameIndex = null;
    currentSelectingBallIndex = null;

    // 하이라이트 제거
    const allGameBalls = document.querySelectorAll('[id^="gameBalls"] > div');
    allGameBalls.forEach(ball => {
        ball.style.border = '';
        ball.style.boxShadow = '';
    });
}

/**
 * 게임 생성 (필터 적용)
 */
function generateAllGames() {
    for (let i = 1; i <= 5; i++) {
        const modeBtn = document.getElementById(`modeBtn${i}`);
        if (modeBtn) {
            const mode = modeBtn.dataset.mode || 'manual';
            generateGame(i, mode);
        }
    }
}

/**
 * 개별 게임 생성
 */
function generateGame(gameIndex, mode, isModeChange = false) {
    const ballsContainer = document.getElementById(`gameBalls${gameIndex}`);
    if (!ballsContainer) return;

    ballsContainer.innerHTML = '';

    if (mode === 'auto') {
        const checkbox = document.getElementById(`gameCheckbox${gameIndex}`);
        let numbers;
        if (isModeChange) {
            numbers = generateNumbersWithFilters();
            if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
            AppState.setSelectedBalls[gameIndex - 1] = numbers;
        } else {
            numbers = (AppState.setSelectedBalls && AppState.setSelectedBalls[gameIndex - 1]) || [];
            if (numbers.length !== 6) {
                numbers = generateNumbersWithFilters();
                if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
                AppState.setSelectedBalls[gameIndex - 1] = numbers;
            }
        }

        // 게임공 표시
        numbers.forEach(num => {
            const ball = createStatBall(num, 24, '0.9rem');
            ballsContainer.appendChild(ball);
        });

        const modeBtnEl = document.getElementById('modeBtn' + gameIndex);
        if (checkbox) {
            checkbox.disabled = false;
        }

        // 게임공 비활성화 (클릭 불가)
        const gameBalls = ballsContainer.querySelectorAll('.stat-ball');
        gameBalls.forEach(ball => {
            ball.style.pointerEvents = 'none';
            ball.style.cursor = 'default';
        });

        // 합계 업데이트
        updateGameSum(gameIndex, numbers);
    } else if (mode === 'semi-auto') {
        if (!AppState.setSelectedBalls) {
            AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
        }
        let numbers = AppState.setSelectedBalls[gameIndex - 1] || [];
        const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);

        const checkbox = document.getElementById(`gameCheckbox${gameIndex}`);
        if (checkbox) {
            checkbox.disabled = validNumbers.length !== 6;
        }

        // 게임공 표시
        for (let i = 0; i < 6; i++) {
            if (numbers[i]) {
                const num = numbers[i];
                const ballElement = createStatBall(num, 24, '0.9rem');
                ballElement.style.cursor = 'pointer';
                ballElement.dataset.gameIndex = gameIndex;
                ballElement.dataset.ballIndex = i;
                ballElement.dataset.isSelected = 'true';

                ballElement.addEventListener('click', () => {
                    const cb = document.getElementById(`gameCheckbox${gameIndex}`);
                    if (cb && cb.checked) return; // 체크된 상태에서는 교체 불가

                    // 하이라이트 초기화 (다른 모든 게임공의 하이라이트 제거)
                    const allGameBalls = document.querySelectorAll('[id^="gameBalls"] > div');
                    allGameBalls.forEach(b => {
                        if (b.dataset.isSelected === 'true') {
                            const bNum = parseInt(b.textContent);
                            const bClass = getBallClass(bNum);
                            const bgColors = {
                                'ball-yellow': '#FBC400',
                                'ball-blue': '#69C8F2',
                                'ball-red': '#FF7272',
                                'ball-gray': '#AAAAAA',
                                'ball-green': '#B0D840'
                            };
                            b.style.backgroundColor = bgColors[bClass] || '#808080';
                            b.style.color = '#ffffff';
                            b.style.border = 'none';
                        } else {
                            // 빈 공 또는 수동 모드 공의 하이라이트 제거
                            b.style.border = '';
                            b.style.boxShadow = '';
                        }
                    });

                    // 반자동 모드: 게임공 클릭 시 배경색을 보색으로 변경
                    const ballClass = getBallClass(num);
                    const bgColors = {
                        'ball-yellow': '#FBC400',
                        'ball-blue': '#69C8F2',
                        'ball-red': '#FF7272',
                        'ball-gray': '#AAAAAA',
                        'ball-green': '#B0D840'
                    };
                    const bgColor = bgColors[ballClass] || '#808080';
                    const compHex = getComplementaryColor(bgColor);

                    ballElement.style.backgroundColor = compHex;
                    ballElement.style.color = bgColor; // 글자색은 배경색으로 (보색 대비)
                    ballElement.style.border = `2px solid ${bgColor}`;

                    // 선택 대기 상태로 설정
                    currentSelectingGameIndex = gameIndex;
                    currentSelectingBallIndex = i;
                });
                ballsContainer.appendChild(ballElement);
            } else {
                const ball = document.createElement('div');
                ball.className = 'stat-ball';
                ball.style.width = '24px';
                ball.style.height = '24px';
                ball.style.borderRadius = '50%';
                ball.style.backgroundColor = '#e0e0e0';
                ball.style.color = '#666666';
                ball.style.display = 'flex';
                ball.style.alignItems = 'center';
                ball.style.justifyContent = 'center';
                ball.style.fontSize = '0.9rem';
                ball.style.fontWeight = '700';
                ball.style.cursor = 'pointer';
                ball.style.border = '0.2px solid #808080';
                ball.textContent = '?';
                ball.dataset.gameIndex = gameIndex;
                ball.dataset.ballIndex = i;
                ball.dataset.isSelected = 'false';
                ball.addEventListener('click', () => {
                    handleManualBallClick(gameIndex, i);
                });
                ballsContainer.appendChild(ball);
            }
        }

        // 합계 업데이트
        updateGameSum(gameIndex, numbers);
    } else if (mode === 'manual') {
        // 수동 모드: 검정바탕 흰색 폰트 공 표시
        if (!AppState.setSelectedBalls) {
            AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
        }
        const currentNumbers = AppState.setSelectedBalls[gameIndex - 1] || [];
        for (let i = 0; i < 6; i++) {
            let ball;

            if (currentNumbers[i]) {
                // 선택된 번호가 있으면 색상 공 생성
                ball = createStatBall(currentNumbers[i], 24, '0.9rem');
                ball.style.cursor = 'pointer';
                ball.dataset.gameIndex = gameIndex;
                ball.dataset.ballIndex = i;
            } else {
                // 선택되지 않았으면 기존 흑백 원형 버튼 생성
                ball = document.createElement('div');
                ball.className = 'stat-ball';
                ball.style.width = '24px';
                ball.style.height = '24px';
                ball.style.borderRadius = '50%';
                ball.style.backgroundColor = '#000000';
                ball.style.color = '#ffffff';
                ball.style.display = 'flex';
                ball.style.alignItems = 'center';
                ball.style.justifyContent = 'center';
                ball.style.fontSize = '0.9rem';
                ball.style.fontWeight = '700';
                ball.style.cursor = 'pointer';
                ball.style.border = '0.2px solid #000000';
                ball.textContent = '?';

                ball.dataset.gameIndex = gameIndex;
                ball.dataset.ballIndex = i;
            }

            // 게임공 클릭 시 번호 선택 (선택 모드일 때만)
            ball.addEventListener('click', () => {
                const cb = document.getElementById(`gameCheckbox${gameIndex}`);
                if (cb && cb.checked) return; // 체크된 상태에서는 수정 불가

                // 이전 선택 하이라이트 제거
                const allBalls = ballsContainer.querySelectorAll('.stat-ball');
                allBalls.forEach(b => {
                    b.style.border = '0.2px solid #000000';
                    b.style.boxShadow = 'none';
                });

                // 현재 선택공 하이라이트
                ball.style.border = '2px solid #0066ff';
                ball.style.boxShadow = '0 0 8px rgba(0, 102, 255, 0.5)';

                currentSelectingGameIndex = gameIndex;
                currentSelectingBallIndex = i;
            });

            ballsContainer.appendChild(ball);
        }

        // 합계 업데이트
        updateGameSum(gameIndex, currentNumbers);
    }
}

/** 
 * 수동 모드에서 그리드 공 클릭 시 처리하는 함수가 있다면 수정 필요 
 * (기존 handleManualBallClick 대신 인라인 혹은 다른 함수 사용 중일 수 있음)
 */

/**
 * 게임 합계 업데이트
 */
function updateGameSum(gameIndex, numbers) {
    const sumDisplay = document.getElementById(`gameSum${gameIndex}`);
    if (!sumDisplay) return;

    // 유효한 번호만 필터링하여 합계 계산
    const validNumbers = (numbers || []).filter(n => n && n >= 1 && n <= 45);
    const sum = validNumbers.reduce((acc, num) => acc + num, 0);

    sumDisplay.textContent = ` [ ${sum.toString().padStart(3, '0')} ]`;
}

/**
 * 필터를 적용하여 번호 생성
 */
/** 구간선택(시작~종료) 값 반환. 입력값 없으면 AppState 또는 21/255 사용 */
function getSumRange() {
    const startEl = document.getElementById('sumRangeStart');
    const endEl = document.getElementById('sumRangeEnd');
    let start = startEl && startEl.value !== '' ? parseInt(startEl.value, 10) : (AppState.sumRangeStart != null ? AppState.sumRangeStart : 21);
    let end = endEl && endEl.value !== '' ? parseInt(endEl.value, 10) : (AppState.sumRangeEnd != null ? AppState.sumRangeEnd : 255);
    if (isNaN(start) || start < 21) start = 21;
    if (isNaN(end) || end > 255) end = 255;
    if (start > end) start = end;
    return { start: start, end: end };
}

function generateNumbersWithFilters(existingNumbers = [], skipSumRange) {
    var sumRange = skipSumRange ? null : getSumRange();
    var maxAttempts = 500;
    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        const oddEvenFilter = document.getElementById('oddEvenFilter')?.value || 'none';
        const sequenceFilter = document.getElementById('sequenceFilter')?.value || 'none';
        const hotColdFilter = document.getElementById('hotColdFilter')?.value || 'none';

        var candidate = pickSixWithFilters(oddEvenFilter, sequenceFilter, hotColdFilter, existingNumbers);

        if (!candidate || candidate.length !== 6) {
            candidate = pickSix();
        }
        if (candidate && candidate.length === 6) {
            if (sumRange) {
                var sum = candidate.reduce(function (a, b) { return a + b; }, 0);
                if (sum >= sumRange.start && sum <= sumRange.end) return candidate;
            } else {
                return candidate;
            }
        }
    }
    return pickSix();
}

/**
 * 필터를 적용한 번호 선택
 */
function pickSixWithFilters(oddEvenFilter, sequenceFilter, hotColdFilter, existingNumbers = []) {
    const maxAttempts = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // 기존 번호가 있으면 그것을 포함하여 선택
        let selected;
        if (existingNumbers.length > 0) {
            const remaining = 6 - existingNumbers.length;
            const pool = getAllNumbers().filter(n => !existingNumbers.includes(n));
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            selected = [...existingNumbers, ...shuffled.slice(0, remaining)];
        } else {
            selected = pickSix();
        }

        selected = selected.sort((a, b) => a - b);

        // 중복 제거 (기존 번호와 새 번호에 중복이 있을 수 있음)
        selected = [...new Set(selected)];
        if (selected.length < 6) {
            // 중복 제거 후 부족하면 추가 선택
            const pool = getAllNumbers().filter(n => !selected.includes(n));
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            selected = [...selected, ...shuffled.slice(0, 6 - selected.length)].slice(0, 6);
            selected = selected.sort((a, b) => a - b);
        }

        // 홀짝 비율 검증
        if (oddEvenFilter !== 'none') {
            const [targetOdd, targetEven] = oddEvenFilter.split('-').map(Number);
            const oddCount = selected.filter(n => n % 2 === 1).length;
            const evenCount = selected.filter(n => n % 2 === 0).length;

            if (oddCount !== targetOdd || evenCount !== targetEven) {
                continue;
            }
        }

        // 연속 검증
        if (sequenceFilter !== 'none') {
            const requiredPairs = parseInt(sequenceFilter);
            const pairs = countSequentialPairs(selected);
            if (pairs !== requiredPairs) {
                continue;
            }
        } else {
            // 연속없음: 연속이 없어야 함
            const pairs = countSequentialPairs(selected);
            if (pairs > 0) {
                continue;
            }
        }

        // 핫콜 비율 검증
        if (hotColdFilter !== 'none' && AppState && AppState.allLotto645Data) {
            const { hot, cold } = getOverallHotColdNumbers();
            const [targetHot, targetCold] = hotColdFilter.split('-').map(Number);
            const hotSet = new Set(hot);
            const coldSet = new Set(cold);
            const hotCount = selected.filter(n => hotSet.has(n)).length;
            const coldCount = selected.filter(n => coldSet.has(n)).length;

            if (hotCount !== targetHot || coldCount !== targetCold) {
                continue;
            }
        }

        // 모든 조건을 만족하면 반환
        return selected;
    }

    // 조건을 만족하지 못하면 null 반환
    return null;
}

/**
 * 연속된 번호 쌍 개수 계산
 */
function countSequentialPairs(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    let count = 0;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1] + 1) {
            count++;
        }
    }
    return count;
}

/**
 * 게임 세트 업데이트
 */
function updateGameSet(gameIndex, mode, isModeChange = false) {
    generateGame(gameIndex, mode, isModeChange);
}

/**
 * 저장박스 활성화 상태 업데이트
 */
function updateSaveBoxState() {
    const saveRound = document.getElementById('saveRound');
    const saveBtn = document.getElementById('saveBtn');

    if (!saveRound || !saveBtn) return;

    // 1~5개 게임 중 하나라도 6개 번호가 완성되었고 체크되어 있는지 확인
    let hasValidGame = false;
    for (let i = 1; i <= 5; i++) {
        const checkbox = document.getElementById(`gameCheckbox${i}`);
        if (checkbox && checkbox.checked) {
            const numbers = AppState.setSelectedBalls[i - 1] || [];
            const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
            if (validNumbers.length === 6) {
                hasValidGame = true;
                break;
            }
        }
    }

    // 저장박스 및 버튼 활성화/비활성화
    saveBtn.disabled = !hasValidGame;

    // 유효한 게임이 있으면 회차 자동 세팅 (최신 회차 + 1)
    if (hasValidGame && AppState && AppState.allLotto645Data && AppState.allLotto645Data.length > 0) {
        const latestRound = AppState.allLotto645Data[0].round;
        saveRound.value = latestRound + 1;
        saveRound.readOnly = true; // 읽기 전용으로 설정
        saveRound.disabled = false;
    } else if (!hasValidGame) {
        saveRound.value = "";
        saveRound.disabled = true;
        saveRound.readOnly = false;
    } else {
        saveRound.disabled = !hasValidGame;
    }
}

/**
 * 저장 버튼 이벤트 리스너 설정
 */
function setupSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        await saveGamesToCSV();
    });
}

/**
 * 게임을 CSV 파일에 저장
 */
async function saveGamesToCSV() {
    const saveRound = document.getElementById('saveRound');

    if (!saveRound) return;

    const round = parseInt(saveRound.value);

    if (!round || round <= 0 || isNaN(round)) {
        alert('회차를 입력해주세요.');
        return;
    }

    // 최종회차(가장 최신 회차) 확인
    if (AppState && AppState.allLotto645Data && AppState.allLotto645Data.length > 0) {
        const latestRound = AppState.allLotto645Data[0].round;
        if (round <= latestRound) {
            alert(`회차는 최종회차(${latestRound}회) 당첨 이후여야 합니다.`);
            return;
        }
    }

    try {
        const oddEvenFilter = document.getElementById('oddEvenFilter')?.value || 'none';
        const sequenceFilter = document.getElementById('sequenceFilter')?.value || 'none';
        const hotColdFilter = document.getElementById('hotColdFilter')?.value || 'none';

        const mapRatioToNumber = (value) => {
            if (value === 'none') return -1;
            if (value === '0-6') return 0;
            if (value === '1-5') return 1;
            if (value === '2-4') return 2;
            if (value === '3-3') return 3;
            if (value === '4-2') return 4;
            if (value === '5-1') return 5;
            if (value === '6-0') return 6;
            return -1;
        };

        const mapSequenceToNumber = (value) => {
            if (value === 'none') return 0;
            return parseInt(value) || 0;
        };

        const oddEvenValue = mapRatioToNumber(oddEvenFilter);
        const sequenceValue = mapSequenceToNumber(sequenceFilter);
        const hotColdValue = mapRatioToNumber(hotColdFilter);

        // 체크된 게임들만 저장
        const gamesToSave = [];
        for (let i = 1; i <= 5; i++) {
            const checkbox = document.getElementById(`gameCheckbox${i}`);
            if (checkbox && checkbox.checked) {
                const numbers = AppState.setSelectedBalls[i - 1] || [];
                // 6개 번호가 모두 있는지 확인
                const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
                if (validNumbers.length === 6) {

                    // 모드 읽기
                    const modeBtn = document.getElementById(`modeBtn${i}`);
                    let gameMode = '자동';
                    if (modeBtn) {
                        if (modeBtn.dataset.mode === 'auto') gameMode = '자동';
                        else if (modeBtn.dataset.mode === 'semi-auto') gameMode = '반자동';
                        else if (modeBtn.dataset.mode === 'manual') gameMode = '수동';
                    }

                    const sorted = validNumbers.sort((a, b) => a - b);

                    gamesToSave.push({
                        '회차': round.toString(),
                        '세트': '', // 서버에서 자동 채워짐
                        '게임': i.toString(),
                        '홀짝': oddEvenValue === -1 ? '' : oddEvenValue.toString(),
                        '연속': sequenceValue.toString(),
                        '핫콜': hotColdValue === -1 ? '' : hotColdValue.toString(),
                        '게임선택': gameMode,
                        '선택1': sorted[0].toString(),
                        '선택2': sorted[1].toString(),
                        '선택3': sorted[2].toString(),
                        '선택4': sorted[3].toString(),
                        '선택5': sorted[4].toString(),
                        '선택6': sorted[5].toString()
                    });
                }
            }
        }

        if (gamesToSave.length === 0) {
            alert('저장할 게임이 없습니다. 체크박스를 선택하고 번호를 완성해주세요.');
            return;
        }

        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/save-lotto023`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                games: gamesToSave
            })
        });

        if (!response.ok) {
            throw new Error(`서버 응답 오류 (상태 코드: ${response.status})`);
        }

        const result = await response.json();

        if (result.returnValue === 'success') {
            // 새 데이터 로드를 위해 기존 캐시 삭제
            if (typeof CACHE_KEYS !== 'undefined' && CACHE_KEYS.LOTTO023) {
                localStorage.removeItem(CACHE_KEYS.LOTTO023);
            } else {
                localStorage.removeItem('LOTTO023_DATA_CACHE_V2');
            }

            await loadAndDisplayResults();

            // 1~5개 게임 초기화
            AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
            for (let i = 1; i <= 5; i++) {
                const cb = document.getElementById(`gameCheckbox${i}`);
                if (cb) {
                    cb.checked = false;
                    cb.disabled = true;
                }
            }
            generateAllGames();
            updateSaveBoxState();

            alert('저장 완료!');
        } else {
            throw new Error(result.error || '알 수 없는 오류');
        }
    } catch (error) {
        console.error('저장 오류:', error);
        alert('저장 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 저장된 결과 로드 및 표시
 */
async function loadAndDisplayResults() {
    const resultContainer = document.getElementById('resultContainer');
    if (!resultContainer) return;

    try {
        const lotto023Data = await loadLotto023Data();

        if (!lotto023Data || lotto023Data.length === 0) {
            resultContainer.innerHTML = '<p style="text-align: center; color: #666; font-size: 0.9rem;">저장된 결과가 없습니다.</p>';
            return;
        }

        // 회차별로 그룹화
        const grouped = {};
        lotto023Data.forEach(item => {
            const key = `${item.round}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        });

        // 최신 순으로 정렬 (회차 내림차순)
        const sortedGroups = Object.entries(grouped).sort((a, b) => Number(b[0]) - Number(a[0]));

        resultContainer.innerHTML = '';

        // 각 그룹별로 결과 표시
        sortedGroups.forEach(([roundStr, games]) => {
            const round = Number(roundStr);

            // 해당 회차의 당첨번호 찾기
            const winRound = AppState.allLotto645Data.find(r => r.round === round);
            const winningNumbers = winRound && winRound.numbers ? new Set(winRound.numbers) : null;

            games.sort((a, b) => {
                const setA = a.set !== undefined ? a.set : parseInt(a['세트']) || 0;
                const setB = b.set !== undefined ? b.set : parseInt(b['세트']) || 0;
                if (setA !== setB) return setB - setA;
                return a.game - b.game;
            });

            games.forEach(game => {
                const resultLine = document.createElement('div');
                resultLine.style.display = 'flex';
                resultLine.style.alignItems = 'center';
                resultLine.style.gap = '8px';
                resultLine.style.padding = '4px 6px';
                resultLine.style.minHeight = '32px';
                resultLine.style.boxSizing = 'border-box';
                resultLine.style.borderBottom = '1px solid #e0e0e0';

                // 정보 표시: 회차 / 게임 / 홀짝 / 연속 / 핫콜 / 모드
                const infoText = document.createElement('div');
                infoText.style.display = 'flex';
                infoText.style.alignItems = 'center';
                infoText.style.gap = '6px';
                infoText.style.fontSize = '0.8em';
                infoText.style.color = '#000000';
                infoText.style.fontWeight = 'normal';
                infoText.style.width = '240px';
                infoText.style.flexShrink = '0';
                infoText.style.whiteSpace = 'nowrap'; // 한 줄로 출력 보장

                const oe = game.oddEven !== undefined && game.oddEven !== "" ? game.oddEven : "-";
                const seq = game.sequence !== undefined && game.sequence !== "" ? game.sequence : "-";
                const hc = game.hotCold !== undefined && game.hotCold !== "" ? game.hotCold : "-";
                const mode = game.gameMode || "-";

                const setVal = game.set !== undefined ? game.set : game['세트'];
                const setDisplay = setVal !== undefined && setVal !== null && setVal !== '' ? `${setVal}-` : '';

                infoText.innerHTML = `<span style="font-size: 1.125em; font-weight: bold; margin-left: 2px; margin-right: 12px;">${game.round} 회</span> ${setDisplay}${game.game}게임 / 홀${oe} / 연${seq} / 핫${hc} / ${mode}`;

                // 우측 결과공 컨테이너
                const resultBallsContainer = document.createElement('div');
                resultBallsContainer.style.display = 'flex';
                resultBallsContainer.style.gap = '10px';
                resultBallsContainer.style.alignItems = 'center';
                resultBallsContainer.style.marginLeft = 'auto';

                // 결과공 생성 (6개)
                if (game.numbers && Array.isArray(game.numbers)) {
                    game.numbers.slice(0, 6).forEach(num => {
                        const ball = createStatBall(num, 20, '0.75rem');
                        if (winningNumbers && !winningNumbers.has(num)) {
                            ball.style.backgroundColor = '#ffffff';
                            ball.style.color = '#000000';
                            ball.style.border = '1.5px solid #000000';
                            ball.className = 'stat-ball';
                        } else if (!winningNumbers) {
                            ball.style.backgroundColor = '#ffffff';
                            ball.style.color = '#000000';
                            ball.style.border = '1.5px solid #000000';
                            ball.className = 'stat-ball';
                        }
                        resultBallsContainer.appendChild(ball);
                    });
                }

                // 보너스공 추가
                if (winRound && winRound.bonus) {
                    const separator = document.createElement('span');
                    separator.textContent = '+';
                    separator.style.fontSize = '0.75rem';
                    separator.style.margin = '0 2px';
                    resultBallsContainer.appendChild(separator);

                    const bonusBall = createStatBall(winRound.bonus, 20, '0.75rem');
                    bonusBall.style.marginRight = '2px';
                    resultBallsContainer.appendChild(bonusBall);
                }

                resultLine.appendChild(infoText);
                resultLine.appendChild(resultBallsContainer);
                resultContainer.appendChild(resultLine);
            });
        });
    } catch (error) {
        console.error(error);
        resultContainer.innerHTML = '<p style="text-align: center; color: #f00; font-size: 0.9rem;">결과를 로드할 수 없습니다.</p>';
    }
}

/**
 * 날짜 문자열을 Date 객체로 변환 (YYYY-MM-DD, yy/mm/dd, 또는 000000 형식 지원)
 */
/**
 * 입력값을 회차 번호로 변환하는지 확인 (4자리 이내 숫자, 0000 이상)
 */
function isRoundInput(value) {
    const trimmed = value.trim();
    // 1~4자리 숫자만 (0000 이상)
    if (!/^\d{1,4}$/.test(trimmed)) {
        return false;
    }
    const round = parseInt(trimmed);
    // 0000 이상이어야 함 (0은 허용하지 않음, 0001 이상)
    return round >= 1;
}

/**
 * 회차 번호를 해당 회차의 날짜(yy/mm/dd)로 변환 (Lotto645.csv 데이터 기준)
 */
function convertRoundToDate(roundNumber) {
    // Lotto645.csv 데이터가 없으면 null 반환
    if (!AppState || !AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return null;
    }

    const round = parseInt(roundNumber);
    // 0001 이상이어야 함 (1회차 이상)
    if (isNaN(round) || round < 1) {
        return null;
    }

    // Lotto645.csv 데이터에서 회차 찾기 (타입 안전 비교)
    const lotto645Data = AppState.allLotto645Data;

    // 회차 검색 (더 안전한 비교)
    const roundData = lotto645Data.find(r => {
        // 다양한 타입과 형식 처리
        let rRound;
        if (typeof r.round === 'string') {
            rRound = parseInt(r.round.trim());
        } else if (typeof r.round === 'number') {
            rRound = Math.floor(r.round);
        } else {
            rRound = parseInt(String(r.round));
        }

        // NaN 체크
        if (isNaN(rRound)) {
            return false;
        }

        return rRound === round;
    });

    if (!roundData) {
        return null;
    }

    if (!roundData.date) {
        return null;
    }

    // 날짜를 yy/mm/dd 형식으로 변환
    const date = parseDate(roundData.date);
    if (!date || date === '000000' || date === '999999' || !(date instanceof Date)) {
        return null;
    }

    return formatDateYYMMDD(date);
}

/**
 * 6자리 날짜 입력 시 해당 날짜를 포함하는 회차 찾기
 * @param {string} dateInput - 6자리 날짜 (yyyymmdd 또는 yymmdd)
 * @param {boolean} isStartDate - 시작일인지 여부 (true: 이후 첫 회차, false: 이전 마지막 회차)
 * @returns {string} 해당 회차의 날짜 (yy/mm/dd) 또는 null
 */
function convertDateToRoundDate(dateInput, isStartDate) {
    if (!AppState || !AppState.allLotto645Data) return null;

    // 6자리 날짜 파싱
    const date = parseDate(dateInput);
    if (!date || date === '000000' || date === '999999') return null;

    if (isStartDate) {
        // 시작일: 시작일 포함 이후 첫 회차 찾기
        for (let i = AppState.allLotto645Data.length - 1; i >= 0; i--) {
            const roundDate = parseDate(AppState.allLotto645Data[i].date);
            if (roundDate && roundDate >= date) {
                return formatDateYYMMDD(roundDate);
            }
        }
    } else {
        // 종료일: 종료일 포함 이전 마지막 회차 찾기
        for (let i = 0; i < AppState.allLotto645Data.length; i++) {
            const roundDate = parseDate(AppState.allLotto645Data[i].date);
            if (roundDate && roundDate <= date) {
                return formatDateYYMMDD(roundDate);
            }
        }
    }

    return null;
}

function parseDate(dateString) {
    if (!dateString) return null;

    // 공백 제거
    dateString = dateString.trim();

    // 4자리 이내 숫자는 회차로 처리하지 않음 (parseDate는 날짜만 파싱)
    // 회차 처리는 별도 함수에서 처리

    // 000000 형식 처리 (예: 240101 -> 24/01/01, 000000은 첫회, 999999는 최종회)
    if (/^\d{6}$/.test(dateString)) {
        // 000000 또는 999999는 특별 처리
        if (dateString === '000000' || dateString === '999999') {
            return dateString; // 특별값으로 반환
        }

        const year = parseInt(dateString.substring(0, 2));
        const month = parseInt(dateString.substring(2, 4));
        const day = parseInt(dateString.substring(4, 6));

        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }

        const fullYear = year >= 50 ? 1900 + year : 2000 + year;
        return new Date(fullYear, month - 1, day);
    }

    // yy/mm/dd 형식 처리
    if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length !== 3) return null;
        let year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);

        // yy 형식이면 2000년대 또는 1900년대로 해석
        if (year < 100) {
            year = year >= 50 ? 1900 + year : 2000 + year;
        }

        return new Date(year, month - 1, day);
    }

    // YYYY-MM-DD 형식 처리
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/**
 * 날짜를 YYYY-MM-DD 형식 문자열로 변환
 */
function formatDate(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 날짜를 yy/mm/dd 형식 문자열로 변환
 */
function formatDateYYMMDD(date) {
    if (!date) return '';
    const year = String(date.getFullYear()).substring(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

/**
 * YYYY-MM-DD 형식을 yy/mm/dd 형식으로 변환
 */
function convertToYYMMDD(dateString) {
    if (!dateString) return '';
    const date = parseDate(dateString);
    if (!date) return dateString;
    return formatDateYYMMDD(date);
}

/**
 * yy/mm/dd 형식을 YYYY-MM-DD 형식으로 변환 (000000/999999 특수 처리)
 */
function convertFromYYMMDD(dateString) {
    if (!dateString) return '';
    // 000000 또는 999999는 그대로 반환
    if (dateString.trim() === '000000' || dateString.trim() === '999999') {
        return dateString.trim();
    }
    const date = parseDate(dateString);
    if (!date) return dateString;
    return formatDate(date);
}

/**
 * 시작일과 종료일 사이의 회차 범위 계산
 * 시작일을 포함한 이후 첫 회차 ~ 종료일을 포함한 이전 회차
 */
function calculateRoundRange(lotto645Data, startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr || !lotto645Data || lotto645Data.length === 0) {
        return null;
    }

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    if (!startDate || !endDate) {
        return null;
    }

    // 필터링된 데이터를 가져옴
    const filteredData = filterDataByDateRange(
        lotto645Data,
        convertFromYYMMDD(startDateStr),
        convertFromYYMMDD(endDateStr)
    );

    if (filteredData.length === 0) {
        return null;
    }

    // 필터링된 데이터에서 최소/최대 회차 찾기
    let minRound = filteredData[0].round;
    let maxRound = filteredData[0].round;

    filteredData.forEach(round => {
        if (round.round < minRound) {
            minRound = round.round;
        }
        if (round.round > maxRound) {
            maxRound = round.round;
        }
    });

    return { min: minRound, max: maxRound };
}

/**
 * 날짜 입력에서 해당 회차 번호 찾기 (Lotto645.csv 데이터 기준)
 * @param {string} dateInput - 날짜 입력 (회차 또는 날짜)
 * @param {boolean} isStartDate - 시작일인지 여부
 * @returns {number|null} 회차 번호 또는 null
 */
function findRoundFromDateInput(dateInput, isStartDate) {
    // Lotto645.csv 데이터가 없으면 null 반환
    if (!AppState || !AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return null;
    }

    if (!dateInput) return null;

    const value = dateInput.trim();
    if (!value) return null;

    // Lotto645.csv 데이터 사용 (필터링되지 않은 원본 데이터)
    const lotto645Data = AppState.allLotto645Data;

    // 4자리 이내 숫자는 회차로 처리
    if (isRoundInput(value)) {
        const round = parseInt(value);
        // Lotto645.csv에서 해당 회차가 존재하는지 확인 (타입 안전 비교)
        const roundData = lotto645Data.find(r => {
            // 다양한 타입과 형식 처리
            let rRound;
            if (typeof r.round === 'string') {
                rRound = parseInt(r.round.trim());
            } else if (typeof r.round === 'number') {
                rRound = Math.floor(r.round);
            } else {
                rRound = parseInt(String(r.round));
            }

            // NaN 체크
            if (isNaN(rRound)) {
                return false;
            }

            return rRound === round;
        });
        return roundData ? round : null;
    }

    // 날짜 형식 처리 (6자리 숫자 또는 yy/mm/dd 형식)
    if (/^\d{6}$/.test(value) || value.includes('/') || value.includes('-')) {
        // 특수값 000000 또는 999999 처리
        if (value === '000000') {
            // 첫회차 (Lotto645.csv에서 가장 오래된 회차)
            if (lotto645Data.length > 0) {
                const firstRound = lotto645Data[lotto645Data.length - 1];
                return typeof firstRound.round === 'string' ? parseInt(firstRound.round) : firstRound.round;
            }
            return null;
        } else if (value === '999999') {
            // 최종회차 (Lotto645.csv에서 가장 최신 회차)
            if (lotto645Data.length > 0) {
                const lastRound = lotto645Data[0];
                return typeof lastRound.round === 'string' ? parseInt(lastRound.round) : lastRound.round;
            }
            return null;
        }

        const date = parseDate(value);
        if (!date || date === '000000' || date === '999999' || !(date instanceof Date)) {
            return null;
        }

        // 날짜로부터 회차 찾기 (Lotto645.csv 데이터 기준)
        if (isStartDate) {
            // 시작일: 시작일 포함 이후 첫 회차 찾기 (오래된 것부터 검색)
            for (let i = lotto645Data.length - 1; i >= 0; i--) {
                const roundItem = lotto645Data[i];
                const roundDate = parseDate(roundItem.date);
                if (roundDate && roundDate instanceof Date && roundDate >= date) {
                    return typeof roundItem.round === 'string' ? parseInt(roundItem.round) : roundItem.round;
                }
            }
        } else {
            // 종료일: 종료일 포함 이전 마지막 회차 찾기 (최신 것부터 검색)
            for (let i = 0; i < lotto645Data.length; i++) {
                const roundItem = lotto645Data[i];
                const roundDate = parseDate(roundItem.date);
                if (roundDate && roundDate instanceof Date && roundDate <= date) {
                    return typeof roundItem.round === 'string' ? parseInt(roundItem.round) : roundItem.round;
                }
            }
        }
    }

    return null;
}

/**
 * 시작일/종료일 회차 표시 업데이트 (Lotto645.csv 데이터 기준)
 * 시작일/종료일 입력값을 바탕으로 Lotto645.csv에서 해당 회차를 찾아 표시
 */
function updateRoundDisplay() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const startRoundDisplay = document.getElementById('startRoundDisplay');
    const endRoundDisplay = document.getElementById('endRoundDisplay');

    if (!startDateInput || !endDateInput || !startRoundDisplay || !endRoundDisplay) {
        return;
    }

    // Lotto645.csv 데이터를 기준으로 시작일 회차 찾기
    const startRound = findRoundFromDateInput(startDateInput.value, true);
    if (startRound) {
        startRoundDisplay.textContent = `(${startRound.toString().padStart(4, '0')}회)`;
    } else {
        startRoundDisplay.textContent = '(0000회)';
    }

    // Lotto645.csv 데이터를 기준으로 종료일 회차 찾기
    const endRound = findRoundFromDateInput(endDateInput.value, false);
    if (endRound) {
        endRoundDisplay.textContent = `(${endRound.toString().padStart(4, '0')}회)`;
    } else {
        endRoundDisplay.textContent = '(0000회)';
    }
}

/**
 * 회차 범위 표시 업데이트
 * (roundRange 요소가 제거되어 이 함수는 더 이상 사용되지 않음)
 */
function updateRoundRangeDisplay() {
    // 회차 표시 업데이트로 대체
    updateRoundDisplay();
}

/**
 * 시작일과 종료일 비교 검증 (종료일이 시작일보다 커야 함)
 * @returns {boolean} 검증 통과 여부
 */
function validateDateRange() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (!startDateInput || !endDateInput) {
        return true; // 입력 필드가 없으면 검증 건너뛰기
    }

    const startValue = startDateInput.value.trim();
    const endValue = endDateInput.value.trim();

    if (!startValue || !endValue) {
        return true; // 값이 없으면 검증 건너뛰기
    }

    // 시작일 회차/날짜 찾기
    let startRound = null;
    let startDate = null;

    if (isRoundInput(startValue)) {
        // 회차로 입력한 경우, 날짜로 변환해서 비교
        const dateStr = convertRoundToDate(startValue);
        if (dateStr) {
            const parsedDate = parseDate(dateStr);
            if (parsedDate && parsedDate instanceof Date) {
                startDate = parsedDate;
                startRound = parseInt(startValue);
            }
        }
    } else {
        // 날짜로 입력한 경우
        const parsedDate = parseDate(startValue);
        if (parsedDate && parsedDate instanceof Date) {
            startDate = parsedDate;
            startRound = findRoundFromDateInput(startValue, true);
        }
    }

    // 종료일 회차/날짜 찾기
    let endRound = null;
    let endDate = null;

    if (isRoundInput(endValue)) {
        // 회차로 입력한 경우, 날짜로 변환해서 비교
        const dateStr = convertRoundToDate(endValue);
        if (dateStr) {
            const parsedDate = parseDate(dateStr);
            if (parsedDate && parsedDate instanceof Date) {
                endDate = parsedDate;
                endRound = parseInt(endValue);
            }
        }
    } else {
        // 날짜로 입력한 경우
        const parsedDate = parseDate(endValue);
        if (parsedDate && parsedDate instanceof Date) {
            endDate = parsedDate;
            endRound = findRoundFromDateInput(endValue, false);
        }
    }

    // 회차로 비교 가능한 경우
    if (startRound !== null && endRound !== null) {
        if (endRound <= startRound) {
            alert(`종료일(회차 ${endRound})은 시작일(회차 ${startRound})보다 커야 합니다.`);
            return false;
        }
        return true;
    }

    // 날짜로 비교 가능한 경우
    if (startDate && endDate && startDate instanceof Date && endDate instanceof Date) {
        if (endDate <= startDate) {
            const startDateStr = formatDateYYMMDD(startDate);
            const endDateStr = formatDateYYMMDD(endDate);
            alert(`종료일(${endDateStr})은 시작일(${startDateStr})보다 커야 합니다.`);
            return false;
        }
        return true;
    }

    return true; // 비교 불가능한 경우는 통과
}

/**
 * 날짜로 회차 찾기 (closest: true면 근접 회차 반환)
 */
function findRoundByDate(dateStr, isStart) {
    if (!AppState.allLotto645Data) return null;
    const res = parseDate(dateStr);
    if (!res) return null;

    let targetDate;
    if (res === '000000') {
        // 아주 과거 날짜 (1회차 이전)
        targetDate = new Date(2002, 0, 1);
    } else if (res === '999999') {
        // 아주 미래 날짜
        targetDate = new Date(2999, 11, 31);
    } else if (res instanceof Date && !isNaN(res)) {
        targetDate = res;
    } else {
        return null; // 알 수 없는 형식
    }

    targetDate.setHours(0, 0, 0, 0);

    let bestMatch = null;

    // 데이터는 회차 내림차순 (최신 -> 과거)
    for (const round of AppState.allLotto645Data) {
        const rDate = parseDate(round.date);
        if (!rDate) continue;
        rDate.setHours(0, 0, 0, 0);

        if (isStart) {
            // 시작일 이후(포함)의 첫 회차
            if (rDate >= targetDate) bestMatch = round.round;
            else break;
        } else {
            // 종료일 이전(포함)의 첫 회차
            if (rDate <= targetDate) return round.round;
        }
    }
    return bestMatch;
}

function findDateByRound(roundNo) {
    if (!AppState.allLotto645Data) return null;
    const round = AppState.allLotto645Data.find(r => r.round === parseInt(roundNo));
    return round ? round.date : null;
}

function getRangeType() {
    const radio = document.querySelector('input[name="rangeType"]:checked');
    return radio ? radio.value : 'round';
}

/**
 * 회차 입력 -> 날짜 자동 계산
 */
function syncRoundToDate() {
    const startRoundInput = document.getElementById('startRound');
    const endRoundInput = document.getElementById('endRound');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (getRangeType() !== 'round') return;

    const sVal = startRoundInput.value.trim();
    if (sVal) {
        const date = findDateByRound(sVal);
        // 날짜 포맷 변환 (YYYY-MM-DD -> YY/MM/DD)
        if (date && typeof date === 'string' && date.includes('-')) {
            const parts = date.split('-');
            if (parts.length === 3) startDateInput.value = `${parts[0].slice(2)}/${parts[1]}/${parts[2]}`;
            else startDateInput.value = date;
        } else {
            startDateInput.value = date || '';
        }
    } else {
        startDateInput.value = '';
    }

    const eVal = endRoundInput.value.trim();
    if (eVal) {
        const date = findDateByRound(eVal);
        if (date && typeof date === 'string' && date.includes('-')) {
            const parts = date.split('-');
            if (parts.length === 3) endDateInput.value = `${parts[0].slice(2)}/${parts[1]}/${parts[2]}`;
            else endDateInput.value = date;
        } else {
            endDateInput.value = date || '';
        }
    } else {
        endDateInput.value = '';
    }
}

/**
 * 날짜 입력 -> 회차 자동 계산
 */
function syncDateToRound() {
    const startRoundInput = document.getElementById('startRound');
    const endRoundInput = document.getElementById('endRound');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (getRangeType() !== 'period') return;

    const sVal = startDateInput.value.trim();
    if (sVal.length >= 6) {
        const round = findRoundByDate(sVal, true);
        startRoundInput.value = round ? round : '';
    } else {
        startRoundInput.value = '';
    }

    const eVal = endDateInput.value.trim();
    if (eVal.length >= 6) {
        const round = findRoundByDate(eVal, false);
        endRoundInput.value = round ? round : '';
    } else {
        endRoundInput.value = '';
    }
}


function setupRangeTypeSelectors() {
    const radios = document.querySelectorAll('input[name="rangeType"]');
    const roundRow = document.getElementById('roundInputRow');
    const dateRow = document.getElementById('dateInputRow');

    const startRoundInput = document.getElementById('startRound');
    const endRoundInput = document.getElementById('endRound');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    function updateUI() {
        const type = getRangeType();

        if (type === 'round') {
            roundRow.classList.remove('disabled');
            dateRow.classList.add('disabled');

            if (startRoundInput) startRoundInput.readOnly = false;
            if (endRoundInput) endRoundInput.readOnly = false;

            if (startDateInput) startDateInput.readOnly = true;
            if (endDateInput) endDateInput.readOnly = true;

            syncRoundToDate();
        } else {
            roundRow.classList.add('disabled');
            dateRow.classList.remove('disabled');

            if (startRoundInput) startRoundInput.readOnly = true;
            if (endRoundInput) endRoundInput.readOnly = true;

            if (startDateInput) startDateInput.readOnly = false;
            if (endDateInput) endDateInput.readOnly = false;

            syncDateToRound();
        }
    }

    radios.forEach(r => r.addEventListener('change', updateUI));

    if (startRoundInput) startRoundInput.addEventListener('input', syncRoundToDate);
    if (endRoundInput) endRoundInput.addEventListener('input', syncRoundToDate);

    function handleDateInput(e) {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 6) val = val.slice(0, 6);
        let formatted = '';
        if (val.length > 4) {
            formatted = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
        } else if (val.length > 2) {
            formatted = val.slice(0, 2) + '/' + val.slice(2);
        } else {
            formatted = val;
        }
        e.target.value = formatted;
        syncDateToRound();
    }

    if (startDateInput) startDateInput.addEventListener('input', handleDateInput);
    if (endDateInput) endDateInput.addEventListener('input', handleDateInput);

    const btn = document.getElementById('selectDateRangeBtn');
    if (btn) {
        btn.onclick = updateStatsByDateRange;
    }

    updateUI();
}

/**
 * 선택된 기간에 해당하는 데이터 필터링 (기간 모드용)
 */
function filterDataByDateRange(lotto645Data, startDate, endDate) {
    if (!startDate || !endDate || !lotto645Data || lotto645Data.length === 0) return [];

    let start, end;
    if (startDate === '000000') start = null;
    else {
        start = parseDate(startDate);
        if (!start) return [];
        start.setHours(0, 0, 0, 0);
    }

    if (endDate === '999999') end = null;
    else {
        end = parseDate(endDate);
        if (!end) return [];
        end.setHours(23, 59, 59, 999);
    }

    const oldestRoundDate = parseDate(lotto645Data[lotto645Data.length - 1].date);
    const newestRoundDate = parseDate(lotto645Data[0].date);

    if (!oldestRoundDate || !newestRoundDate) return [];

    if (start === null) {
        start = oldestRoundDate;
        start.setHours(0, 0, 0, 0);
    }
    if (end === null) {
        end = newestRoundDate;
        end.setHours(23, 59, 59, 999);
    }

    if (start > newestRoundDate || end < oldestRoundDate) return [];

    let startIndex = -1;
    for (let i = lotto645Data.length - 1; i >= 0; i--) {
        const roundDate = parseDate(lotto645Data[i].date);
        if (roundDate && roundDate >= start) {
            startIndex = i;
            break;
        }
    }

    let endIndex = -1;
    for (let i = 0; i < lotto645Data.length; i++) {
        const roundDate = parseDate(lotto645Data[i].date);
        if (roundDate && roundDate <= end) {
            endIndex = i;
            break;
        }
    }

    if (startIndex === -1 || endIndex === -1 || startIndex < endIndex) return [];

    return lotto645Data.slice(endIndex, startIndex + 1);
}

/**
 * 시작회차부터 종료회차까지 출현되는 홀짝비율, 연속회수, 핫콜비율, 합계 최소/최대를 추출하여 옵션필터에 적용
 */
function extractAndApplyFilters(filteredData) {
    if (!filteredData || filteredData.length === 0) return;

    const oddEvenCounts = {};
    const sequenceCounts = {};
    const hotColdCounts = {};
    let minSum = Infinity;
    let maxSum = -Infinity;

    // 핫/콜 기준은 전체 역대 데이터를 기반으로 함 (일관된 분석을 위함)
    const { hot, cold } = getOverallHotColdNumbers();
    const hotSet = new Set(hot);

    filteredData.forEach(round => {
        const nums = round.numbers;
        if (!nums || nums.length !== 6) return;

        // 1. 홀짝 비율 (홀수 개수:짝수 개수)
        let oddCount = 0;
        nums.forEach(n => { if (n % 2 !== 0) oddCount++; });
        const evenCount = 6 - oddCount;
        const oeKey = `${oddCount}-${evenCount}`;
        oddEvenCounts[oeKey] = (oddEvenCounts[oeKey] || 0) + 1;

        // 2. 연속 회수 (연속된 번호 쌍의 개수)
        const sorted = [...nums].sort((a, b) => a - b);
        let seqPairCount = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] === sorted[i] + 1) seqPairCount++;
        }
        // UI 필터링 옵션은 1, 2, 3임. 3 이상은 3으로 처리.
        const seqKey = seqPairCount === 0 ? "none" : (seqPairCount >= 3 ? "3" : seqPairCount.toString());
        sequenceCounts[seqKey] = (sequenceCounts[seqKey] || 0) + 1;

        // 3. 핫콜 비율 (핫 번호 개수:콜 번호 개수)
        let hotCount = 0;
        nums.forEach(n => { if (hotSet.has(n)) hotCount++; });
        const coldCount = 6 - hotCount;
        const hcKey = `${hotCount}-${coldCount}`;
        hotColdCounts[hcKey] = (hotColdCounts[hcKey] || 0) + 1;

        // 4. 합계
        const sum = nums.reduce((a, b) => a + b, 0);
        if (sum < minSum) minSum = sum;
        if (sum > maxSum) maxSum = sum;
    });

    // 가장 많이 출현한 항목 찾기 (Mode)
    const getMode = (counts) => {
        let mode = 'none';
        let maxFreq = -1;
        for (const key in counts) {
            if (counts[key] > maxFreq) {
                maxFreq = counts[key];
                mode = key;
            }
        }
        return mode;
    };

    const bestOE = getMode(oddEvenCounts);
    const bestSeq = getMode(sequenceCounts);
    const bestHC = getMode(hotColdCounts);

    // console.log(`[Extract] Best OE: ${bestOE}, Best Seq: ${bestSeq}, Best HC: ${bestHC}, Sum: ${minSum}~${maxSum}`);

    // UI에 적용
    const oeEl = document.getElementById('oddEvenFilter');
    const seqEl = document.getElementById('sequenceFilter');
    const hcEl = document.getElementById('hotColdFilter');
    const sumStartEl = document.getElementById('sumRangeStart');
    const sumEndEl = document.getElementById('sumRangeEnd');

    if (oeEl) {
        if ([...oeEl.options].some(opt => opt.value === bestOE)) oeEl.value = bestOE;
        else oeEl.value = 'none';
    }
    if (seqEl) {
        if ([...seqEl.options].some(opt => opt.value === bestSeq)) seqEl.value = bestSeq;
        else seqEl.value = 'none';
    }
    if (hcEl) {
        if ([...hcEl.options].some(opt => opt.value === bestHC)) hcEl.value = bestHC;
        else hcEl.value = 'none';
    }
    if (sumStartEl && minSum !== Infinity) {
        sumStartEl.value = minSum;
        AppState.sumRangeStart = minSum;
    }
    if (sumEndEl && maxSum !== -Infinity) {
        sumEndEl.value = maxSum;
        AppState.sumRangeEnd = maxSum;
    }
}

/**
 * 날짜 범위 또는 회차 범위 변경 시 통계 및 회차별 당첨번호 업데이트
 */
function updateStatsByDateRange() {
    // console.log('[updateStatsByDateRange] Called');
    const type = getRangeType();

    const startRoundInput = document.getElementById('startRound');
    const endRoundInput = document.getElementById('endRound');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    // 필수 요소 및 데이터 체크
    if (!startRoundInput || !endRoundInput || !startDateInput || !endDateInput) return;
    if (!AppState || !AppState.allLotto645Data) return;

    // 현재 모드에 따른 시작/종료 값 추출
    let sVal, eVal;
    if (type === 'round') {
        sVal = startRoundInput.value.trim();
        eVal = endRoundInput.value.trim();
    } else {
        sVal = startDateInput.value.trim();
        eVal = endDateInput.value.trim();
    }

    if (!sVal || !eVal) {
        alert('시작값과 종료값을 입력해주세요.');
        return;
    }

    let filteredData = [];

    if (type === 'round') {
        const startRound = parseInt(sVal, 10);
        const endRound = parseInt(eVal, 10);

        // console.log(`[Lotto] Filtering by round: ${startRound} ~ ${endRound}`);

        if (isNaN(startRound) || isNaN(endRound)) {
            alert('회차는 숫자로 입력해주세요.');
            return;
        }

        if (startRound > endRound) {
            alert('시작회차가 종료회차보다 클 수 없습니다.');
            return;
        }

        // 회차 필터링
        filteredData = AppState.allLotto645Data.filter(r => r.round >= startRound && r.round <= endRound);
        // console.log(`[Lotto] Filtered result count: ${filteredData.length}`);
    } else {
        const startDate = convertFromYYMMDD(sVal);
        const endDate = convertFromYYMMDD(eVal);

        if (sVal !== '000000' && !startDate) {
            alert('시작일 형식이 올바르지 않습니다.');
            return;
        }
        if (eVal !== '999999' && !endDate) {
            alert('종료일 형식이 올바르지 않습니다.');
            return;
        }
        filteredData = filterDataByDateRange(AppState.allLotto645Data, startDate, endDate);
        // console.log(`[Lotto] Filtered result count (date): ${filteredData.length}`);
    }

    if (filteredData.length === 0) {
        console.warn('[Lotto] No data found for the given range.');
        alert('해당 조건의 데이터가 없습니다.');
        // 빈 데이터로 갱신
        AppState.currentStatsRounds = [];
        updateCurrentStats(); // 통계 초기화
        renderStatsList();
        renderNumberGrid();
        renderViewNumbersList([]);
        updateRoundRangeDisplay();
        return;
    }

    // 상태 업데이트
    AppState.selectedSeqRounds = null;
    const seqFilterEl = document.getElementById('seqFilter');
    if (seqFilterEl) seqFilterEl.value = 'none';
    AppState.seqFilterType = null;

    AppState.currentStatsRounds = filteredData;

    // 통계 재계산
    AppState.winStatsMap = calculateWinStats(filteredData);
    AppState.winStats = Array.from(AppState.winStatsMap.entries())
        .map(([number, count]) => ({ number, count }))
        .sort((a, b) => a.number - b.number);

    AppState.appearanceStatsMap = calculateAppearanceStats(filteredData);

    const winPercentageMap = calculatePercentageStats(AppState.winStatsMap, filteredData.length);
    AppState.winPercentageCache = winPercentageMap;

    const appearancePercentageMap = calculatePercentageStats(AppState.appearanceStatsMap, filteredData.length);
    AppState.appearancePercentageCache = appearancePercentageMap;

    AppState.avgPercentageCache = winPercentageMap;

    const avgCount = filteredData.length > 0
        ? filteredData.reduce((sum, round) => sum + round.numbers.length, 0) / (filteredData.length * 6)
        : 0;
    AppState.avgCountCache = avgCount;

    // UI 업데이트
    updateCurrentStats();
    renderStatsList();
    renderNumberGrid();
    renderViewNumbersList(filteredData);
    updateRoundRangeDisplay();

    // 시작회차~종료회차 사이의 특성을 추출하여 옵션필터에 적용
    extractAndApplyFilters(filteredData);

    // 차트 업데이트: 필터링된 데이터 기반으로 렌더링
    if (typeof renderMonthlyAverageChart === 'function') {
        renderMonthlyAverageChart(filteredData);
    }
}

/**
 * 회차 범위 표시 업데이트 (기존 함수 재구현)
 */
function updateRoundRangeDisplay() {
    const roundStatsList = document.getElementById('roundStatsList');
    const data = AppState.currentStatsRounds || AppState.allLotto645Data;

    if (roundStatsList && data && data.length > 0 && AppState.allLotto645Data) {
        const minRound = data[data.length - 1].round;
        const maxRound = data[0].round;
        const total = data.length;
        const latest = AppState.allLotto645Data[0].round;
        const rangeLabel = (maxRound === latest) ? ' (최신)' : '';

        roundStatsList.innerHTML = `
            <div class="stats-box">
                <div class="stats-section">
                    <div class="stat-label">선택 범위</div>
                    <div class="stat-value">${minRound}회 ~ ${maxRound}회${rangeLabel}</div>
                </div>
                <div class="stats-section" style="margin-top: 8px;">
                    <div class="stat-label">선택 회차수</div>
                    <div class="stat-value">${total}회</div>
                </div>
            </div>
        `;
    }
}

/**
 * 통계 렌더링 (전체 데이터 표시)
 * 중요: AppState.allLotto645Data (원본 Lotto645.csv 데이터)를 기준으로 표시
 */
function renderStats(lotto645Data) {
    const statsList = document.getElementById('statsList');
    const viewNumbersList = document.getElementById('viewNumbersList');

    if (!statsList || !viewNumbersList) {
        return;
    }

    // renderStats는 초기 렌더링용으로 전체 원본 데이터 사용
    // 날짜 필터링은 updateStatsByDateRange 함수에서만 적용
    // 중요: 원본 데이터(AppState.allLotto645Data)는 절대 변경하지 않음

    if (!AppState || !AppState.winStats || AppState.winStats.length === 0) {
        statsList.innerHTML = '<p>통계 데이터가 없습니다.</p>';
        return;
    }

    // 통계 리스트 렌더링
    renderStatsList();

    // 선택공 그리드 렌더링
    renderNumberGrid();

    // 회차 정보 표시 (원본 데이터 기준)
    const roundStatsList = document.getElementById('roundStatsList');
    if (roundStatsList && AppState.allLotto645Data && AppState.allLotto645Data.length > 0) {
        const originalData = AppState.allLotto645Data;
        const minRound = 1;
        const maxRound = AppState.latestRoundApi != null ? AppState.latestRoundApi : originalData[0].round;
        const rangeLabel = AppState.latestRoundApi != null ? ' (동행복권 최신)' : '';
        roundStatsList.innerHTML = `
            <div class="stats-box">
                <div class="stats-section">
                    <div class="stat-label">회차 범위</div>
                    <div class="stat-value">${minRound}회 ~ ${maxRound}회${rangeLabel}</div>
                </div>
                <div class="stats-section" style="margin-top: 8px;">
                    <div class="stat-label">총 회차</div>
                    <div class="stat-value">${originalData.length}회</div>
                </div>
            </div>
        `;
    }

    // 회차별 당첨번호: Lotto645.xlsx에서만 읽은 데이터만 표시 (sumFilterRound 적용)
    const displayData = AppState.allLotto645Data || lotto645Data;
    renderViewNumbersList(displayData);

    // 중앙 패널 업데이트: 선택공 그리드 렌더링
    renderNumberGrid();
}

/**
 * 합계 평균 표시 업데이트 (회차별 당첨번호 패널 헤더에 표시)
 */
/**
 * 합계 평균 표시 업데이트 (회차별 당첨번호 패널 헤더에 표시)
 * [ 0000회 ~ 0000회   [  0000회  기간평균: 000 ]
 */
function updateAverageSumDisplay(data) {
    const statsHeaderDisplay = document.getElementById('statsHeaderDisplay');
    if (!statsHeaderDisplay) return;

    if (!data || data.length === 0) {
        statsHeaderDisplay.textContent = '[ 0000회 ~ 0000회   [  0000회  기간평균: 000 ]';
        return;
    }

    const rounds = data.map(r => Number(r.round)).filter(r => !isNaN(r));
    const startRound = Math.min(...rounds);
    const endRound = Math.max(...rounds);

    const sums = data.map(round => {
        if (!round.numbers || round.numbers.length === 0) return 0;
        return round.numbers.reduce((acc, num) => acc + (num || 0), 0);
    }).filter(s => s > 0);

    const average = sums.length > 0 ? Math.round(sums.reduce((acc, sum) => acc + sum, 0) / sums.length) : 0;
    const count = data.length;

    const startStr = startRound.toString().padStart(4, '0');
    const endStr = endRound.toString().padStart(4, '0');
    const countStr = count.toString().padStart(4, '0');
    const avgStr = average.toString().padStart(3, '0');

    // 요청하신 포맷: [ 0001회 ~ 0100회   0100회   기간평균: 138 ]
    statsHeaderDisplay.textContent = `[ ${startStr}회 ~ ${endStr}회   ${countStr}회   기간평균: ${avgStr} ]`;
}

/**
 * 회차 라인 DOM 생성 (회차별 당첨번호용)
 */
function createRoundLineElement(round) {
    const roundLine = document.createElement('div');
    roundLine.className = 'round-number-line';
    roundLine.style.display = 'flex';
    roundLine.style.alignItems = 'center';
    roundLine.style.justifyContent = 'space-between';
    roundLine.style.gap = '8px';
    roundLine.style.marginBottom = '4px';
    roundLine.style.padding = '0 8px';
    roundLine.style.height = '30px';
    roundLine.style.minHeight = '30px';
    roundLine.style.boxSizing = 'border-box';
    const roundInfo = document.createElement('span');
    roundInfo.style.fontWeight = '400';
    roundInfo.style.fontSize = '0.85rem';
    roundInfo.style.minWidth = '100px';
    roundInfo.style.color = '#000000';
    roundInfo.style.opacity = '1';
    roundInfo.style.display = 'flex';
    roundInfo.style.alignItems = 'center';
    roundInfo.style.gap = '4px';
    const roundNumber = document.createElement('span');
    roundNumber.textContent = String(round.round).padStart(4, '0');
    const roundUnit = document.createElement('span');
    roundUnit.style.fontWeight = '700';
    roundUnit.textContent = '회';
    let formattedDate = '';
    if (round.date != null && round.date !== '') {
        let dateObj = null;
        const strVal = String(round.date).trim();
        if (typeof round.date === 'number' || /^\d{5,}$/.test(strVal)) {
            const serial = typeof round.date === 'number' ? round.date : parseInt(strVal, 10);
            if (!isNaN(serial) && serial >= 1) {
                const utcMs = (serial - 25569) * 86400 * 1000;
                dateObj = new Date(utcMs);
            }
        } else {
            dateObj = parseDate(strVal);
        }
        if (dateObj && dateObj instanceof Date && !isNaN(dateObj.getTime())) {
            formattedDate = formatDateYYMMDD(dateObj);
        } else {
            const str = String(round.date);
            const dateParts = str.split('-');
            if (dateParts.length === 3) {
                const y = dateParts[0].length >= 2 ? dateParts[0].slice(-2) : dateParts[0];
                const m = dateParts[1].padStart(2, '0');
                const d = dateParts[2].padStart(2, '0');
                formattedDate = `${y}/${m}/${d}`;
            } else {
                formattedDate = str;
            }
        }
    }
    const sum = round.numbers.reduce((acc, num) => acc + (num || 0), 0);
    const sumDisplay = document.createElement('span');
    sumDisplay.className = 'round-sum-display';
    sumDisplay.textContent = `[ ${sum.toString().padStart(3, '0')} ] `;
    sumDisplay.style.fontSize = '0.85rem';
    sumDisplay.style.color = '#ff0000';
    sumDisplay.style.fontWeight = 'bold';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'round-date-display';
    dateSpan.textContent = formattedDate;
    roundInfo.appendChild(roundNumber);
    roundInfo.appendChild(roundUnit);
    roundInfo.appendChild(sumDisplay);
    roundInfo.appendChild(dateSpan);
    const numbersContainer = document.createElement('div');
    numbersContainer.style.display = 'flex';
    numbersContainer.style.alignItems = 'center';
    numbersContainer.style.gap = '16px';
    numbersContainer.style.justifyContent = 'flex-end';
    numbersContainer.style.flexWrap = 'wrap';
    numbersContainer.style.marginLeft = 'auto';
    const nums = (round.numbers || []).map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const runs = getConsecutiveRuns(nums, 2);
    const seqSet = new Set(runs.flat());
    round.numbers.forEach(num => {
        const ball = createStatBall(num, 24, '0.9rem');
        if (seqSet.has(parseInt(num, 10))) {
            ball.classList.add('ball-seq3');
        }
        numbersContainer.appendChild(ball);
    });
    if (round.bonus && round.bonus > 0) {
        const plusSign = createPlusSign('color: #000000; font-weight: bold; margin: 0 4px; font-size: 1rem;');
        numbersContainer.appendChild(plusSign);
        const bonusBall = createStatBall(round.bonus, 24, '0.9rem');
        numbersContainer.appendChild(bonusBall);
    }
    roundLine.appendChild(roundInfo);
    roundLine.appendChild(numbersContainer);

    // 클릭 시 상세 정보 모달 표시
    roundLine.style.cursor = 'pointer';
    roundLine.addEventListener('click', function () {
        if (typeof loadAndShowLottoRound === 'function') {
            loadAndShowLottoRound(round.round);
        }
    });

    return roundLine;
}

/**
 * 회차별 당첨번호 목록 렌더링
 * data 인자가 없으면 전체 데이터 사용
 */
/**
 * 회차별 당첨번호 목록 렌더링
 * data 인자가 없으면 전체 데이터 사용
 */

/**
 * 특정 회차(또는 최신) 로또 정보 모달 표시
 * roundNo가 없거나 null이면 최신 회차 조회
 */
async function loadAndShowLottoRound(roundNo) {
    showLatestLottoModal('<div style="text-align:center; padding:20px;"><p>데이터를 불러오는 중입니다...</p></div>');

    try {
        const baseUrl = (typeof getApiBaseUrl === 'function') ? getApiBaseUrl() : '';
        const url = roundNo ? `${baseUrl}/api/lotto-round/${roundNo}` : `${baseUrl}/api/lotto-latest`;

        const res = await fetch(url);
        const data = await res.json().catch(() => ({ returnValue: 'fail' }));

        if (data.returnValue !== 'success' || data.drwNo == null) {
            const errHtml = `<div style="text-align:center; padding:20px;"><p class="error-msg">${data.error || '정보를 가져오지 못했습니다.'}</p></div>`;
            showLatestLottoModal(errHtml);
            return;
        }


        const drwNo = data.drwNo;
        let dateStr = data.drwNoDate || '';

        // 날짜 포맷팅
        if (typeof parseDate === 'function' && typeof formatDateYYMMDD === 'function' && data.drwNoDate) {
            const dateObj = parseDate(String(data.drwNoDate).trim());
            if (dateObj instanceof Date && !isNaN(dateObj)) dateStr = formatDateYYMMDD(dateObj);
        }

        const nums = [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6]
            .filter(n => n != null);
        const bnus = data.bnusNo;

        // 공 색상 클래스 (getBallClass가 있으면 사용)
        const getClass = (typeof getBallClass === 'function') ? getBallClass : (() => '');

        const ballsHtml = nums.map(n =>
            `<span class="latest-draw-ball stat-ball ${getClass(n)}">${n}</span>`
        ).join(' ');

        let bonusHtml = '-';
        if (bnus != null) {
            bonusHtml = `<span style="margin:0 4px;">+</span> <span class="latest-draw-ball stat-ball ${getClass(bnus)}">${bnus}</span>`;
        } else {
            // API가 보너스 번호를 못 가져온 경우, viewNumbersList에서 해당 회차 로컬 데이터 찾기 시도
            // (이 부분은 필수는 아니지만 UX 향상용)
        }

        const fmtAmt = (v) => (v && v !== '(없음)') ? v + '원' : (v || '(없음)');
        const firstWinamntFmt = data.firstWinamntFmt ? fmtAmt(data.firstWinamntFmt) : '(없음)';
        const firstPrzwnerCoFmt = data.firstPrzwnerCoFmt ? (data.firstPrzwnerCoFmt + '명') : '(없음)';
        const firstAccumamntFmt = data.firstAccumamntFmt ? fmtAmt(data.firstAccumamntFmt) : '(없음)';
        const totSellamntFmt = data.totSellamntFmt ? fmtAmt(data.totSellamntFmt) : '(없음)';

        let tableHtml = `
            <table class="lotto-round-detail-table" style="width:100%; border-collapse: collapse; margin-top:10px;">
                <tbody>
                    <tr><th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">당첨회차</th><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${drwNo}회</td></tr>
                    <tr><th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">추첨일</th><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${dateStr}</td></tr>
                    <tr><th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">당첨번호</th><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${ballsHtml}</td></tr>
                    <tr><th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">보너스번호</th><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${bnus != null ? `<span class="latest-draw-ball stat-ball ${getClass(bnus)}">${bnus}</span>` : '-'}</td></tr>
                    <tr><th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">1등 당첨금액</th><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${data.firstWinamntFmt || '(없음)'}</td></tr>
                    <tr><th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">1등 당첨자 수</th><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${data.firstPrzwnerCoFmt || '(없음)'}</td></tr>
                    <tr><th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">1등 총당첨금액</th><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${data.firstAccumamntFmt || '(없음)'}</td></tr>
                    <tr><th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">전체 당첨상금 총액</th><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${data.totSellamntFmt || '(없음)'}</td></tr>
                </tbody>
            </table>
        `;

        const source = data.source || '동행복권';
        tableHtml += `<p class="latest-draw-source" style="text-align:right; font-size:0.8rem; color:#666; margin-top:10px;">출처: ${source}</p>`;

        showLatestLottoModal(tableHtml);

    } catch (e) {
        showLatestLottoModal(`<div style="text-align:center; padding:20px;"><p class="error-msg">요청 실패: ${e.message || String(e)}</p></div>`);
    }
}

function getRoundSum(r) {
    if (!r.numbers || r.numbers.length === 0) return 0;
    return r.numbers.reduce((acc, num) => acc + (num || 0), 0);
}
/**
 * 회차별 당첨번호 목록 렌더링
 * 000=회차 올림차순, 999=회차 내림차순, 777=당첨합계 올림차순, 888=당첨합계 내림차순, 21~255=동일당첨합계
 */
function renderViewNumbersList(baseData) {
    if (!AppState) AppState = {};
    AppState.currentViewNumbersBaseData = baseData;
    const viewNumbersList = document.getElementById('viewNumbersList');
    const sumFilterInput = document.getElementById('sumFilterRound');
    if (!viewNumbersList) return;

    // data가 있으면(필터링된 데이터) 그대로 사용, 없으면 전체 데이터 사용
    let listData = baseData || AppState.currentStatsRounds || AppState.allLotto645Data;

    if (!listData || listData.length === 0) {
        viewNumbersList.innerHTML = '<p>데이터가 없습니다.</p>';
        updateAverageSumDisplay([]);
        return;
    }

    if (sumFilterInput) {
        sumFilterInput.min = 0;
        sumFilterInput.max = 9999; // 회차 검색을 위해 최대값 증가
        sumFilterInput.title = '000=회차↑ 999=회차↓ 777=합계↑ 888=합계↓ 21~255=동일합계 256+=해당회차';
    }

    let filterVal = 999;
    if (sumFilterInput && sumFilterInput.value !== '' && !isNaN(parseInt(sumFilterInput.value, 10))) {
        filterVal = parseInt(sumFilterInput.value, 10);
    }

    let toDisplay;
    // 000, 999, 777, 888은 정렬 명령
    if (filterVal === 999 || filterVal === 0 || filterVal === 777 || filterVal === 888) {
        toDisplay = listData;
    }
    // 21~255는 합계 필터
    else if (filterVal >= 21 && filterVal <= 255) {
        toDisplay = listData.filter(r => {
            if (!r.numbers || r.numbers.length === 0) return false;
            const s = r.numbers.reduce((acc, num) => acc + (num || 0), 0);
            return s === filterVal;
        });
    }
    // 256 이상은 회차 검색 (단, 777/888/999 제외)
    else if (filterVal > 255) {
        // 전체 데이터에서 검색할지, 현재 리스트에서 검색할지 결정
        // 사용성상 전체 데이터(AppState.allLotto645Data)에서 찾는 것이 유리할 수 있음
        const sourceData = AppState.allLotto645Data || listData;
        toDisplay = sourceData.filter(r => r.round === filterVal);
    }
    else {
        toDisplay = listData;
    }

    viewNumbersList.innerHTML = '';
    if (toDisplay.length === 0) {
        viewNumbersList.innerHTML = '<p>해당 조건에 맞는 회차가 없습니다.</p>';
        updateAverageSumDisplay([]);
        return;
    }

    const INITIAL_DISPLAY_COUNT = 50;

    // 정렬 로직
    let sortedRounds;
    if (filterVal === 0) {
        // 회차 오름차순
        sortedRounds = [...toDisplay].sort((a, b) => a.round - b.round);
    } else if (filterVal === 777) {
        // 합계 오름차순
        sortedRounds = [...toDisplay].sort((a, b) => {
            const sa = getRoundSum(a), sb = getRoundSum(b);
            return sa !== sb ? sa - sb : a.round - b.round;
        });
    } else if (filterVal === 888) {
        // 합계 내림차순
        sortedRounds = [...toDisplay].sort((a, b) => {
            const sa = getRoundSum(a), sb = getRoundSum(b);
            return sa !== sb ? sb - sa : b.round - a.round;
        });
    } else {
        // 기본: 회차 내림차순 (999 포함)
        sortedRounds = [...toDisplay].sort((a, b) => b.round - a.round);
    }

    AppState.currentViewRounds = sortedRounds; // AI 분석 참고용으로 저장

    // 초기 렌더링 (최대 50개)
    const initialBatch = sortedRounds.slice(0, INITIAL_DISPLAY_COUNT);
    initialBatch.forEach(round => {
        viewNumbersList.appendChild(createRoundLineElement(round));
    });

    // 나머지 데이터는 백그라운드(requestAnimationFrame)에서 점진적 렌더링
    if (sortedRounds.length > INITIAL_DISPLAY_COUNT) {
        let currentIndex = INITIAL_DISPLAY_COUNT;
        const CHUNK_SIZE = 30; // 30개씩 끊어서 렌더링

        function renderNextChunk() {
            if (currentIndex >= sortedRounds.length) return;

            const fragment = document.createDocumentFragment();
            const nextIndex = Math.min(currentIndex + CHUNK_SIZE, sortedRounds.length);

            for (let i = currentIndex; i < nextIndex; i++) {
                fragment.appendChild(createRoundLineElement(sortedRounds[i]));
            }
            viewNumbersList.appendChild(fragment);
            currentIndex = nextIndex;

            if (currentIndex < sortedRounds.length) {
                // 다음 프레임에 계속 렌더링 (UI 블로킹 방지)
                requestAnimationFrame(renderNextChunk);
            }
        }

        // 초기 렌더링 직후 살짝 지연 후 백그라운드 렌더링 시작
        setTimeout(() => requestAnimationFrame(renderNextChunk), 50);
    }

    updateAverageSumDisplay(toDisplay);
}

/** 최신 추첨정보 모달 (회차별 당첨번호 클릭 시 · 동행복권 파싱 결과) */
function showLatestLottoModal(htmlContent) {
    const modal = document.getElementById('latestLottoModal');
    const content = document.getElementById('latestLottoModalContent');
    if (modal && content) {
        content.innerHTML = htmlContent;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    }
}
function hideLatestLottoModal() {
    const modal = document.getElementById('latestLottoModal');
    if (modal) {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    }
}

(function setupLatestLottoClick() {
    const titleEl = document.getElementById('roundNumbersTitle');
    if (!titleEl) return;
    titleEl.style.cursor = 'pointer';

    const closeBtn = document.getElementById('latestLottoModalClose');
    if (closeBtn) closeBtn.addEventListener('click', hideLatestLottoModal);

    const modal = document.getElementById('latestLottoModal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) hideLatestLottoModal(); });

    titleEl.addEventListener('click', () => {
        if (typeof loadAndShowLottoRound === 'function') {
            loadAndShowLottoRound(null); // 최신 회차 조회
        }
    });
})();

// 하단 영역 토글 및 드래그 제어
function setupFooterToggle() {
    const footer = document.getElementById('mainFooter');
    const bottomArea = document.getElementById('bottomArea');
    const dragHandle = document.getElementById('bottomDragHandle');
    if (!footer || !bottomArea) return;

    // 1. 토글 기능
    footer.addEventListener('click', () => {
        const isHidden = bottomArea.style.display === 'none';
        if (isHidden) {
            bottomArea.style.display = 'block';
            if (AppState.allLotto645Data && typeof renderMonthlyAverageChart === 'function') {
                renderMonthlyAverageChart(AppState.allLotto645Data);
            }
        } else {
            bottomArea.style.display = 'none';
        }
    });

    // 2. 상하 드래그 기능
    if (dragHandle) {
        let isDragging = false;
        let startY, startBottom;

        dragHandle.addEventListener('mousedown', e => {
            isDragging = true;
            startY = e.clientY;
            // 현재 bottom 값 가져오기 (없으면 50px)
            const style = window.getComputedStyle(bottomArea);
            startBottom = parseInt(style.bottom, 10) || 50;

            bottomArea.style.transition = 'none'; // 드래그 시 애니메이션 방지
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!isDragging) return;

            const deltaY = startY - e.clientY; // 위로 드래그하면 양수
            let newBottom = startBottom + deltaY;

            // 경계 제한: 헤더(100px)와 푸터(50px)를 침범하지 않도록 설정
            const minBottom = 50; // 푸터 높이
            const headerHeight = 100; // 헤더 높이
            const maxBottom = window.innerHeight - headerHeight - bottomArea.offsetHeight;

            if (newBottom < minBottom) newBottom = minBottom;
            if (newBottom > maxBottom) newBottom = maxBottom;

            bottomArea.style.bottom = newBottom + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                bottomArea.style.transition = '';
                document.body.style.cursor = '';
            }
        });
    }
}

// 모든 리소스가 로드된 후 초기화 실행
window.addEventListener('load', () => {
    setTimeout(function () {
        try {
            initializeApp();
            initAIChat();
            setupRangeTypeSelectors();
            setupFooterToggle(); // 토글 기능 초기화
        } catch (e) {
            console.error('[로또] initializeApp 예외:', e);
        }
    }, 100);
});

// --- AI 챗봇 기능 ---
function initAIChat() {
    const chatBtn = document.getElementById('aiChatButton');
    const chatModal = document.getElementById('aiChatModal');
    const closeBtn = document.getElementById('aiChatClose');
    const sendBtn = document.getElementById('aiChatSend');
    const input = document.getElementById('aiChatInput');
    const chatBody = document.getElementById('aiChatBody');

    if (!chatBtn || !chatModal) return;

    // 1. 모달 열기/닫기
    chatBtn.addEventListener('click', () => {
        const isHidden = chatModal.style.display === 'none' || chatModal.style.display === '';

        if (isHidden) {
            // 처음 열릴 때 위치 자동 조정 (첨부 이미지처럼 좌측 패널 중앙, 필터 버튼 아래)
            if (!chatModal.style.left || !chatModal.style.top) {
                const statsPanel = document.getElementById('statsPanel');
                if (statsPanel) {
                    const rect = statsPanel.getBoundingClientRect();
                    const modalWidth = chatModal.offsetWidth || 350;

                    // 1. 수평: 좌측 패널의 정중앙
                    let calcLeft = rect.left + (rect.width - modalWidth) / 2;
                    if (calcLeft < 10) calcLeft = 10; // 화면 왼쪽 이탈 방지

                    // 2. 수직: 정렬/필터 박스(.stats-sort) 바로 아래
                    let calcTop = 200; // fallback
                    const sortBox = statsPanel.querySelector('.stats-sort');
                    if (sortBox) {
                        const sortRect = sortBox.getBoundingClientRect();
                        calcTop = sortRect.bottom + 10;
                    } else {
                        // dateRangeBox fallback
                        const dateBox = statsPanel.querySelector('#dateRangeBox');
                        if (dateBox) {
                            calcTop = dateBox.getBoundingClientRect().bottom + 50;
                        } else {
                            calcTop = rect.top + 150;
                        }
                    }

                    chatModal.style.left = calcLeft + 'px';
                    chatModal.style.top = calcTop + 'px';

                    // CSS fixed 위치 간섭 제거
                    chatModal.style.right = 'auto';
                    chatModal.style.bottom = 'auto';
                }
            }
            chatModal.style.display = 'flex';

            // 안내 메시지 업데이트
            const startRound = document.getElementById('startRound')?.value;
            const endRound = document.getElementById('endRound')?.value;
            const systemMsg = chatBody.querySelector('.ai-message.system');
            if (systemMsg) {
                if (startRound && endRound) {
                    systemMsg.innerHTML = `안녕하세요! 현재 설정된 <b>${startRound}회 ~ ${endRound}회</b> 데이터를 기반으로 로또 번호를 분석해 드립니다.<br>궁금한 점을 물어보세요.`;
                } else if (AppState.currentViewRounds && AppState.currentViewRounds.length > 0) {
                    const count = AppState.currentViewRounds.length;
                    const displayCount = count > 30 ? 30 : count;
                    systemMsg.innerHTML = `안녕하세요! 우측 패널에 조회된 데이터를 기반으로(최신 ${displayCount}회차 참고) 로또 번호를 분석해 드립니다.<br>궁금한 점을 물어보세요.`;
                } else {
                    systemMsg.innerHTML = `안녕하세요! 데이터를 기반으로 로또 번호를 분석해 드립니다.<br>궁금한 점을 물어보세요.`;
                }
            }

            input.focus();
        } else {
            chatModal.style.display = 'none';
        }
    });

    closeBtn.addEventListener('click', () => {
        chatModal.style.display = 'none';
    });

    // 2. 메시지 전송
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // 사용자 메시지 표시
        addMessage(text, 'user');
        input.value = '';

        // 로딩 표시
        const loadingId = addMessage('분석 중입니다...', 'loading');

        // 현재 설정된 시작/종료 회차 가져오기
        const startRound = document.getElementById('startRound')?.value;
        const endRound = document.getElementById('endRound')?.value;

        try {
            const response = await fetch('/api/ask-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: text,
                    startRound: startRound,
                    endRound: endRound,
                    targetRounds: AppState.currentViewRounds ? AppState.currentViewRounds.map(r => r.round) : null
                })
            });
            const data = await response.json();

            // 로딩 제거
            removeMessage(loadingId);

            if (data.returnValue === 'success') {
                addMessage(data.answer, 'system');
            } else {
                addMessage('오류가 발생했습니다: ' + (data.error || '알 수 없는 오류'), 'system');
            }
        } catch (e) {
            removeMessage(loadingId);
            addMessage('서버 통신 오류: ' + e.message, 'system');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `ai-message ${type}`;
        div.textContent = text;
        div.id = 'msg-' + Date.now();
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
        return div.id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // 3. 드래그 기능 (헤더 잡고 이동)
    const header = document.getElementById('aiChatHeader');
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - chatModal.getBoundingClientRect().left;
        offsetY = e.clientY - chatModal.getBoundingClientRect().top;
        chatModal.style.transition = 'none'; // 드래그 중엔 부드러운 효과 끔
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        // 화면 밖으로 나가지 않게 제한 (선택사항)
        const maxX = window.innerWidth - chatModal.offsetWidth;
        const maxY = window.innerHeight - chatModal.offsetHeight;

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX > maxX) newX = maxX;
        if (newY > maxY) newY = maxY;

        chatModal.style.left = newX + 'px';
        chatModal.style.top = newY + 'px';

        // bottom, right 속성 해제 (left, top으로 제어하기 위함)
        chatModal.style.bottom = 'auto';
        chatModal.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        chatModal.style.transition = ''; // 드래그 끝나면 다시 효과 켬
    });
}


/**
 * 회차별 당첨 합계 막대그래프 렌더링
 */
function renderMonthlyAverageChart(currentData) {
    const ctx = document.getElementById('averageSumChart');
    // 전체 범위를 알기 위해 AppState.allLotto645Data가 필수입니다.
    if (!ctx || !AppState.allLotto645Data || AppState.allLotto645Data.length === 0) return;

    // 1. 전체 데이터 가공: 회차별 정렬 (1회 -> 최종회)
    const fullData = [...AppState.allLotto645Data].sort((a, b) => a.round - b.round);

    // 현재 표시해야 할 데이터 (필터링된 데이터)
    const displayData = currentData || AppState.currentStatsRounds || AppState.allLotto645Data;
    const filterSet = new Set(displayData.map(r => r.round));

    const labels = fullData.map(r => `${r.round}회`);
    const roundSums = fullData.map(r => {
        if (filterSet.has(r.round)) {
            return (r.numbers || []).reduce((acc, num) => acc + (num || 0), 0);
        }
        return null; // 선택되지 않은 회차는 그리지 않음
    });

    // 2. 현재 선택된 데이터 기반 평균 계산
    const validSums = roundSums.filter(s => s !== null);
    const overallAverage = validSums.length > 0
        ? parseFloat((validSums.reduce((acc, sum) => acc + sum, 0) / validSums.length).toFixed(1))
        : 0;

    // 3. 차트 너비 계산 및 스크롤바 설정을 위한 wrapper 처리
    const chartWrapper = document.getElementById('chartWrapper');
    const bottomUnifiedContent = document.getElementById('bottomUnifiedContent');
    if (chartWrapper) {
        // 회차당 고정 6px 유지
        const fixedBarWidth = 6;
        const calculatedWidth = labels.length * fixedBarWidth;
        chartWrapper.style.width = calculatedWidth + 'px';

        // 캔버스 크기 강제 동기화
        ctx.width = calculatedWidth;
        ctx.height = chartWrapper.offsetHeight;

        // 필터링된 데이터가 있다면 해당 위치로 스크롤
        setTimeout(() => {
            if (bottomUnifiedContent && displayData.length > 0) {
                const firstRound = Math.min(...displayData.map(r => r.round));
                const firstIdx = fullData.findIndex(r => r.round === firstRound);
                if (firstIdx !== -1) {
                    // 선택된 데이터의 시작 지점으로 스크롤 (약간의 여유를 위해 앞으로 조금 당김)
                    bottomUnifiedContent.scrollLeft = Math.max(0, (firstIdx * fixedBarWidth) - 20);
                }
            } else if (bottomUnifiedContent) {
                // 전체 데이터일 경우 끝(최신회차)으로 스크롤
                bottomUnifiedContent.scrollLeft = bottomUnifiedContent.scrollWidth;
            }
        }, 100);
    }

    // 4. Y축 범위 (이론적 최소 21 ~ 최대 255)
    const yMin = 21;
    const yMax = 255;

    // 4. 기존 차트가 있으면 파괴
    if (window.lottoAverageChart) {
        window.lottoAverageChart.destroy();
    }

    // 5. 차트 생성
    window.lottoAverageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '회차별 합계',
                    data: roundSums,
                    backgroundColor: '#aeb9c7', // 스테일 블루 그레이
                    borderColor: '#94a3b8',
                    borderWidth: 1,
                    hoverBackgroundColor: '#000000', // 진한 검정
                    hoverBorderColor: '#000000',
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                    zIndex: 1
                },
                {
                    label: `선택 평균 (${overallAverage})`,
                    type: 'line',
                    data: new Array(labels.length).fill(overallAverage),
                    borderColor: '#ff0000',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    zIndex: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 0
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            if (context.parsed.y === null) return null;
                            if (context.datasetIndex === 0) {
                                return `합계: ${context.parsed.y}`;
                            }
                            return `선택 평균: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        callback: function (value) {
                            const label = this.getLabelForValue(value);
                            const roundNum = parseInt(label);
                            return (roundNum % 50 === 0) ? label : '';
                        },
                        autoSkip: false,
                        maxRotation: 0,
                        font: { size: 10 },
                        color: '#666'
                    }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    ticks: {
                        stepSize: 10,
                        font: { size: 10 }
                    },
                    grid: { color: '#eee' }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
                axis: 'x'
            }
        }
    });
}

/** 회차 데이터로부터 Date 객체 추출 유틸리티 */
function getRoundDateObject(round) {
    if (!round.date) return null;
    const strVal = String(round.date).trim();
    if (typeof round.date === 'number' || /^\d{5,}$/.test(strVal)) {
        const serial = typeof round.date === 'number' ? round.date : parseInt(strVal, 10);
        if (!isNaN(serial) && serial >= 1) {
            const utcMs = (serial - 25569) * 86400 * 1000;
            return new Date(utcMs);
        }
    }
    return parseDate(strVal);
}

if (document.readyState === 'complete') {
    setTimeout(initializeApp, 200);
}
