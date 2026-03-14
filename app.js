/** ShareHarmony · MyRisk 팔레트 (동행볼 제외, UI 일관용) — Common 기준 */
const SHAREHARMONY_PALETTE = {
    /* Brand / Navigation */
    primary: '#263238',
    primaryNavy: '#263238',
    primaryDark: '#1B2631',
    accent: '#5A6E7A',
    accentDark: '#37474F',
    accentLight: '#B0BEC5',
    /* 입금 / 출금 */
    income: '#1565C0',
    expense: '#C62828',
    incomeLight: '#90CAF5',
    expenseLight: '#EF9A9A',
    /* 텍스트 / 배경 */
    textPrimary: '#1A1A1A',
    textSecondary: '#334155',
    textMuted: '#5A6872',
    textDisabled: '#B5A5A8',
    pageBg: '#F0F2F5',
    white: '#FFFFFF',
    black: '#000000',
    bgLight: '#F0F2F5',
    bgLighter: '#E2E6EA',
    /* 테이블 기본값 */
    tableHeader: '#455A64',
    tableStripe: '#F7F8FA',
    tableHover: '#D8EAFE',
    tableSumRow: '#E2E8F0',
    /* 바디 / 상태 */
    border: '#D5DAE0',
    borderLight: '#E2E6EA',
    warning: '#E67E22',
    golden: '#F39C12',
    goldenLight: '#FDEBD0',
    goldenDark: '#D4860B',
    goldenTicket: '#D4AF37',
    error: '#C62828',
    /* 기본 3색 */
    myBankBlue: '#1565C0',
    myBankDark: '#0A3D91',
    myCardPurple: '#6A1B9A',
    myCardDark: '#38006B',
    myCashOrange: '#E65100',
    /* 호환 별칭 */
    greenAccent: '#5A6E7A',
    greenBtn: '#1565C0',
    greenBtnDark: '#0A3D91',
    aiOrange: '#E65100',
    aiOrangeBorder: '#BF360C',
    selectionBorder: '#1565C0'
};

/** API 서버 베이스 URL 가져오기 */
function getApiBaseUrl() {
    return window.location.origin;
}

function shutdownServer() {
    if (!confirm('서버를 종료하시겠습니까?')) return;
    fetch(getApiBaseUrl() + '/api/shutdown', { method: 'POST' })
        .then(() => {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:1.2rem;color:#334155;">서버가 종료되었습니다. 이 탭을 닫아주세요.</div>';
        })
        .catch(() => {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:1.2rem;color:#334155;">서버가 종료되었습니다. 이 탭을 닫아주세요.</div>';
        });
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
// → 단, updateStatsByDateRange 등에서 동기적으로 호출하므로 아래에 직접 구현합니다.

/**
 * 당첨번호(보너스 제외) 기준 번호별 출현 횟수 Map 반환
 */
function calculateWinStats(rounds) {
    const map = new Map();
    for (let i = 1; i <= 45; i++) map.set(i, 0);
    (rounds || []).forEach(r => {
        (r.numbers || []).forEach(n => {
            const num = parseInt(n, 10);
            if (num >= 1 && num <= 45) map.set(num, (map.get(num) || 0) + 1);
        });
    });
    return map;
}

/**
 * 보너스 포함 전체 출현 횟수 Map 반환
 */
function calculateAppearanceStats(rounds) {
    const map = new Map();
    for (let i = 1; i <= 45; i++) map.set(i, 0);
    (rounds || []).forEach(r => {
        (r.numbers || []).forEach(n => {
            const num = parseInt(n, 10);
            if (num >= 1 && num <= 45) map.set(num, (map.get(num) || 0) + 1);
        });
        if (r.bonus) {
            const b = parseInt(r.bonus, 10);
            if (b >= 1 && b <= 45) map.set(b, (map.get(b) || 0) + 1);
        }
    });
    return map;
}

/**
 * 출현 횟수 Map → 백분율 Map 반환
 */
function calculatePercentageStats(statsMap, totalRounds) {
    const map = new Map();
    let totalCount = 0;
    statsMap.forEach((count) => { totalCount += count; });
    if (totalCount === 0) return map;
    statsMap.forEach((count, num) => {
        map.set(num, (count / totalCount) * 100);
    });
    return map;
}

/**
 * 통계 데이터 초기화
 * @param {Array} lottoData - 로또 데이터 배열
 */
async function initializeStats(lottoData) {
    if (!lottoData) return;

    // 당첨공(회차별 당첨번호)은 이 데이터만 사용 (Lotto645.xlsx 전용, API 병합 없음)
    AppState.allLotto645Data = lottoData;
    AppState._pastWinKeySet = null;
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

    // statistics.js의 initializeStatistics 함수를 사용하여 통계 계산 (Web Worker)
    if (typeof initializeStatistics === 'function') {
        try {
            const stats = await initializeStatistics(lottoData, LOTTO_CONSTANTS.MAX_NUMBER);

            // AppState 업데이트
            AppState.winStatsMap = stats.winStatsMap;
            AppState.appearanceStatsMap = stats.appearanceStatsMap;
            AppState.consecutiveStatsMap = calculateConsecutiveStats(lottoData);
            AppState.winPercentageCache = stats.winPercentageMap;
            AppState.appearancePercentageCache = stats.appearancePercentageMap;
            AppState.overallHotColdCache = stats.hotCold;

            // winStats 배열 생성 (정렬)
            AppState.winStats = Array.from(AppState.winStatsMap.entries())
                .map(([number, count]) => ({ number, count }))
                .sort((a, b) => a.number - b.number);

            // 기존 호환성을 위해 avgPercentageCache 설정
            AppState.avgPercentageCache = stats.winPercentageMap;
        } catch (error) {
            console.error('Error initializing statistics with Web Worker:', error);
            alert('통계 데이터를 계산하는 중 오류가 발생했습니다. 일부 기능이 제대로 동작하지 않을 수 있습니다.');
            // 실패 시에도 기본적인 AppState는 유지되도록 수동으로 초기화
            AppState.winStatsMap = new Map();
            AppState.appearanceStatsMap = new Map();
            // ... 등등
        }
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
 * 핫/콜 번호 정렬 및 분류
 * 정렬 기준: 1) 당첨횟수(보너스 제외) 내림차순, 2) 출현횟수(보너스 포함) 내림차순, 3) 번호 오름차순
 * 핫: 상위 23개 (최다빈도순), 콜: 하위 22개 (최소빈도순)
 */
/**
 * 번호별 연속 출현 횟수 Map 반환 (각 번호가 연속쌍의 일부로 등장한 횟수)
 */
function calculateConsecutiveStats(rounds) {
    const map = new Map();
    for (let i = 1; i <= 45; i++) map.set(i, 0);
    (rounds || []).forEach(r => {
        const nums = (r.numbers || []).map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        for (let j = 0; j < nums.length - 1; j++) {
            if (nums[j + 1] === nums[j] + 1) {
                map.set(nums[j], (map.get(nums[j]) || 0) + 1);
                map.set(nums[j + 1], (map.get(nums[j + 1]) || 0) + 1);
            }
        }
    });
    return map;
}

function sortAndSplitHotCold(winStatsMap, appearanceStatsMap, consecutiveStatsMap) {
    var seqMap = consecutiveStatsMap || new Map();
    var sorted = Array.from(winStatsMap.entries())
        .map(function (e) {
            return { number: e[0], count: e[1], appCount: (appearanceStatsMap && appearanceStatsMap.get(e[0])) || 0, seqCount: seqMap.get(e[0]) || 0 };
        })
        .sort(function (a, b) {
            if (b.count !== a.count) return b.count - a.count;
            if (b.appCount !== a.appCount) return b.appCount - a.appCount;
            if (b.seqCount !== a.seqCount) return b.seqCount - a.seqCount;
            return b.number - a.number;
        });
    var hot = sorted.slice(0, 23).map(function (s) { return s.number; });
    var cold = sorted.slice(23).reverse().map(function (s) { return s.number; });
    return { hot: hot, cold: cold };
}

/**
 * 전체 데이터를 기준으로 한 핫/콜 번호 계산 및 반환
 */
function getOverallHotColdNumbers() {
    if (!AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return { hot: [], cold: [] };
    }
    if (AppState.overallHotColdCache) return AppState.overallHotColdCache;

    var winMap = calculateWinStats(AppState.allLotto645Data);
    var appMap = calculateAppearanceStats(AppState.allLotto645Data);
    var seqMap = calculateConsecutiveStats(AppState.allLotto645Data);
    AppState.overallHotColdCache = sortAndSplitHotCold(winMap, appMap, seqMap);
    return AppState.overallHotColdCache;
}

/**
 * 1회 ~ targetRound 직전까지의 데이터로 핫/콜 번호 계산
 */
function getHotColdNumbersBeforeRound(targetRound) {
    if (!AppState.allLotto645Data || AppState.allLotto645Data.length === 0) {
        return { hot: [], cold: [] };
    }
    var filtered = AppState.allLotto645Data.filter(r => r.round < targetRound);
    if (filtered.length === 0) return { hot: [], cold: [] };
    var winMap = calculateWinStats(filtered);
    var appMap = calculateAppearanceStats(filtered);
    var seqMap = calculateConsecutiveStats(filtered);
    return sortAndSplitHotCold(winMap, appMap, seqMap);
}

/**
 * 현재 조회 범위 데이터를 기준으로 한 핫/콜 번호 계산 및 반환
 */
function getHotColdNumbers() {
    var data = AppState.currentStatsRounds || AppState.allLotto645Data;
    if (!data || data.length === 0) {
        return { hot: [], cold: [] };
    }
    var winMap = calculateWinStats(data);
    var appMap = calculateAppearanceStats(data);
    var seqMap = calculateConsecutiveStats(data);
    return sortAndSplitHotCold(winMap, appMap, seqMap);
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

    // "4-2", "3-3" 등 UI 값 처리 추가
    if (typeof AppState.activeFilters.oddEven === 'string' && AppState.activeFilters.oddEven.includes('-')) {
        const parts = AppState.activeFilters.oddEven.split('-');
        if (parts.length === 2) {
            const odd = parseInt(parts[0], 10);
            const even = parseInt(parts[1], 10);
            if (!isNaN(odd) && !isNaN(even)) return { oddCount: odd, evenCount: even };
        }
    }
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
function pickSix(excludeNumbers = []) {
    const pool = shuffledPool(false, false);
    const poolSet = new Set(pool);
    let filteredPool = pool;

    if (excludeNumbers.length > 0) {
        const exSet = new Set(excludeNumbers);
        filteredPool = filteredPool.filter(n => !exSet.has(n));
    }

    if (isStatFilter(AppState.activeFilters.statFilter)) {
        const highCountNumbers = new Set(getFilteredNumbersByCount(true));
        filteredPool = filteredPool.filter(n => highCountNumbers.has(n));
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
        return SHAREHARMONY_PALETTE.black;
    } else {
        return SHAREHARMONY_PALETTE.white;
    }
}

/**
 * 통계용/게임용 공 생성 (ShareHarmony 스타일 적용)
 */
/**
 * 번호에 따른 동행복권 컬러 클래스 반환
 */
function getBallColorClass(num) {
    if (num <= 10) return "color-yellow";
    if (num <= 20) return "color-blue";
    if (num <= 30) return "color-red";
    if (num <= 40) return "color-gray";
    return "color-green";
}

function createStatBall(num, size = 22, fontSize = "0.8rem", isNonMatching = false) {
    const ball = document.createElement("div");

    // 기본 클래스: 가변 크기(CSS --ball-size). 작은 공은 stat-ball--sm
    const isSmall = size <= 28;
    ball.className = "stat-ball " + getBallColorClass(num) + (isSmall ? " stat-ball--sm" : "");

    if (isNonMatching) {
        ball.style.backgroundColor = SHAREHARMONY_PALETTE.primaryNavy;
        ball.style.color = SHAREHARMONY_PALETTE.white;
    } else {
        if (AppState.goldenNumbers && AppState.goldenNumbers.has(num)) {
            ball.classList.add('golden');
        }
    }

    ball.textContent = num;
    return ball;
}

/**
 * 플러스 기호 생성
 */
function createPlusSign(style = "color: " + SHAREHARMONY_PALETTE.golden + "; font-weight: bold; margin: 0 2px;") {
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

        const lotto645Data = await loadFunc();
        AppState.previousDataCount = lotto645Data ? lotto645Data.length : 0;
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
        await initializeStats(lotto645Data);

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

            // 날짜 입력 필드 포맷 자동 정리 (blur 시): 조회기간 yy/mm/dd 검증 및 치환
            startDateInput.addEventListener('blur', function () {
                let value = this.value.trim();
                if (!value) {
                    updateRoundDisplay();
                    return;
                }

                // 8자리, 00000000, yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd 치환
                const normalized = normalizeToYYMMDD(value);
                if (normalized !== null) {
                    this.value = normalized;
                    value = normalized;
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

                // yy/mm/dd 형식인 경우: 검증 후 정규화
                const yymmddCheck = validateYYMMDDInput(value);
                if (!yymmddCheck.valid) {
                    if (value.includes('/') || /^\d{6,8}$/.test(value.replace(/\D/g, ''))) {
                        alert(yymmddCheck.message || '조회기간은 yy/mm/dd 형식으로 입력해 주세요.');
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                }
                const date = parseDate(value);
                if (date && date !== '000000' && date !== '999999') {
                    this.value = formatDateYYMMDD(date);
                    updateRoundDisplay();
                    updateRoundRangeDisplay();
                    if (!validateDateRange()) {
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                } else {
                    alert('날짜 또는 회차 형식이 올바르지 않습니다. (조회기간: yy/mm/dd)');
                    this.value = '';
                    updateRoundDisplay();
                }
            });

            endDateInput.addEventListener('blur', function () {
                let value = this.value.trim();
                if (!value) {
                    updateRoundDisplay();
                    return;
                }

                // 8자리, 00000000, yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd 치환
                const normalized = normalizeToYYMMDD(value);
                if (normalized !== null) {
                    this.value = normalized;
                    value = normalized;
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

                // yy/mm/dd 형식인 경우: 검증 후 정규화
                const yymmddCheckEnd = validateYYMMDDInput(value);
                if (!yymmddCheckEnd.valid) {
                    if (value.includes('/') || /^\d{6,8}$/.test(value.replace(/\D/g, ''))) {
                        alert(yymmddCheckEnd.message || '조회기간은 yy/mm/dd 형식으로 입력해 주세요.');
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                }
                const date = parseDate(value);
                if (date && date !== '000000' && date !== '999999') {
                    this.value = formatDateYYMMDD(date);
                    updateRoundDisplay();
                    updateRoundRangeDisplay();
                    if (!validateDateRange()) {
                        this.value = '';
                        updateRoundDisplay();
                        return;
                    }
                } else {
                    alert('날짜 또는 회차 형식이 올바르지 않습니다. (조회기간: yy/mm/dd)');
                    this.value = '';
                    updateRoundDisplay();
                }
            });

            // 입력 중 실시간 변환: 8자리, 00000000, yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd 치환
            function applyDateInputFormat(el) {
                const value = el.value.trim();
                const normalized = normalizeToYYMMDD(value);
                if (normalized !== null && normalized !== value) {
                    el.value = normalized;
                    updateRoundRangeDisplay();
                }
            }

            startDateInput.addEventListener('input', function () {
                applyDateInputFormat(this);
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
                applyDateInputFormat(this);
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

                // 6자리 숫자 입력 완료 시 날짜로 변환
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

        // 기본값 설정 (1회차 ~ 최신 회차)
        if (lotto645Data.length > 0) {
            const startRoundInput = document.getElementById('startRound');
            const endRoundInput = document.getElementById('endRound');
            const maxRound = lotto645Data[0].round;
            if (startRoundInput) startRoundInput.value = 1;
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

        // 필터 이벤트 리스너 설정
        setupFilterListeners();

        // [ShareHarmony] 마스터 생성 버튼 리스너 추가
        const masterGenBtn = document.getElementById('masterGenerateBtn');
        if (masterGenBtn) {
            masterGenBtn.addEventListener('click', generateGoldenAiGames);
        }

        // 게임박스 초기화
        initializeGameBox();
        // 구간선택 기본값 반영 및 3자리만 입력·가운데 정렬
        const sumStartEl = document.getElementById('filterAvgLow');
        const sumEndEl = document.getElementById('filterAvgHigh');
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
        await loadAndDisplayResults();

        // 선택삭제 버튼 설정
        setupDeleteSelectedButton();

        // 애플리케이션 초기화 완료 이벤트 발생 (다른 스크립트에서 사용 가능)
        if (typeof window.onAppInitialized === 'function') {
            window.onAppInitialized();
        }

        // 서버 시작 시간 표시
        fetch('/api/health')
            .then(res => res.json())
            .then(data => {
                const titleEl = document.querySelector('h1');
                if (titleEl && data.startTime) {
                    const timeSpan = document.createElement('span');
                    timeSpan.style.fontSize = '0.65rem';
                    timeSpan.style.fontWeight = 'bold';
                    timeSpan.style.marginLeft = '12px';
                    timeSpan.style.color = SHAREHARMONY_PALETTE.white;
                    timeSpan.textContent = ` (로딩시간: ${data.startTime})`;
                    titleEl.appendChild(timeSpan);
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

    // 통계공의 정렬 방식에 따라 선택공 그리드 정렬
    const appMap = AppState.appearanceStatsMap || new Map();
    const winMap = AppState.winStatsMap || new Map();
    const seqMap = AppState.consecutiveStatsMap || new Map();
    if (AppState.currentSort === 'win-desc') {
        sortedStats.sort((a, b) => (b.count - a.count) || ((appMap.get(b.number) || 0) - (appMap.get(a.number) || 0)) || ((seqMap.get(b.number) || 0) - (seqMap.get(a.number) || 0)) || (b.number - a.number));
    } else if (AppState.currentSort === 'win-asc') {
        sortedStats.sort((a, b) => (a.count - b.count) || ((appMap.get(a.number) || 0) - (appMap.get(b.number) || 0)) || ((seqMap.get(a.number) || 0) - (seqMap.get(b.number) || 0)) || (a.number - b.number));
    } else if (AppState.currentSort === 'appearance-desc') {
        sortedStats = Array.from(appMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => (b.count - a.count) || ((winMap.get(b.number) || 0) - (winMap.get(a.number) || 0)) || ((seqMap.get(b.number) || 0) - (seqMap.get(a.number) || 0)) || (b.number - a.number));
    } else if (AppState.currentSort === 'appearance-asc') {
        sortedStats = Array.from(appMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => (a.count - b.count) || ((winMap.get(a.number) || 0) - (winMap.get(b.number) || 0)) || ((seqMap.get(a.number) || 0) - (seqMap.get(b.number) || 0)) || (a.number - b.number));
    } else if (AppState.currentSort === 'number-desc') {
        sortedStats.sort((a, b) => b.number - a.number);
    } else if (AppState.currentSort === 'number-asc') {
        sortedStats.sort((a, b) => a.number - b.number);
    } else if (AppState.currentSort === 'seq') {
        sortedStats.sort((a, b) => a.number - b.number);
    } else {
        sortedStats.sort((a, b) => a.number - b.number);
    }

    let sectionBox = document.getElementById('numberGridSection');
    if (!sectionBox) {
        sectionBox = document.createElement('div');
        sectionBox.id = 'numberGridSection';
        sectionBox.className = 'stats-box';
        const row = document.getElementById('gridGameRow');
        if (row) {
            row.insertBefore(sectionBox, row.firstChild);
        } else {
            const inner = centerPanel.querySelector('.panel-inner') || centerPanel;
            const optFilter = inner.querySelector('#optionFilterBox');
            inner.insertBefore(sectionBox, optFilter ? optFilter.nextSibling : inner.firstChild);
        }
    }

    // 선택공 라벨 제거: 헤더 컨테이너 미사용 (기존에 있으면 제거)
    const existingHeader = document.getElementById('numberGridHeaderContainer');
    if (existingHeader) existingHeader.remove();

    let gridContainer = sectionBox.querySelector('.number-grid-container');
    if (!gridContainer) {
        gridContainer = document.createElement('div');
        gridContainer.className = 'number-grid-container';
        sectionBox.appendChild(gridContainer);
    } else {
        gridContainer.innerHTML = '';
    }

    // 테두리 표시 대상 번호 결정
    let highlightNumbers;
    const isNumberSort = AppState.currentSort === 'number-asc' || AppState.currentSort === 'number-desc';
    if (isNumberSort) {
        const latestRound = (AppState.allLotto645Data && AppState.allLotto645Data.length > 0)
            ? AppState.allLotto645Data.reduce((max, r) => r.round > max.round ? r : max, AppState.allLotto645Data[0])
            : null;
        highlightNumbers = latestRound
            ? new Set(latestRound.numbers.map(n => parseInt(n, 10)))
            : new Set();
    } else {
        const appMapForTop6 = AppState.appearanceStatsMap || new Map();
        const seqMapForTop6 = AppState.consecutiveStatsMap || new Map();
        const sortedByWin = [...sortedStats].sort((a, b) =>
            (b.count - a.count) || ((appMapForTop6.get(b.number) || 0) - (appMapForTop6.get(a.number) || 0)) || ((seqMapForTop6.get(b.number) || 0) - (seqMapForTop6.get(a.number) || 0)) || (b.number - a.number)
        );
        highlightNumbers = new Set(sortedByWin.slice(0, 6).map(s => s.number));
    }

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

        const ball = createStatBall(stat.number, 22, '0.8rem');
        ball.style.cursor = 'pointer';
        ball.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease';

        if (highlightNumbers.has(stat.number)) {
            ball.style.border = '0.2px solid ' + SHAREHARMONY_PALETTE.black;
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
            if (highlightNumbers.has(stat.number)) {
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
    const sortOrder = (AppState.resultFilters && AppState.resultFilters.sortOrder) || 'desc';
    const sorted = sortOrder === 'asc'
        ? [...roundData].sort((a, b) => a.round - b.round)
        : [...roundData].sort((a, b) => b.round - a.round);
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
            statLine.style.height = '24px';
            statLine.style.minHeight = '24px';
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
                const ball = createStatBall(n, 22, '0.8rem');
                leftPart.appendChild(ball);
            });
            const rightPart = document.createElement('div');
            rightPart.style.display = 'flex';
            rightPart.style.alignItems = 'center';
            rightPart.style.gap = '4px';
            rightPart.style.flexShrink = '0';
            const pct = totalRounds > 0 ? ((entry.count / totalRounds) * 100).toFixed(1) : '0.0';
            rightPart.innerHTML = '<span style="font-weight:700;">' + entry.count + '</span><span>회</span> <span style="color:' + SHAREHARMONY_PALETTE.textSecondary + ';">(' + pct + '%)</span>';
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

    const slAppMap = AppState.appearanceStatsMap || new Map();
    const slWinMap = AppState.winStatsMap || new Map();
    const slSeqMap = AppState.consecutiveStatsMap || calculateConsecutiveStats(AppState.currentStatsRounds || AppState.allLotto645Data);
    if (AppState.currentSort === 'win-desc') {
        sortedStats.sort((a, b) => (b.count - a.count) || ((slAppMap.get(b.number) || 0) - (slAppMap.get(a.number) || 0)) || ((slSeqMap.get(b.number) || 0) - (slSeqMap.get(a.number) || 0)) || (b.number - a.number));
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'win-asc') {
        sortedStats.sort((a, b) => (a.count - b.count) || ((slAppMap.get(a.number) || 0) - (slAppMap.get(b.number) || 0)) || ((slSeqMap.get(a.number) || 0) - (slSeqMap.get(b.number) || 0)) || (a.number - b.number));
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'appearance-desc') {
        sortedStats = Array.from(slAppMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => (b.count - a.count) || ((slWinMap.get(b.number) || 0) - (slWinMap.get(a.number) || 0)) || ((slSeqMap.get(b.number) || 0) - (slSeqMap.get(a.number) || 0)) || (b.number - a.number));
        percentageMap = AppState.appearancePercentageCache || new Map();
    } else if (AppState.currentSort === 'appearance-asc') {
        sortedStats = Array.from(slAppMap.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => (a.count - b.count) || ((slWinMap.get(a.number) || 0) - (slWinMap.get(b.number) || 0)) || ((slSeqMap.get(a.number) || 0) - (slSeqMap.get(b.number) || 0)) || (a.number - b.number));
        percentageMap = AppState.appearancePercentageCache || new Map();
    } else if (AppState.currentSort === 'number-desc') {
        sortedStats.sort((a, b) => b.number - a.number);
        percentageMap = AppState.winPercentageCache || new Map();
    } else if (AppState.currentSort === 'number-asc') {
        sortedStats.sort((a, b) => a.number - b.number);
        percentageMap = AppState.winPercentageCache || new Map();
    } else {
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
        statLine.style.height = '24px';
        statLine.style.minHeight = '24px';
        statLine.style.boxSizing = 'border-box';

        // 공
        const ball = createStatBall(stat.number, 22, '0.8rem');

        // 통계 정보 (우측 정렬)
        const statInfo = document.createElement('div');
        statInfo.style.marginLeft = 'auto';
        statInfo.style.display = 'flex';
        statInfo.style.alignItems = 'center';
        statInfo.style.gap = '8px';
        statInfo.style.fontSize = '0.9rem';

        const count = document.createElement('span');
        count.style.color = SHAREHARMONY_PALETTE.textPrimary;
        count.textContent = `${stat.count}`;

        const countUnit = document.createElement('span');
        countUnit.style.color = SHAREHARMONY_PALETTE.textPrimary;
        countUnit.style.fontWeight = '700';
        countUnit.textContent = '회';

        const percentage = percentageMap.get(stat.number) || 0;
        const percent = document.createElement('span');
        percent.style.color = SHAREHARMONY_PALETTE.textSecondary;
        percent.textContent = `(${percentage.toFixed(2)}%)`;

        statInfo.appendChild(count);
        statInfo.appendChild(countUnit);
        statInfo.appendChild(percent);

        statLine.appendChild(ball);
        statLine.appendChild(statInfo);
        statsList.appendChild(statLine);
    });
}

/**
 * 게임공(게임박스) 초기화
 */
function initializeGameBox() {
    const gameSetsContainer = document.getElementById('gameSetsContainer');
    if (!gameSetsContainer) return;

    for (let i = 1; i <= 5; i++) {
        const gameSet = document.createElement('div');
        gameSet.id = `gameSet${i}`;
        gameSet.className = 'game-set-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `gameCheckbox${i}`;
        checkbox.dataset.gameIndex = i;
        checkbox.disabled = true;
        checkbox.style.width = '14px';
        checkbox.style.height = '14px';
        checkbox.addEventListener('change', async function () {
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
                    if (validNumbers.length >= 1 && validNumbers.length <= 5) {
                        const fullNumbers = generateNumbersWithFilters(validNumbers, true);
                        const newNumbers = fullNumbers.filter(n => !validNumbers.includes(n));
                        const allNumbers = [...validNumbers, ...newNumbers].slice(0, 6).sort((a, b) => a - b);
                        AppState.setSelectedBalls[gameIndex - 1] = allNumbers;
                        updateGameSet(gameIndex, 'semi-auto');
                    } else if (validNumbers.length === 6) {
                        // 6개 완료 — 그대로 유지
                    } else if (validNumbers.length === 0) {
                        alert('반자동 모드는 1개 이상의 번호를 선택해야 합니다.');
                        this.checked = false;
                        return;
                    }
                }

                // 동일 회차·세트/게임이 있으면 저장 시 서버가 세트+1·게임 1부터 부여하므로 경고 없음
            }
            updateSaveBoxState();
        });

        const gameNumber = document.createElement('span');
        gameNumber.className = 'game-label';
        gameNumber.textContent = `G${i}`;

        const modeBtn = document.createElement('button');
        modeBtn.id = `modeBtn${i}`;
        modeBtn.className = 'filter-btn game-mode-btn';
        modeBtn.textContent = '수동';
        modeBtn.dataset.gameIndex = i;
        modeBtn.dataset.mode = 'manual';
        modeBtn.addEventListener('click', function () {
            const gameIdx = parseInt(this.dataset.gameIndex, 10);
            const cb = document.getElementById(`gameCheckbox${gameIdx}`);
            if (cb && cb.checked) {
                alert('게임모드를 변경하려면 체크박스를 해제한 후 진행해 주세요.');
                return;
            }
            const currentMode = this.dataset.mode;
            const semiFrom = this.dataset.semiFrom || '';
            let newMode, newText;
            // 행운 순환: 행운 ⇄ 반자동 (선택필터 초기화)
            if (currentMode === 'lucky') {
                newMode = 'semi-auto';
                newText = '반자동';
                this.dataset.semiFrom = 'lucky';
            } else if (currentMode === 'semi-auto' && semiFrom === 'lucky') {
                newMode = 'lucky';
                newText = '행운';
                delete this.dataset.semiFrom;
            } else if (currentMode === 'semi-auto' && semiFrom === 'ai') {
                newMode = 'manual';
                newText = '수동';
                delete this.dataset.semiFrom;
            } else if (currentMode === 'manual') {
                newMode = 'auto';
                newText = 'AI추천';
            } else if (currentMode === 'auto') {
                newMode = 'semi-auto';
                newText = '반자동';
                this.dataset.semiFrom = 'ai';
            } else {
                newMode = 'manual';
                newText = '수동';
            }
            this.dataset.mode = newMode;
            this.textContent = newText;

            // 행운으로 전환 시 선택필터(옵션필터) 초기화
            if (newMode === 'lucky') {
                const oeSelect = document.getElementById('filterOddEven');
                const hcSelect = document.getElementById('filterHotCold');
                const seqSelect = document.getElementById('filterConsecutive');
                const acSelect = document.getElementById('filterAC');
                if (oeSelect) oeSelect.value = 'none';
                if (hcSelect) hcSelect.value = 'none';
                if (seqSelect) seqSelect.value = 'none';
                if (acSelect) acSelect.value = 'none';
                if (AppState.optionFilters) {
                    AppState.optionFilters.oddEven = 'none';
                    AppState.optionFilters.hotCold = 'none';
                    AppState.optionFilters.consecutive = 'none';
                }
            }

            if (newMode === 'manual') {
                if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
                AppState.setSelectedBalls[i - 1] = [];
                if (cb) cb.checked = false;
            } else if (newMode === 'auto' || newMode === 'lucky') {
                if (cb) cb.checked = true;
            } else if (newMode === 'semi-auto') {
                if (cb) cb.checked = false;
            }
            updateGameSet(i, newMode, true);
        });

        const ballsContainer = document.createElement('div');
        ballsContainer.id = `gameBalls${i}`;
        ballsContainer.className = 'game-balls-wrap';

        const sumDisplay = document.createElement('span');
        sumDisplay.id = `gameSum${i}`;
        sumDisplay.className = 'game-sum';
        sumDisplay.textContent = '0';

        const probDisplay = document.createElement('div');
        probDisplay.id = `gameProb${i}`;
        probDisplay.className = 'game-prob';
        probDisplay.textContent = '0%';

        const rightGroup = document.createElement('div');
        rightGroup.className = 'game-right-group';
        rightGroup.appendChild(sumDisplay);

        gameSet.appendChild(checkbox);
        gameSet.appendChild(gameNumber);
        gameSet.appendChild(modeBtn);
        gameSet.appendChild(probDisplay);
        gameSet.appendChild(ballsContainer);
        gameSet.appendChild(rightGroup);

        gameSetsContainer.appendChild(gameSet);
    }

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
    if (!AppState.optionFilters) {
        AppState.optionFilters = { oddEven: 'none', hotCold: 'none', consecutive: 'none', avgLow: null, avgHigh: null };
    }

    const ids = [
        { el: 'filterOddEven', key: 'oddEven' },
        { el: 'filterHotCold', key: 'hotCold' },
        { el: 'filterConsecutive', key: 'consecutive' }
    ];
    ids.forEach(function (item) {
        const el = document.getElementById(item.el);
        if (el) {
            el.addEventListener('change', function () {
                AppState.optionFilters[item.key] = this.value;
                generateAllGames();
            });
        }
    });

    var avgLow = document.getElementById('filterAvgLow');
    var avgHigh = document.getElementById('filterAvgHigh');
    if (avgLow) {
        avgLow.addEventListener('change', function () {
            var v = parseFloat(this.value);
            AppState.optionFilters.avgLow = isNaN(v) ? null : v;
            generateAllGames();
        });
    }
    if (avgHigh) {
        avgHigh.addEventListener('change', function () {
            var v = parseFloat(this.value);
            AppState.optionFilters.avgHigh = isNaN(v) ? null : v;
            generateAllGames();
        });
    }
    const excludeEl = document.getElementById('filterExclude');
    const clearExcludeBtn = document.getElementById('clearExcludeBtn');

    if (excludeEl) {
        const updateClearBtnState = () => {
            if (clearExcludeBtn) {
                clearExcludeBtn.style.display = excludeEl.value.trim().length > 0 ? 'block' : 'none';
            }
        };
        
        // 초기 상태 설정
        updateClearBtnState();
        
        if (clearExcludeBtn) {
            clearExcludeBtn.addEventListener('click', function() {
                excludeEl.value = '';
                updateClearBtnState();
                generateAllGames();
                excludeEl.focus();
            });
        }

        // 1. 실시간 입력 제어: 숫자, 콤마, 공백만 허용 (그 외 자동 삭제)
        excludeEl.addEventListener('input', function() {
            const raw = this.value;
            const clean = raw.replace(/[^0-9,\s]/g, '');
            if (raw !== clean) {
                this.value = clean;
            }
            updateClearBtnState();
        });

        // 2. 입력 완료 시 논리 검증: 1~45 범위 및 포맷팅
        excludeEl.addEventListener('change', function() {
            const parts = this.value.split(',');
            const validSet = new Set();
            let hasRangeError = false;

            parts.forEach(p => {
                const n = parseInt(p.trim(), 10);
                if (!isNaN(n)) {
                    if (n >= 1 && n <= 45) validSet.add(n);
                    else hasRangeError = true;
                }
            });

            if (hasRangeError) alert('제외수는 1~45 사이의 숫자여야 합니다.\n범위를 벗어난 숫자는 제외되었습니다.');
            
            this.value = Array.from(validSet).sort((a, b) => a - b).join(', ');
            updateClearBtnState();
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
        selectingBall.style.border = '2px solid ' + SHAREHARMONY_PALETTE.selectionBorder;
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
            const newBall = createStatBall(number, 22, '0.8rem');
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
                        const bClass = getBallColorClass(bNum);
                        const bgColors = {
                            'color-yellow': '#FBC400',
                            'color-blue': '#69C8F2',
                            'color-red': '#FF7272',
                            'color-gray': '#AAAAAA',
                            'color-green': '#B0D840'
                        };
                        b.style.backgroundColor = bgColors[bClass] || '#808080';
                        b.style.color = '#333';
                        b.style.border = 'none';
                    } else {
                        b.style.border = '';
                        b.style.boxShadow = '';
                    }
                });

                const ballClass = getBallColorClass(number);
                const bgColors = {
                    'color-yellow': '#FBC400',
                    'color-blue': '#69C8F2',
                    'color-red': '#FF7272',
                    'color-gray': '#AAAAAA',
                    'color-green': '#B0D840'
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
                    selectingBall.style.border = '2px solid ' + SHAREHARMONY_PALETTE.selectionBorder;
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
 * 게임공 생성 (필터 적용)
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

function getOtherGameCombos(currentGameIndex) {
    var combos = new Set();
    if (!AppState.setSelectedBalls) return combos;
    for (var g = 0; g < 5; g++) {
        if (g === currentGameIndex - 1) continue;
        var nums = AppState.setSelectedBalls[g];
        if (nums && nums.length === 6) {
            combos.add([...nums].sort(function (a, b) { return a - b; }).join(','));
        }
    }
    return combos;
}

/**
 * 개별 게임공 생성
 */
function generateGame(gameIndex, mode, isModeChange = false) {
    const ballsContainer = document.getElementById(`gameBalls${gameIndex}`);
    if (!ballsContainer) return;

    ballsContainer.innerHTML = '';

    if (mode === 'auto' || mode === 'lucky') {
        const checkbox = document.getElementById(`gameCheckbox${gameIndex}`);
        let numbers;
        if (isModeChange) {
            const otherCombos = getOtherGameCombos(gameIndex);
            numbers = null;
            for (let t = 0; t < 100; t++) {
                const candidate = generateNumbersWithFilters([], false, otherCombos);
                if (calculateAIProbability(candidate) >= 100) { numbers = candidate; break; }
            }
            if (!numbers) numbers = generateNumbersWithFilters([], false, otherCombos);
            if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
            AppState.setSelectedBalls[gameIndex - 1] = numbers;
        } else {
            numbers = (AppState.setSelectedBalls && AppState.setSelectedBalls[gameIndex - 1]) || [];
            if (numbers.length !== 6) {
                const otherCombos = getOtherGameCombos(gameIndex);
                numbers = null;
                for (let t = 0; t < 100; t++) {
                    const candidate = generateNumbersWithFilters([], false, otherCombos);
                    if (calculateAIProbability(candidate) >= 100) { numbers = candidate; break; }
                }
                if (!numbers) numbers = generateNumbersWithFilters([], false, otherCombos);
                if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
                AppState.setSelectedBalls[gameIndex - 1] = numbers;
            }
        }

        // 게임공 표시
        numbers.forEach(num => {
            const ball = createStatBall(num, 22, '0.8rem');
            ballsContainer.appendChild(ball);
        });

        const modeBtnEl = document.getElementById('modeBtn' + gameIndex);
        if (checkbox) {
            checkbox.disabled = false;
            checkbox.checked = true; // AI추천일 경우 저장공에 자동 출력(체크)
        }
        updateSaveBoxState(); // 저장 버튼/회차 입력 활성화

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
                const ballElement = createStatBall(num, 22, '0.8rem');
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
                            const bClass = getBallColorClass(bNum);
                            const bgColors = {
                                'color-yellow': '#FBC400',
                                'color-blue': '#69C8F2',
                                'color-red': '#FF7272',
                                'color-gray': '#AAAAAA',
                                'color-green': '#B0D840'
                            };
                            b.style.backgroundColor = bgColors[bClass] || '#808080';
                            b.style.color = '#333';
                            b.style.border = 'none';
                        } else {
                            b.style.border = '';
                            b.style.boxShadow = '';
                        }
                    });

                    const ballClass = getBallColorClass(num);
                    const bgColors = {
                        'color-yellow': '#FBC400',
                        'color-blue': '#69C8F2',
                        'color-red': '#FF7272',
                        'color-gray': '#AAAAAA',
                        'color-green': '#B0D840'
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
                ball.className = 'stat-ball stat-ball--sm';
                ball.style.backgroundColor = SHAREHARMONY_PALETTE.border;
                ball.style.color = SHAREHARMONY_PALETTE.textSecondary;
                ball.style.cursor = 'pointer';
                ball.style.border = '0.2px solid ' + SHAREHARMONY_PALETTE.border;
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
                ball = createStatBall(currentNumbers[i], 22, '0.8rem');
                ball.style.cursor = 'pointer';
                ball.dataset.gameIndex = gameIndex;
                ball.dataset.ballIndex = i;
            } else {
                // 선택되지 않았으면 기존 흑백 원형 버튼 생성
                ball = document.createElement('div');
                ball.className = 'stat-ball stat-ball--sm';
                ball.style.backgroundColor = SHAREHARMONY_PALETTE.black;
                ball.style.color = SHAREHARMONY_PALETTE.white;
                ball.style.cursor = 'pointer';
                ball.style.border = '0.2px solid ' + SHAREHARMONY_PALETTE.black;
                ball.textContent = '?';

                ball.dataset.gameIndex = gameIndex;
                ball.dataset.ballIndex = i;
            }

            // 게임공 클릭 시 번호 선택 (선택 모드일 때만)
            ball.addEventListener('click', () => {
                const cb = document.getElementById(`gameCheckbox${gameIndex}`);
                if (cb && cb.checked) return; // 체크된 상태에서는 수정 불가

                // 이전 선택 하이라이트 제거 (빈 공은 검정 배경으로 복원)
                const allBalls = ballsContainer.querySelectorAll('.stat-ball');
                allBalls.forEach((b, idx) => {
                    b.style.border = '0.2px solid ' + SHAREHARMONY_PALETTE.black;
                    b.style.boxShadow = 'none';
                    if (b.textContent === '?' || !currentNumbers[idx]) {
                        b.style.backgroundColor = SHAREHARMONY_PALETTE.black;
                        b.style.color = SHAREHARMONY_PALETTE.white;
                    }
                });

                // 현재 선택공 하이라이트
                ball.style.border = '2px solid ' + SHAREHARMONY_PALETTE.selectionBorder;
                ball.style.boxShadow = '0 0 8px rgba(0, 102, 255, 0.5)';
                // 수동 모드에서 첫 번째 공 선택 시(빈 칸일 때) 바탕색 흰색
                if (i === 0 && ball.textContent === '?') {
                    ball.style.backgroundColor = '#fff';
                    ball.style.color = '#333';
                }

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

    // AI 당첨 확률 업데이트
    updateGameProbability(gameIndex, validNumbers);
}

/**
 * AI 당첨 확률 업데이트
 */
function updateGameProbability(gameIndex, numbers) {
    const probDisplay = document.getElementById(`gameProb${gameIndex}`);
    if (!probDisplay) return;

    if (numbers.length < 6) {
        probDisplay.style.visibility = 'hidden';
        probDisplay.onclick = null;
        probDisplay.style.cursor = 'default';
        return;
    }

    probDisplay.style.visibility = 'visible';
    probDisplay.style.cursor = 'pointer';
    const score = calculateAIProbability(numbers);
    probDisplay.textContent = `${score}%`;

    // 점수에 따른 색상 변경 (동행볼 색은 70~89 구간만 유지)
    if (score >= 90) {
        probDisplay.style.backgroundColor = SHAREHARMONY_PALETTE.golden;
        probDisplay.style.color = SHAREHARMONY_PALETTE.black;
    } else if (score >= 70) {
        probDisplay.style.backgroundColor = SHAREHARMONY_PALETTE.accent;
        probDisplay.style.color = SHAREHARMONY_PALETTE.white;
    } else {
        probDisplay.style.backgroundColor = SHAREHARMONY_PALETTE.textMuted;
        probDisplay.style.color = SHAREHARMONY_PALETTE.white;
    }

    // 클릭 시 상세 분석 말풍선 표시
    probDisplay.onclick = (e) => {
        e.stopPropagation();
        showAnalysisBubble(gameIndex, numbers, score, e);
    };
}

/**
 * 분석 상세 말풍선 표시
 */
function showAnalysisBubble(gameIndex, numbers, score, event) {
    // 기존 말풍선 제거
    const existing = document.querySelector('.analysis-bubble');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.className = 'analysis-bubble';

    // 말풍선 위치 조정 (이미지 추가로 높이 확보)
    const rect = event.currentTarget.getBoundingClientRect();
    bubble.style.left = (window.scrollX + rect.left - 150) + 'px';
    bubble.style.top = (window.scrollY + rect.top - 320) + 'px';
    bubble.style.width = 'clamp(260px, 70vw, 320px)';

    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const odd = sorted.filter(n => n % 2 !== 0).length;
    const ac = calculateAC(sorted);
    let seqPairs = 0;
    for (let i = 0; i < sorted.length - 1; i++) { if (sorted[i + 1] === sorted[i] + 1) seqPairs++; }
    let hotCnt = 0;
    if (AppState && AppState.allLotto645Data) {
        const freq = {};
        AppState.allLotto645Data.slice(0, 20).forEach(r => r.numbers.forEach(n => { freq[n] = (freq[n] || 0) + 1; }));
        const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        const hotSet = new Set(entries.slice(0, 23).map(e => parseInt(e[0])));
        hotCnt = sorted.filter(n => hotSet.has(n)).length;
    }
    const nextRound = (AppState && AppState.allLotto645Data) ? AppState.allLotto645Data[0].round + 1 : '??';

    let analysisText = `✨ 추천번호: ${sorted.join(', ')}\n`;
    analysisText += `합계 ${sum} | 홀짝 ${odd}:${6 - odd} | 핫콜 ${hotCnt}:${6 - hotCnt} | 연속 ${seqPairs} | AC ${ac}\n`;
    analysisText += `🏆 AI 분석 신뢰도: ${score}%`;

    // 게임 모드 확인
    const modeBtn = document.getElementById(`modeBtn${gameIndex}`);
    const isAiMode = modeBtn && modeBtn.dataset.mode === 'auto';

    let ticketImageHtml = '';
    // 티켓 이미지 또는 번호 리스트 HTML 생성
    if (isAiMode && score >= 90) { // AI추천이면서 90점 이상일 때만 티켓 렌더링
        drawPremiumTicket(numbers);
        const canvas = document.getElementById('premiumTicketCanvas');
        if (canvas) {
            const ticketImgData = canvas.toDataURL('image/png');
            ticketImageHtml = `
                <div style="margin: 0 0 10px 0; text-align: center; overflow:hidden; border-radius:8px;">
                    <img src="${ticketImgData}" style="width: 100%; display:block; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" alt="Lucky Ticket">
                </div>`;
        }
    } else {
        ticketImageHtml = `
            <div style="margin:0 0 10px 0; background:#f5f7f9; padding:12px 8px; border-radius:8px; text-align:center; border: 1px solid #eef2f5;">
                ${numbers.sort((a, b) => a - b).map(n => `<span class="stat-ball stat-ball--sm ${getBallColorClass(n)}" style="display:inline-flex; margin:0 3px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">${n}</span>`).join('')}
            </div>
        `;
    }

    // 팝업 내부 HTML 구성 (모던 카드 스타일)
    bubble.innerHTML = `
        <div class="ab-header">
            <div class="ab-title">
                ${isAiMode ? '<span style="font-size:1.1rem">✨</span> AI 정밀 분석' : '<span style="font-size:1.1rem">📊</span> 번호 상세 분석'}
            </div>
            <span class="ab-close" onclick="this.closest('.analysis-bubble').remove()">×</span>
        </div>
        
        <div class="ab-content">
            ${ticketImageHtml}
            
            <div class="ab-score-area">
                <span class="ab-score-label">AI 분석 신뢰도</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:80px; height:6px; background:${SHAREHARMONY_PALETTE.border}; border-radius:3px; overflow:hidden;">
                        <div style="width:${score}%; height:100%; background:${score >= 90 ? SHAREHARMONY_PALETTE.golden : SHAREHARMONY_PALETTE.income}; border-radius:3px;"></div>
                    </div>
                    <span class="ab-score-val" style="color:${score >= 90 ? '#D4961A' : '#1565C0'}">${score}%</span>
                </div>
            </div>

            <div class="ab-grid">
                <div class="ab-stat-item"><span class="ab-stat-label">합계</span> <span class="ab-stat-val">${sum}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">홀:짝</span> <span class="ab-stat-val">${odd}:${6 - odd}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">핫:콜</span> <span class="ab-stat-val">${hotCnt}:${6 - hotCnt}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">연속쌍</span> <span class="ab-stat-val">${seqPairs}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">복잡도(AC)</span> <span class="ab-stat-val">${ac}</span></div>
                <div class="ab-stat-item"><span class="ab-stat-label">구간진입</span> <span class="ab-stat-val" style="color:#1565C0">적정</span></div>
            </div>
        </div>

        <div class="ab-footer">
            <button id="copyBubbleBtn" class="ab-btn">
                <span>결과 공유하기</span> 📤
            </button>
        </div>
    `;

    document.body.appendChild(bubble);

    const copyBtn = bubble.querySelector('#copyBubbleBtn');
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(analysisText).then(() => {
            alert('분석 결과가 복사되었습니다!\n카톡이나 문자에 붙여넣어 공유해보세요. 🍀');
            bubble.remove();
        });
    };

    // 외부 클릭 시 닫기
    const closeOnOutside = (e) => {
        if (!bubble.contains(e.target) && e.target !== event.currentTarget) {
            bubble.remove();
            document.removeEventListener('click', closeOnOutside);
        }
    };
    setTimeout(() => document.addEventListener('click', closeOnOutside), 10);
}

/**
 * AI 당첨 확률 계산 (로직)
 */
function calculateAIProbability(numbers) {
    let score = 0;
    const sorted = [...numbers].sort((a, b) => a - b);

    const sumRange = getSumRange();
    const oeFilter = document.getElementById('filterOddEven')?.value || 'none';
    const hcFilter = document.getElementById('filterHotCold')?.value || 'none';
    const seqFilter = document.getElementById('filterConsecutive')?.value || 'none';
    const acFilter = document.getElementById('filterAC')?.value || 'none';

    // 1. 합계: min~max 범위 내 만점, ±20 이내 절반
    const sum = numbers.reduce((a, b) => a + b, 0);
    if (sum >= sumRange.start && sum <= sumRange.end) score += 25;
    else if (sum >= sumRange.start - 20 && sum <= sumRange.end + 20) score += 12;

    // 2. 홀짝: 필터 설정 시 일치 만점, 미설정 시 만점
    const oddCount = numbers.filter(n => n % 2 !== 0).length;
    if (oeFilter !== 'none') {
        const targetOdd = parseInt(oeFilter.split('-')[0], 10);
        if (oddCount === targetOdd) score += 20;
        else if (Math.abs(oddCount - targetOdd) === 1) score += 10;
    } else {
        score += 20;
    }

    // 3. 핫콜: 필터 설정 시 일치 만점, 미설정 시 만점
    if (hcFilter !== 'none' && AppState && AppState.allLotto645Data) {
        const { hot } = getOverallHotColdNumbers();
        const hotSet = new Set(hot);
        const hotCnt = sorted.filter(n => hotSet.has(n)).length;
        const targetHot = parseInt(hcFilter.split('-')[0], 10);
        if (hotCnt === targetHot) score += 20;
        else if (Math.abs(hotCnt - targetHot) === 1) score += 10;
    } else {
        score += 20;
    }

    // 4. 연속: 필터 설정 시 일치 만점, 미설정 시 만점
    let seqCount = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i + 1] === sorted[i] + 1) seqCount++;
    }
    if (seqFilter !== 'none') {
        const targetSeq = parseInt(seqFilter, 10);
        const match = (targetSeq === 3) ? (seqCount >= 3) : (seqCount === targetSeq);
        if (match) score += 15;
    } else {
        score += 15;
    }

    // 5. AC: 필터 설정 시 일치 만점, 미설정 시 만점
    const ac = calculateAC(sorted);
    if (acFilter !== 'none') {
        const targetAC = parseInt(acFilter, 10);
        if (ac === targetAC) score += 20;
        else if (Math.abs(ac - targetAC) === 1) score += 10;
    } else {
        score += 20;
    }

    return Math.min(score, 100);
}

/**
 * AI 골든 조합 (5게임) 자동 생성
 */
function generateGoldenAiGames() {
    // 사용자에게 진행 알림 (버튼 비활성화)
    const btn = document.getElementById('masterGenerateBtn') || document.getElementById('goldenAiBtnHeader');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '✨ AI 분석 및 최적화 중...';
    }

    // 옵션필터를 기본값(없음/AC)으로 리셋
    const oeSelect = document.getElementById('filterOddEven');
    const hcSelect = document.getElementById('filterHotCold');
    const seqSelect = document.getElementById('filterConsecutive');
    const acSelect = document.getElementById('filterAC');
    if (oeSelect) oeSelect.value = 'none';
    if (hcSelect) hcSelect.value = 'none';
    if (seqSelect) seqSelect.value = 'none';
    if (acSelect) acSelect.value = 'none';

    // 황금 번호 초기화
    AppState.goldenNumbers = new Set();

    setTimeout(() => {
        // 통계적으로 가장 많이 나온 상위 10개 번호를 '황금 번호'로 임시 지정 (시각적 포인트)
        if (AppState.winStats) {
            const topNumbers = [...AppState.winStats]
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map(s => s.number);
            AppState.goldenNumbers = new Set(topNumbers);
        }

        const usedCombos = new Set();
        for (let i = 1; i <= 5; i++) {
            let numbers = null;
            for (let t = 0; t < 200; t++) {
                const candidate = generateNumbersWithFilters([], false, usedCombos, true);
                if (calculateAIProbability(candidate) >= 100) { numbers = candidate; break; }
            }
            if (!numbers) numbers = generateNumbersWithFilters([], false, usedCombos, true);
            usedCombos.add([...numbers].sort((a, b) => a - b).join(','));

            if (!AppState.setSelectedBalls) AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
            AppState.setSelectedBalls[i - 1] = numbers;

            const modeBtn = document.getElementById(`modeBtn${i}`);
            if (modeBtn) {
                modeBtn.dataset.mode = 'lucky';
                modeBtn.textContent = '행운';
            }
            const checkbox = document.getElementById(`gameCheckbox${i}`);
            if (checkbox) {
                checkbox.disabled = false;
                checkbox.checked = true;
            }
            updateGameSet(i, 'lucky');
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '행운번호 받기 ✓';
            setTimeout(() => { btn.innerHTML = '행운번호 받기'; }, 2500);
        }

        updateSaveBoxState();
        showGoldenAiAnalysis();
    }, 800);
}

function showGoldenAiAnalysis() {
    const existing = document.querySelector('.golden-analysis-overlay');
    if (existing) existing.remove();

    const nextRound = (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0])
        ? AppState.allLotto645Data[0].round + 1 : '??';
    let nextDrawDate = '';
    let nextDrawDateFull = '';
    if (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0] && AppState.allLotto645Data[0].date) {
        const lastDate = typeof AppState.allLotto645Data[0].date === 'string'
            ? new Date(AppState.allLotto645Data[0].date)
            : new Date((AppState.allLotto645Data[0].date - 25569) * 86400000);
        if (!isNaN(lastDate.getTime())) {
            lastDate.setDate(lastDate.getDate() + 7);
            const yyyy = lastDate.getFullYear();
            const mm = String(lastDate.getMonth() + 1).padStart(2, '0');
            const dd = String(lastDate.getDate()).padStart(2, '0');
            nextDrawDate = `${yyyy}-${mm}-${dd}`;
            nextDrawDateFull = nextDrawDate;
        }
    }
    const oeFilter = document.getElementById('filterOddEven')?.value || 'none';
    const hcFilter = document.getElementById('filterHotCold')?.value || 'none';
    const seqFilter = document.getElementById('filterConsecutive')?.value || 'none';
    const acFilter = document.getElementById('filterAC')?.value || 'none';
    const sumRange = getSumRange();
    const { hot } = getOverallHotColdNumbers();
    const hotSet = new Set(hot);

    let gamesHtml = '';
    let fullText = `✨ AI 추천 번호 분석 제${nextRound}회${nextDrawDate ? '\n' + nextDrawDate + ' 추첨 예정' : ''}\n${'─'.repeat(30)}\n`;

    let displayIdx = 0;
    for (let i = 0; i < 5; i++) {
        const nums = (AppState.setSelectedBalls && AppState.setSelectedBalls[i]) || [];
        if (nums.length !== 6) continue;
        const sorted = [...nums].sort((a, b) => a - b);
        const score = calculateAIProbability(sorted);
        if (score < 100) continue;

        displayIdx++;
        const sum = sorted.reduce((a, b) => a + b, 0);
        const oddCnt = sorted.filter(n => n % 2 !== 0).length;
        const hotCnt = sorted.filter(n => hotSet.has(n)).length;
        const seqPairs = countSequentialPairs(sorted);
        const ac = calculateAC(sorted);

        const bubbleBallBg = { 'color-yellow': '#D4A300', 'color-blue': '#2E8BC0', 'color-red': '#D63333', 'color-gray': '#666666', 'color-green': '#6B9E00' };
        const ballsHtml = sorted.map(n => {
            const cls = getBallColorClass(n);
            return `<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;margin:0 2px;background:${bubbleBallBg[cls] || '#888'};color:#FFFFFF;font-weight:800;font-size:0.78rem;box-shadow:none;animation:none;">${n}</span>`;
        }).join('');

        gamesHtml += `
            <div style="padding:6px 0;border-bottom:1px solid ${SHAREHARMONY_PALETTE.accentLight};">
                <div style="display:flex;align-items:center;gap:clamp(2px,1vw,6px);margin-bottom:3px;">
                    <span style="font-weight:bold;color:${SHAREHARMONY_PALETTE.goldenDark};font-size:clamp(0.68rem,2.2vw,0.82rem);white-space:nowrap;">GAME ${displayIdx}</span>
                    <span style="flex:1;text-align:center;line-height:1;">${ballsHtml}</span>
                    <span style="font-size:clamp(0.65rem,2vw,0.75rem);font-weight:bold;color:${SHAREHARMONY_PALETTE.greenBtn};white-space:nowrap;">${score}%</span>
                </div>
                <div style="display:flex;justify-content:flex-end;align-items:center;gap:0;font-size:clamp(0.6rem,1.8vw,0.72rem);color:${SHAREHARMONY_PALETTE.textPrimary};font-weight:500;font-family:'Courier New',Courier,monospace;">
                    <span style="width:52px;text-align:right;">합계 ${String(sum).padStart(3,'\u2007')}</span><span style="width:1px;height:10px;background:${SHAREHARMONY_PALETTE.accent};flex-shrink:0;margin:0 4px;"></span>
                    <span style="width:52px;text-align:right;">홀짝 ${oddCnt}:${6 - oddCnt}</span><span style="width:1px;height:10px;background:${SHAREHARMONY_PALETTE.accent};flex-shrink:0;margin:0 4px;"></span>
                    <span style="width:52px;text-align:right;">핫콜 ${hotCnt}:${6 - hotCnt}</span><span style="width:1px;height:10px;background:${SHAREHARMONY_PALETTE.accent};flex-shrink:0;margin:0 4px;"></span>
                    <span style="width:38px;text-align:right;">연속 ${seqPairs}</span><span style="width:1px;height:10px;background:${SHAREHARMONY_PALETTE.accent};flex-shrink:0;margin:0 4px;"></span>
                    <span style="width:38px;text-align:right;">AC ${String(ac).padStart(2,'\u2007')}</span>
                </div>
            </div>`;

        fullText += `GAME ${displayIdx}: ${sorted.join(', ')}  합:${sum} 홀짝:${oddCnt}:${6 - oddCnt} 핫콜:${hotCnt}:${6 - hotCnt} 연속:${seqPairs} AC:${ac} 신뢰:${score}%\n`;
    }
    if (displayIdx === 0) {
        gamesHtml = `<div style="text-align:center;padding:20px;color:${SHAREHARMONY_PALETTE.textMuted};">100% 신뢰도 조합이 없습니다.</div>`;
    }

    const filterInfo = [];
    if (oeFilter !== 'none') filterInfo.push(`홀짝 ${oeFilter.replace('-', ':')}`);
    if (hcFilter !== 'none') filterInfo.push(`핫콜 ${hcFilter.replace('-', ':')}`);
    if (seqFilter !== 'none') filterInfo.push(`연속 ${seqFilter}`);
    if (acFilter !== 'none') filterInfo.push(`AC ${acFilter}`);
    filterInfo.push(`합계 ${sumRange.start}~${sumRange.end}`);
    fullText += `${'─'.repeat(30)}\n적용필터: ${filterInfo.join(' | ')}\n`;

    const overlay = document.createElement('div');
    overlay.className = 'golden-analysis-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:${SHAREHARMONY_PALETTE.white};border-radius:12px;padding:clamp(12px,3vw,20px);width:clamp(280px,70vw,380px);max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3);position:relative;">
            <span onclick="this.closest('.golden-analysis-overlay').remove()" style="position:absolute;top:8px;right:12px;font-size:1.2rem;cursor:pointer;color:${SHAREHARMONY_PALETTE.textMuted};">×</span>
            <div style="text-align:center;font-weight:bold;font-size:clamp(0.85rem,2.5vw,1rem);color:${SHAREHARMONY_PALETTE.goldenDark};border-bottom:2px solid ${SHAREHARMONY_PALETTE.golden};padding-bottom:6px;margin-bottom:6px;">
                ✨ AI 추천 번호 분석
                ${nextDrawDate ? `<div style="display:flex;justify-content:space-between;align-items:center;font-size:clamp(0.65rem,1.8vw,0.78rem);margin-top:3px;"><span>제${nextRound}회</span><span><span style="color:${SHAREHARMONY_PALETTE.error};">${nextDrawDateFull}</span> <span style="font-weight:normal;color:${SHAREHARMONY_PALETTE.textSecondary};">추첨 예정</span></span></div>` : `<div style="font-size:clamp(0.65rem,1.8vw,0.78rem);margin-top:3px;">제${nextRound}회</div>`}
            </div>
            ${gamesHtml}
            <div style="margin-top:8px;padding:clamp(6px,2vw,10px);background:${SHAREHARMONY_PALETTE.bgLighter};border-radius:8px;font-size:clamp(0.65rem,2vw,0.78rem);line-height:1.6;color:${SHAREHARMONY_PALETTE.textPrimary};">
                <div style="font-weight:bold;color:${SHAREHARMONY_PALETTE.textPrimary};margin-bottom:4px;">📖 분석 항목 안내</div>
                <table style="width:100%;border-collapse:collapse;font-size:inherit;line-height:1.5;">
                    <tr><td style="white-space:nowrap;font-weight:700;padding:1px 0;width:42px;">합계</td><td style="padding:1px 4px;color:${SHAREHARMONY_PALETTE.textMuted};width:14px;">—</td><td style="padding:1px 0;"><span style="color:${SHAREHARMONY_PALETTE.expense};">(${sumRange.start}~${sumRange.end} 적용)</span> 6개 번호의 합</td></tr>
                    <tr><td style="white-space:nowrap;font-weight:700;padding:1px 0;">홀짝</td><td style="padding:1px 4px;color:${SHAREHARMONY_PALETTE.textMuted};">—</td><td style="padding:1px 0;"><span style="color:${SHAREHARMONY_PALETTE.accent};">(자동적용)</span> 홀수:짝수 비율</td></tr>
                    <tr><td style="white-space:nowrap;font-weight:700;padding:1px 0;">핫콜</td><td style="padding:1px 4px;color:${SHAREHARMONY_PALETTE.textMuted};">—</td><td style="padding:1px 0;"><span style="color:${SHAREHARMONY_PALETTE.accent};">(자동적용)</span> 핫:콜 비율</td></tr>
                    <tr><td style="white-space:nowrap;font-weight:700;padding:1px 0;">연속</td><td style="padding:1px 4px;color:${SHAREHARMONY_PALETTE.textMuted};">—</td><td style="padding:1px 0;"><span style="color:${SHAREHARMONY_PALETTE.accent};">(자동적용)</span> 연이은 번호 쌍 수</td></tr>
                    <tr><td style="white-space:nowrap;font-weight:700;padding:1px 0;">AC값</td><td style="padding:1px 4px;color:${SHAREHARMONY_PALETTE.textMuted};">—</td><td style="padding:1px 0;"><span style="color:${SHAREHARMONY_PALETTE.accent};">(자동적용)</span> 번호 간격 다양성 0~10</td></tr>
                    <tr><td style="white-space:nowrap;font-weight:700;padding:1px 0;">신뢰도</td><td style="padding:1px 4px;color:${SHAREHARMONY_PALETTE.textMuted};">—</td><td style="padding:1px 0;">위 5개 항목 필터 일치도 종합 점수</td></tr>
                </table>
            </div>
            <div style="display:flex;gap:clamp(4px,1.5vw,8px);margin-top:10px;">
                <button id="goldenCopyTextBtn" data-text="${fullText.replace(/"/g, '&quot;')}"
                    style="flex:1;padding:clamp(6px,2vw,10px);background:linear-gradient(135deg,${SHAREHARMONY_PALETTE.greenBtn},${SHAREHARMONY_PALETTE.greenBtnDark});color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:clamp(0.7rem,2vw,0.82rem);">
                    📤 텍스트 복사
                </button>
                <button id="goldenSaveImageBtn"
                    style="flex:1;padding:clamp(6px,2vw,10px);background:linear-gradient(135deg,${SHAREHARMONY_PALETTE.goldenDark},${SHAREHARMONY_PALETTE.golden});color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:clamp(0.7rem,2vw,0.82rem);">
                    📋 이미지 복사
                </button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('#goldenCopyTextBtn').addEventListener('click', function () {
        navigator.clipboard.writeText(this.dataset.text).then(() => {
            alert('분석 결과가 복사되었습니다! 📋\n카톡이나 문자에 붙여넣어 공유하세요.');
            overlay.remove();
        });
    });

    overlay.querySelector('#goldenSaveImageBtn').addEventListener('click', function () {
        const contentEl = overlay.querySelector('div > div');
        if (!contentEl) return;
        const btns = overlay.querySelector('#goldenCopyTextBtn')?.parentElement;
        const closeBtn = overlay.querySelector('span[onclick]');
        if (btns) btns.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';
        import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js').catch(() => {}).then(() => {
            if (typeof html2canvas === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = () => captureAndSave(contentEl, btns, closeBtn, overlay);
                document.head.appendChild(script);
            } else {
                captureAndSave(contentEl, btns, closeBtn, overlay);
            }
        });
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

function captureAndSave(el, btns, closeBtn, overlay) {
    html2canvas(el, { backgroundColor: '#fff', scale: 2 }).then(canvas => {
        if (btns) btns.style.display = '';
        if (closeBtn) closeBtn.style.display = '';
        canvas.toBlob(function (blob) {
            if (!blob) { alert('이미지 생성에 실패했습니다.'); return; }
            if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    alert('이미지가 클립보드에 복사되었습니다! 📋\n카톡이나 메신저에 Ctrl+V로 붙여넣으세요.');
                }).catch(() => {
                    fallbackDownload(canvas);
                });
            } else {
                fallbackDownload(canvas);
            }
        }, 'image/png');
    }).catch(() => {
        if (btns) btns.style.display = '';
        if (closeBtn) closeBtn.style.display = '';
        alert('이미지 생성에 실패했습니다.');
    });
}

function fallbackDownload(canvas) {
    const link = document.createElement('a');
    link.download = 'AI_추천번호_분석.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    alert('클립보드 복사가 지원되지 않아 파일로 저장했습니다.');
}

/**
* 프리미엄 행운 티켓 이미지 생성 (Canvas)
*/
function drawPremiumTicket(numbers) {
    const canvas = document.getElementById('premiumTicketCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sorted = [...numbers].sort((a, b) => a - b);
    const nextRound = (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0]) ? AppState.allLotto645Data[0].round + 1 : '행운';

    // 1. 배경 그리기 (고급스러운 골드/화이트 톤)
    const grad = ctx.createLinearGradient(0, 0, 400, 280);
    grad.addColorStop(0, '#fffcf0');
    grad.addColorStop(1, '#f9f2d1');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(2, 2, 396, 276, 10) : ctx.rect(2, 2, 396, 276);
    ctx.fill();
    ctx.strokeStyle = SHAREHARMONY_PALETTE.goldenTicket;
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. 헤더 디자인
    ctx.fillStyle = SHAREHARMONY_PALETTE.goldenDark;
    ctx.font = 'bold 20px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ AI PREMIUM LUCKY TICKET ✨', 200, 40);

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(350, 50);
    ctx.stroke();

    // 3. 회차 및 설명
    ctx.fillStyle = SHAREHARMONY_PALETTE.textSecondary;
    ctx.font = '14px "Malgun Gothic"';
    ctx.fillText(`${nextRound}회차 당첨 기원 분석 조합`, 200, 75);

    // 4. 번호 출력 (로또 공 스타일)
    const colors = ['#fbc400', '#69c8f2', '#ff7272', '#aaaaaa', '#b0d840'];
    sorted.forEach((num, i) => {
        const x = 70 + (i * 52);
        const y = 130;

        // 그림자
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowOffsetY = 2;

        // 공 원형
        ctx.beginPath();
        let ballColor = colors[Math.floor((num - 1) / 10)];
        ctx.fillStyle = ballColor;
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();

        // 번호
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = SHAREHARMONY_PALETTE.white;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(num, x, y + 6);
    });

    // 5. 분석 데이터 요약
    const sum = sorted.reduce((a, b) => a + b, 0);
    const score = calculateAIProbability(sorted);

    ctx.fillStyle = SHAREHARMONY_PALETTE.textPrimary;
    ctx.font = 'bold 13px "Malgun Gothic"';
    ctx.textAlign = 'left';
    ctx.fillText(`📊 분석 리포트`, 55, 190);
    ctx.font = '12px "Malgun Gothic"';
    ctx.fillStyle = SHAREHARMONY_PALETTE.textSecondary;
    ctx.fillText(`• 분석 스코어: ${score}%  • 합계: ${sum}  • 검증: AC ${calculateAC(sorted)}`, 55, 210);
    ctx.fillText(`• 로직: 통계 가중치 기반 다차원 필터링 최적화 조합`, 55, 228);

    // 6. 하단 푸터 및 워터마크
    ctx.fillStyle = SHAREHARMONY_PALETTE.goldenTicket;
    ctx.font = 'italic bold 14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('Dedicated to your Luck & Happiness', 200, 260);

    // 다운로드 버튼 연결
    const downBtn = document.getElementById('downloadTicketBtn');
    if (downBtn) {
        downBtn.onclick = () => {
            const imgData = canvas.toDataURL('image/png');
            const baseUrl = getApiBaseUrl();

            fetch(`${baseUrl}/api/save-ticket-desktop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imgData, round: nextRound })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.returnValue === 'success') {
                        alert(`행운 티켓이 바탕화면에 저장되었습니다! 🎫\n(저장 경로: ${data.path})`);
                    } else {
                        alert('저장에 실패했습니다: ' + data.error);
                    }
                })
                .catch(err => {
                    console.error('바탕화면 저장 오류:', err);
                    alert('바탕화면에 저장하는 중 오류가 발생했습니다.');
                });
        };
    }
}

/** AC값 계산 유틸리티 */
function calculateAC(numbers) {
    const diffs = new Set();
    for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
            diffs.add(Math.abs(numbers[j] - numbers[i]));
        }
    }
    return diffs.size - 5;
}

/**
 * 프리미엄 AI 분석 토글 버튼
 */
function togglePremiumAiBox(btn) {
    const premiumBox = document.getElementById('premiumAiBox');
    const wrapper = document.getElementById('premiumToggleArea');

    // btn이 없으면(닫기 버튼) premiumAiToggleBtn에서 찾아옴
    if (!btn || !btn.dataset) {
        btn = document.getElementById('premiumAiToggleBtn');
    }

    // 현재 상태 확인
    const isOn = premiumBox && premiumBox.style.display !== 'none';

    if (isOn) {
        // ON → OFF: premiumAiBox 숨김
        if (btn) {
            btn.dataset.state = 'off';
            btn.textContent = '✨ 프리미엄 AI';
            btn.style.background = 'transparent';
            btn.style.border = '1px solid ' + SHAREHARMONY_PALETTE.aiOrangeBorder;
            btn.style.color = SHAREHARMONY_PALETTE.aiOrangeBorder;
        }
        if (premiumBox) premiumBox.style.display = 'none';

        if (wrapper) wrapper.style.minHeight = '0px';
    } else {
        // OFF → ON: premiumAiBox 표시
        if (btn) {
            btn.dataset.state = 'on';
            btn.textContent = '✨ 프리미엄 ON';
            btn.style.background = 'linear-gradient(135deg, ' + SHAREHARMONY_PALETTE.golden + ', #FFA500)';
            btn.style.border = '1px solid ' + SHAREHARMONY_PALETTE.golden;
            btn.style.color = SHAREHARMONY_PALETTE.black;
        }
        if (premiumBox) {
            premiumBox.style.display = 'block';

            // 신규 프리미엄 1게임 생성 (AI 최적화)
            let bestNumbers = [];
            let maxScore = 0;
            for (let attempt = 0; attempt < 100; attempt++) {
                const candidate = [];
                while (candidate.length < 6) {
                    const n = Math.floor(Math.random() * 45) + 1;
                    if (!candidate.includes(n)) candidate.push(n);
                }
                const currentScore = calculateAIProbability(candidate);
                if (currentScore > maxScore) {
                    maxScore = currentScore;
                    bestNumbers = candidate;
                }
                if (maxScore >= 95) break;
            }

            // 프리미엄 게임 표시 (내용물 채우기)
            setPremiumAiDisplay(bestNumbers);
            drawPremiumTicket(bestNumbers);

            // saveBox는 필터 행으로 이동됨

            // 렌더링 후 실제 높이 측정
            requestAnimationFrame(() => {
                if (wrapper && premiumBox.offsetHeight > 0) {
                    wrapper.style.minHeight = premiumBox.offsetHeight + 'px';
                }
            });
        }
    }
}

/**
 * 프리미엄 AI 단 한 게임 UI 표시
 */
function setPremiumAiDisplay(numbers) {
    const box = document.getElementById('premiumAiBox');
    const analysis = document.getElementById('premiumAnalysis');
    const copyBtn = document.getElementById('copySnsBtn');
    if (!box || !analysis) return;

    box.style.display = 'block';

    // 번호 표시 (최종 정렬)
    const sorted = [...numbers].sort((a, b) => a - b);

    const sum = sorted.reduce((a, b) => a + b, 0);
    const odd = sorted.filter(n => n % 2 !== 0).length;
    const even = 6 - odd;

    // AC 값 계산 (수학적 복잡도)
    const diffs = new Set();
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
            diffs.add(sorted[j] - sorted[i]);
        }
    }
    const acValue = diffs.size - 5;
    const score = calculateAIProbability(sorted);

    analysis.innerHTML = `
        <div style="line-height: 1.8; font-size: 0.85rem;">
            📍 <b>합계 분석:</b> ${sum} (최빈 당첨 구간 진입 완료)<br>
            ⚖️ <b>홀짝 균형:</b> ${odd}:${even} (황금 비율 매칭)<br>
            📐 <b>수학적 안정성(AC):</b> ${acValue} (무작위성 검증 필)<br>
            🏆 <b>AI 분석 신뢰도:</b> <span style="color: ${SHAREHARMONY_PALETTE.goldenTicket}; font-weight: bold;">${score}%</span> (프리미엄 등급)
        </div>
    `;

    // SNS 복사 버튼 설정
    copyBtn.onclick = () => {
        const nextRound = (AppState && AppState.allLotto645Data && AppState.allLotto645Data[0]) ? AppState.allLotto645Data[0].round + 1 : '당첨';
        const msg = `
[🍀 AI 프리미엄 로또 추천 - ${nextRound}회]

지인분께만 조심스럽게 추천드리는 
AI 최적화 분석 번호입니다. 

📌 추천 번호: ${sorted.join(', ')}

📊 분석 근거:
- 합계: ${sum} (통계적 최빈 구간)
- 홀짝: ${odd}:${even} (균형 배정)
- 안정성: AC ${acValue} (수학적 복잡도 검증)
- 분석 신뢰도: ${score}%

행운을 빕니다! 꼭 당첨되시길 바랍니다! ✨
`.trim();

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(msg).then(() => {
                alert('메시지가 복사되었습니다. 카톡이나 SNS에 붙여넣어 공유하세요!');
            });
        } else {
            // 구형 브라우저 대응
            const textArea = document.createElement("textarea");
            textArea.value = msg;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('메시지가 복사되었습니다.');
        }
    };
}

/**
 * 필터를 적용하여 번호 생성
 */
/** 구간선택(시작~종료) 값 반환. 입력값 없으면 AppState 또는 21/255 사용 */
function getSumRange() {
    const startEl = document.getElementById('filterAvgLow');
    const endEl = document.getElementById('filterAvgHigh');
    let start = startEl && startEl.value !== '' ? parseFloat(startEl.value) : (AppState.sumRangeStart != null ? AppState.sumRangeStart : 21);
    let end = endEl && endEl.value !== '' ? parseFloat(endEl.value) : (AppState.sumRangeEnd != null ? AppState.sumRangeEnd : 255);
    if (isNaN(start) || start < 21) start = 21;
    if (isNaN(end) || end > 255) end = 255;
    if (start > end) start = end;
    return { start: start, end: end };
}

function isPastWinningCombo(numbers) {
    if (!AppState.allLotto645Data || AppState.allLotto645Data.length === 0) return false;
    var key = [...numbers].sort(function (a, b) { return a - b; }).join(',');
    if (!AppState._pastWinKeySet) {
        AppState._pastWinKeySet = new Set();
        AppState.allLotto645Data.forEach(function (r) {
            if (r.numbers && r.numbers.length === 6) {
                AppState._pastWinKeySet.add([...r.numbers].sort(function (a, b) { return a - b; }).join(','));
            }
        });
    }
    return AppState._pastWinKeySet.has(key);
}

function generateNumbersWithFilters(existingNumbers = [], skipSumRange, excludeCombos, skipOptionFilters = false) {
    var sumRange = skipSumRange ? null : getSumRange();
    var maxAttempts = 300;
    const oddEvenFilter = skipOptionFilters ? 'none' : (document.getElementById('filterOddEven')?.value || 'none');
    const sequenceFilter = skipOptionFilters ? 'none' : (document.getElementById('filterConsecutive')?.value || 'none');
    const hotColdFilter = skipOptionFilters ? 'none' : (document.getElementById('filterHotCold')?.value || 'none');
    const acFilter = skipOptionFilters ? 'none' : (document.getElementById('filterAC')?.value || 'none');
    
    // 제외수 파싱
    const excludeEl = document.getElementById('filterExclude');
    let excludeNumbers = [];
    if (excludeEl && excludeEl.value.trim() !== '') {
        excludeNumbers = excludeEl.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 45);
    }

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
        var candidate = pickSixWithFilters(oddEvenFilter, sequenceFilter, hotColdFilter, existingNumbers, acFilter, excludeNumbers);

        if (!candidate || candidate.length !== 6) continue;

        if (sumRange) {
            var sum = candidate.reduce(function (a, b) { return a + b; }, 0);
            if (sum < sumRange.start || sum > sumRange.end) continue;
        }
        if (isPastWinningCombo(candidate)) continue;
        if (excludeCombos && excludeCombos.size > 0) {
            var comboKey = [...candidate].sort(function (a, b) { return a - b; }).join(',');
            if (excludeCombos.has(comboKey)) continue;
        }
        return candidate;
    }
    return pickSixWithFilters(oddEvenFilter, sequenceFilter, hotColdFilter, existingNumbers, acFilter, excludeNumbers) || pickSix(excludeNumbers);
}

/**
 * 필터를 적용한 번호 선택
 */
function pickSixWithFilters(oddEvenFilter, sequenceFilter, hotColdFilter, existingNumbers = [], acFilter, excludeNumbers = []) {
    const maxAttempts = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // 기존 번호가 있으면 그것을 포함하여 선택
        let selected;
        if (existingNumbers.length > 0) {
            const remaining = 6 - existingNumbers.length;
            let pool = getAllNumbers().filter(n => !existingNumbers.includes(n));
            if (excludeNumbers.length > 0) {
                const exSet = new Set(excludeNumbers);
                pool = pool.filter(n => !exSet.has(n));
            }
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            selected = [...existingNumbers, ...shuffled.slice(0, remaining)];
        } else {
            selected = pickSix(excludeNumbers);
        }

        selected = selected.sort((a, b) => a - b);

        // 중복 제거 (기존 번호와 새 번호에 중복이 있을 수 있음)
        selected = [...new Set(selected)];
        if (selected.length < 6) {
            // 중복 제거 후 부족하면 추가 선택
            let pool = getAllNumbers().filter(n => !selected.includes(n));
            if (excludeNumbers.length > 0) {
                const exSet = new Set(excludeNumbers);
                pool = pool.filter(n => !exSet.has(n));
            }
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
            const target = parseInt(sequenceFilter, 10);
            const pairs = countSequentialPairs(selected);
            if (target === 0) {
                if (pairs !== 0) continue;
            } else if (target === 3) {
                if (pairs < 3) continue;
            } else {
                if (pairs !== target) continue;
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

        // AC 검증
        if (acFilter && acFilter !== 'none') {
            const targetAC = parseInt(acFilter, 10);
            const ac = calculateAC(selected);
            if (ac !== targetAC) continue;
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

    // 결과 영역(resultContainer)에 선택된 삭제 체크박스가 있는지 확인
    const checkedDeleteBoxes = document.querySelectorAll('.result-delete-checkbox:checked');
    const hasCheckboxSelected = checkedDeleteBoxes.length > 0;

    // 저장박스 및 버튼 활성화/비활성화 (유효한 게임이 있거나, 삭제할 체크박스가 선택된 경우 활성화)
    saveBtn.disabled = !(hasValidGame || hasCheckboxSelected);

    // 유효한 게임이 있으면 회차 자동 세팅 (최신 회차 + 1)
    if (hasValidGame && AppState && AppState.allLotto645Data && AppState.allLotto645Data.length > 0) {
        const latestRound = AppState.allLotto645Data[0].round;
        saveRound.value = latestRound + 1;
        saveRound.readOnly = true; // 읽기 전용으로 설정
        saveRound.disabled = false;
    } else {
        saveRound.disabled = !hasValidGame;
    }

    // 유효한 게임이 있으면 대시보드 업데이트
    updateAiDashboard(hasValidGame);
}

/**
 * AI 분석 대시보드 실시간 업데이트
 */
// [제거] 불필요해진 분석 대시보드 로직
function updateAiDashboard(hasValidGame) { }
function renderAiStats(games, activeTab, tabArea) { }

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
    // [추가] 1. 삭제 대상 확인 (저장공 우측 체크박스)
    const deleteCheckboxes = document.querySelectorAll('.result-delete-checkbox:checked');
    let deleteCount = 0;

    if (deleteCheckboxes.length > 0) {
        if (confirm(`${deleteCheckboxes.length}개의 저장된 기록을 삭제하시겠습니까?`)) {
            const itemsToDelete = Array.from(deleteCheckboxes).map(cb => ({
                round: cb.dataset.round,
                set: cb.dataset.set,
                game: cb.dataset.game
            }));

            try {
                const baseUrl = getApiBaseUrl();
                const response = await fetch(`${baseUrl}/api/delete-lotto023`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: itemsToDelete })
                });

                if (response.ok) {
                    const res = await response.json();
                    if (res.returnValue === 'success') {
                        // 캐시 삭제 및 새로고침
                        if (typeof CACHE_KEYS !== 'undefined' && CACHE_KEYS.LOTTO023) {
                            localStorage.removeItem(CACHE_KEYS.LOTTO023);
                        } else {
                            localStorage.removeItem('LOTTO023_DATA_CACHE_V2');
                        }
                        await loadAndDisplayResults();
                        deleteCount = itemsToDelete.length;
                    }
                }
            } catch (err) {
                console.error('삭제 실패:', err);
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    }

    // 2. 새 게임 저장 로직
    const saveRound = document.getElementById('saveRound');
    if (!saveRound) {
        if (deleteCount > 0) {
            updateSaveBoxState();
            alert(`선택한 ${deleteCount}개의 기록이 삭제되었습니다.`);
        }
        return;
    }

    // 체크된 새 게임들 확인
    const gamesToSave = [];
    const oddEvenFilter = document.getElementById('filterOddEven')?.value || 'none';
    const sequenceFilter = document.getElementById('filterConsecutive')?.value || 'none';
    const hotColdFilter = document.getElementById('filterHotCold')?.value || 'none';

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

    for (let i = 1; i <= 5; i++) {
        const checkbox = document.getElementById(`gameCheckbox${i}`);
        if (checkbox && checkbox.checked) {
            const numbers = AppState.setSelectedBalls[i - 1] || [];
            const validNumbers = numbers.filter(n => n && n >= 1 && n <= 45);
            if (validNumbers.length === 6) {
                const modeBtn = document.getElementById(`modeBtn${i}`);
                let gameMode = '수동';
                if (modeBtn) {
                    if (modeBtn.dataset.mode === 'lucky') gameMode = '행운';
                    else if (modeBtn.dataset.mode === 'auto') gameMode = 'AI추천';
                    else if (modeBtn.dataset.mode === 'semi-auto') gameMode = '반자동';
                    else if (modeBtn.dataset.mode === 'manual') gameMode = '수동';
                }
                const sorted = validNumbers.sort((a, b) => a - b);
                const round = parseInt(saveRound.value);

                // 회차 유효성 검사 (새 게임 저장 시에만)
                if (AppState && AppState.allLotto645Data && AppState.allLotto645Data.length > 0) {
                    const latestRound = AppState.allLotto645Data[0].round;
                    if (round <= latestRound) {
                        alert(`회차는 최종회차(${latestRound}회) 당첨 이후여야 합니다.`);
                        return;
                    }
                }

                const actualOdd = sorted.filter(n => n % 2 === 1).length;
                const actualSeq = (() => {
                    let cnt = 0;
                    for (let j = 1; j < sorted.length; j++) { if (sorted[j] - sorted[j - 1] === 1) cnt++; }
                    return cnt;
                })();
                const actualHot = (() => {
                    const { hot } = getHotColdNumbersBeforeRound(round);
                    const hotSet = new Set(hot);
                    return sorted.filter(n => hotSet.has(n)).length;
                })();

                gamesToSave.push({
                    '회차': round.toString(),
                    '세트': '',
                    '게임': i.toString(),
                    '홀짝': (oddEvenValue === -1 ? actualOdd : oddEvenValue).toString(),
                    '연속': (sequenceValue === 0 ? actualSeq : sequenceValue).toString(),
                    '핫콜': (hotColdValue === -1 ? actualHot : hotColdValue).toString(),
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
        if (deleteCount > 0) {
            if (typeof CACHE_KEYS !== 'undefined' && CACHE_KEYS.LOTTO023) {
                localStorage.removeItem(CACHE_KEYS.LOTTO023);
            } else {
                localStorage.removeItem('LOTTO023_DATA_CACHE_V2');
            }
            await loadAndDisplayResults();
            updateSaveBoxState();
            alert(`선택한 ${deleteCount}개의 기록이 삭제되었습니다.`);
        } else {
            // 아무것도 안 했으면 알림
            alert('저장할 게임이나 삭제할 기록이 선택되지 않았습니다.');
        }
        return;
    }

    // 동일 회차·세트/게임이 있으면 서버에서 세트+1, 게임 1부터 부여하므로 별도 경고 없이 전송

    // 새 게임 서버 전송
    try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/save-lotto023`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ games: gamesToSave })
        });

        if (!response.ok) throw new Error(`서버 응답 오류 (${response.status})`);

        const result = await response.json();
        if (result.returnValue === 'success') {
            if (typeof CACHE_KEYS !== 'undefined' && CACHE_KEYS.LOTTO023) {
                localStorage.removeItem(CACHE_KEYS.LOTTO023);
            } else {
                localStorage.removeItem('LOTTO023_DATA_CACHE_V2');
            }
            await loadAndDisplayResults();

            // 필드 초기화
            AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
            for (let i = 1; i <= 5; i++) {
                const cb = document.getElementById(`gameCheckbox${i}`);
                if (cb) { cb.checked = false; cb.disabled = true; }
                const modeBtn = document.getElementById(`modeBtn${i}`);
                if (modeBtn) {
                    modeBtn.dataset.mode = 'manual';
                    modeBtn.textContent = '수동';
                    delete modeBtn.dataset.semiFrom;
                }
            }
            // 드롭다운 필터를 조회회차 통계값으로 적용
            const listData = AppState.currentViewNumbersBaseData || AppState.currentStatsRounds || AppState.allLotto645Data;
            if (listData && listData.length > 0) extractAndApplyFilters(listData);
            if (AppState.optionFilters) {
                AppState.optionFilters.oddEven = document.getElementById('filterOddEven')?.value || 'none';
                AppState.optionFilters.hotCold = document.getElementById('filterHotCold')?.value || 'none';
                AppState.optionFilters.consecutive = document.getElementById('filterConsecutive')?.value || 'none';
            }
            generateAllGames();
            updateSaveBoxState();

            const msg = deleteCount > 0 ? `새 게임이 저장되고 ${deleteCount}개의 기록이 삭제되었습니다.` : '저장 완료!';
            alert(msg);
        } else {
            throw new Error(result.error || '알 수 없는 오류');
        }
    } catch (error) {
        console.error('저장 오류:', error);
        alert('저장 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 선택삭제 버튼 설정 + 전체선택 체크박스
 */
function setupDeleteSelectedButton() {
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const selectAllCheckbox = document.getElementById('selectAllDeleteCheckbox');
    const resultContainer = document.getElementById('resultContainer');
    if (!deleteSelectedBtn || !resultContainer) return;

    // 전체선택 체크박스 상태 갱신 (일부 선택 = indeterminate)
    const updateSelectAllState = () => {
        if (!selectAllCheckbox) return;
        const all = document.querySelectorAll('.result-delete-checkbox');
        const checked = document.querySelectorAll('.result-delete-checkbox:checked');
        if (all.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checked.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checked.length === all.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    };

    // 체크박스 상태 변경을 감지하기 위한 함수
    const updateDeleteBtnState = () => {
        const checkedBoxes = document.querySelectorAll('.result-delete-checkbox:checked');
        if (checkedBoxes.length > 0) {
            deleteSelectedBtn.disabled = false;
            deleteSelectedBtn.style.color = SHAREHARMONY_PALETTE.aiOrange;
            deleteSelectedBtn.style.borderColor = SHAREHARMONY_PALETTE.aiOrange;
            deleteSelectedBtn.style.cursor = 'pointer';
        } else {
            deleteSelectedBtn.disabled = true;
            deleteSelectedBtn.style.color = SHAREHARMONY_PALETTE.textMuted;
            deleteSelectedBtn.style.borderColor = SHAREHARMONY_PALETTE.textMuted;
            deleteSelectedBtn.style.cursor = 'default';
        }
        updateSelectAllState();
        updateSaveBoxState(); // 선택 상태에 따라 저장 버튼 활성/비활성 업데이트
    };

    // 전체선택 체크박스 클릭: 모든 삭제 체크박스 일괄 선택/해제
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', () => {
            const checked = selectAllCheckbox.checked;
            document.querySelectorAll('.result-delete-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            updateDeleteBtnState();
        });
    }

    // 정적인 이벤트뿐만 아니라 렌더링 후 동적으로 붙은 체크박스 이벤트 처리를 위해 이벤트 위임 사용
    resultContainer.addEventListener('change', (e) => {
        if (e.target && e.target.classList.contains('result-delete-checkbox')) {
            updateDeleteBtnState();
        }
    });

    deleteSelectedBtn.addEventListener('click', async () => {
        const checkedBoxes = document.querySelectorAll('.result-delete-checkbox:checked');

        if (checkedBoxes.length > 0) {
            // 선택삭제 수행
            if (confirm(`선택한 ${checkedBoxes.length}개의 기록을 삭제하시겠습니까?`)) {
                const itemsToDel = [];
                checkedBoxes.forEach(box => {
                    itemsToDel.push({
                        round: box.dataset.round,
                        set: box.dataset.set || '',
                        game: box.dataset.game
                    });
                });

                try {
                    const baseUrl = getApiBaseUrl();
                    const response = await fetch(`${baseUrl}/api/delete-lotto023`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items: itemsToDel })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        if (result.returnValue === 'success') {
                            if (typeof CACHE_KEYS !== 'undefined' && CACHE_KEYS.LOTTO023) {
                                localStorage.removeItem(CACHE_KEYS.LOTTO023);
                            } else {
                                localStorage.removeItem('LOTTO023_DATA_CACHE_V2');
                            }
                            await loadAndDisplayResults();
                            updateSaveBoxState();
                            alert(`선택한 ${checkedBoxes.length}개의 기록이 삭제되었습니다.`);
                        } else {
                            throw new Error(result.error || '알 수 없는 오류');
                        }
                    } else {
                        throw new Error('서버 응답 오류');
                    }
                } catch (err) {
                    console.error('선택 삭제 실패:', err);
                    alert('삭제 중 오류가 발생했습니다: ' + err.message);
                }
            }
        } else {
            alert('삭제할 기록의 체크박스를 선택해주세요.');
        }
    });
}

/**
 * 모든 저장된 결과 삭제
 */
async function deleteAllResults() {
    try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/delete-all-lotto023`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.returnValue === 'success') {
                // 캐시 삭제 및 새로고침
                if (typeof CACHE_KEYS !== 'undefined' && CACHE_KEYS.LOTTO023) {
                    localStorage.removeItem(CACHE_KEYS.LOTTO023);
                } else {
                    localStorage.removeItem('LOTTO023_DATA_CACHE_V2');
                }
                await loadAndDisplayResults();
                alert('모든 기록이 삭제되었습니다.');
            }
        }
    } catch (err) {
        console.error('전체 삭제 실패:', err);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

/**
 * 로또 당첨 순위 계산
 * @param {number[]} selectedNumbers 선택한 6개 번호
 * @param {number[]} winningNumbers 당첨된 6개 번호
 * @param {number} bonusNumber 보너스 번호
 * @returns {Object} { rank, matchCount, isBonusMatch }
 */
function getLottoRank(selectedNumbers, winningNumbers, bonusNumber) {
    if (!selectedNumbers || !winningNumbers) return { rank: 0, matchCount: 0, isBonusMatch: false };

    const selectedSet = new Set(selectedNumbers);
    const winningSet = new Set(winningNumbers);

    let matchCount = 0;
    selectedNumbers.forEach(num => {
        if (winningSet.has(num)) matchCount++;
    });

    const isBonusMatch = selectedSet.has(bonusNumber);

    let rank = 0;
    if (matchCount === 6) rank = 1;
    else if (matchCount === 5 && isBonusMatch) rank = 2;
    else if (matchCount === 5) rank = 3;
    else if (matchCount === 4) rank = 4;
    else if (matchCount === 3) rank = 5;

    return { rank, matchCount, isBonusMatch };
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
            resultContainer.innerHTML = '<p style="text-align: center; color: ' + SHAREHARMONY_PALETTE.textSecondary + '; font-size: 0.9rem;">저장된 결과가 없습니다.</p>';
            const summaryContainer = document.getElementById('resultSummary');
            if (summaryContainer) summaryContainer.innerHTML = '';
            const selectAll = document.getElementById('selectAllDeleteCheckbox');
            if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
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

        // 전체 당첨 요약 계산
        const summary = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: lotto023Data.length };
        lotto023Data.forEach(game => {
            const winRound = AppState.allLotto645Data.find(r => r.round === Number(game.round));
            if (winRound && winRound.numbers && game.numbers) {
                const res = getLottoRank(game.numbers, winRound.numbers, winRound.bonus);
                if (res.rank > 0) summary[res.rank]++;
            }
        });

        const summaryHtml = Object.entries(summary)
            .filter(([k, v]) => k !== 'total' && v > 0)
            .map(([k, v]) => `<span style="font-weight: bold; margin-right: 10px;">${k}등: <span style="color: var(--color-primary);">${v}건</span></span>`)
            .join('');

        const summaryContainer = document.getElementById('resultSummary');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                전체 <span style="font-weight: bold;">${summary.total}게임</span>
                <span style="color: ${SHAREHARMONY_PALETTE.textMuted}; margin: 0 4px;">/</span>
                ${summaryHtml || '<span style="color: ' + SHAREHARMONY_PALETTE.textMuted + '; font-weight: normal;">미추첨 내역</span>'}
            `;
        }

        resultContainer.innerHTML = ''; // 기존 요약 박스 제거 후 초기화
        const selectAll = document.getElementById('selectAllDeleteCheckbox');
        if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }

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
                resultLine.style.padding = '0 6px';
                resultLine.style.height = '24px';
                resultLine.style.minHeight = '24px';
                resultLine.style.boxSizing = 'border-box';

                // 정보 표시: 회차 / 게임 / 홀짝 / 연속 / 핫콜 / 모드
                const infoText = document.createElement('div');
                infoText.style.display = 'flex';
                infoText.style.alignItems = 'center';
                infoText.style.gap = '6px';
                infoText.style.fontSize = '0.8em';
                infoText.style.color = SHAREHARMONY_PALETTE.textPrimary;
                infoText.style.fontWeight = 'normal';
                infoText.style.minWidth = '140px';
                infoText.style.flex = '1';
                infoText.style.whiteSpace = 'nowrap'; // 한 줄로 출력 보장
                infoText.style.overflow = 'hidden';
                infoText.style.textOverflow = 'ellipsis';

                const oe = (game.oddEven != null && game.oddEven !== "") ? game.oddEven : "-";
                const seq = (game.sequence != null && game.sequence !== "") ? game.sequence : "-";
                const hc = (game.hotCold != null && game.hotCold !== "") ? game.hotCold : "-";
                const mode = (game.gameMode === '자동' ? 'AI추천' : game.gameMode) || "-";

                const setVal = game.set !== undefined ? game.set : game['세트'];
                const setDisplay = setVal !== undefined && setVal !== null && setVal !== '' ? `${setVal}-` : '';

                // [추가] 당첨 결과 계산 및 배지 생성
                let rankBadgeHtml = '';
                let matchNumsSet = new Set();
                if (winRound && winRound.numbers && game.numbers) {
                    const result = getLottoRank(game.numbers, winRound.numbers, winRound.bonus);
                    if (result.rank > 0) {
                        const rankColors = {
                            1: '#FBC400', // 1등 (금색)
                            2: '#69C8F2', // 2등 (하늘색)
                            3: '#FF7272', // 3등 (빨간색)
                            4: '#AAAAAA', // 4등 (회색)
                            5: '#B0D840'  // 5등 (연두색)
                        };
                        const color = rankColors[result.rank] || SHAREHARMONY_PALETTE.bgLighter;
                        rankBadgeHtml = `<span style="background-color: ${color}; color: ${SHAREHARMONY_PALETTE.white}; padding: 1px 6px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; margin-right: 8px;">${result.rank}등</span>`;
                    }

                    // 당첨된 번호 강조를 위해 셋 준비
                    matchNumsSet = new Set(game.numbers.filter(n => winRound.numbers.includes(n)));
                    if (result.isBonusMatch) matchNumsSet.add(winRound.bonus);
                }

                infoText.innerHTML = `<span style="font-size: 1.125em; font-weight: bold; margin-left: 2px; margin-right: 12px;">${game.round} 회</span> ${rankBadgeHtml}${setDisplay}${game.game}게임 / 홀${oe} / 연${seq} / 핫${hc} / ${mode}`;

                // 우측 결과공 컨테이너 - 고정 슬롯 개념 적용 (7th slot: 보너스 공 또는 체크박스)
                const resultBallsContainer = document.createElement('div');
                resultBallsContainer.style.display = 'flex';
                resultBallsContainer.style.gap = '8px';
                resultBallsContainer.style.alignItems = 'center';
                resultBallsContainer.style.marginLeft = 'auto';
                resultBallsContainer.style.width = '260px'; // 전체 공 + 체크박스 정렬을 위해 확보 (배지 추가 고려하여 너비 유지)
                resultBallsContainer.style.justifyContent = 'flex-end';

                // 결과공 생성 (6개)
                if (game.numbers && Array.isArray(game.numbers)) {
                    game.numbers.slice(0, 6).forEach(num => {
                        const ball = createStatBall(num, 22, '0.8rem');

                        // [수정] 사용자의 요청: 저장공은 기본 흰색, 당첨 회차와 일치하는 번호만 컬러 적용
                        if (winningNumbers) {
                            if (!winningNumbers.has(num)) {
                                // 미당첨 번호: 화이트 스타일 강제 적용
                                ball.classList.add('saved-white');
                                ball.classList.remove(getBallColorClass(num));
                                ball.style.opacity = '0.6';
                            } else {
                                // 당첨된 공만 컬러 유지 (기본 createStatBall에서 적용됨)
                                ball.style.boxShadow = '0 0 8px rgba(0,0,0,0.4)';
                                ball.style.fontWeight = 'bold';
                                ball.style.transform = 'scale(1.1)';
                            }
                        } else {
                            // 당첨 데이터가 없는 경우 (미래 회차): 기본 흰색
                            ball.classList.add('saved-white');
                            ball.classList.remove(getBallColorClass(num));
                        }
                        resultBallsContainer.appendChild(ball);
                    });
                }

                // 슬롯 7 & 체크박스 통합: 사용자 요청대로 보너스 공 위치에 체크박스 배치
                const slot7 = document.createElement('div');
                slot7.style.display = 'flex';
                slot7.style.alignItems = 'center';
                slot7.style.justifyContent = 'center'; // 보너스공 중앙 정렬
                slot7.style.minWidth = '0';
                slot7.style.gap = '0';
                slot7.style.flexShrink = '0';

                if (winRound && winRound.bonus) {
                    const separator = document.createElement('span');
                    separator.textContent = '+';
                    separator.style.fontSize = '0.75rem';
                    separator.style.margin = '0 2px';
                    slot7.appendChild(separator);

                    const bonusBall = createStatBall(winRound.bonus, 22, '0.8rem');

                    // [수정] 보너스 번호 일치 여부 확인 (2등 여부와 관련)
                    if (game.numbers && game.numbers.includes(winRound.bonus)) {
                        bonusBall.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
                        bonusBall.style.fontWeight = 'bold';
                    } else {
                        bonusBall.style.opacity = '0.6';
                        bonusBall.style.backgroundColor = SHAREHARMONY_PALETTE.white;
                        bonusBall.style.color = SHAREHARMONY_PALETTE.black;
                        bonusBall.style.border = '1.5px solid #000000';
                    }
                    slot7.appendChild(bonusBall);
                } else if (!winRound) {
                    // 당첨 데이터가 아예 없는 경우 (미래 회차 등) 빈 칸 표시 유지 혹은 기본 스타일
                }

                // 삭제용 체크박스 생성
                const deleteCheckbox = document.createElement('input');
                deleteCheckbox.type = 'checkbox';
                deleteCheckbox.className = 'result-delete-checkbox';
                deleteCheckbox.style.cursor = 'pointer';
                deleteCheckbox.style.width = '18px';
                deleteCheckbox.style.height = '18px';
                deleteCheckbox.style.flexShrink = '0';
                deleteCheckbox.style.marginLeft = '4px'; // 오른쪽 끝 여백
                deleteCheckbox.style.accentColor = 'var(--color-accent)';

                deleteCheckbox.dataset.round = game.round;
                deleteCheckbox.dataset.set = (game.set !== undefined ? game.set : game['세트']) || '';
                deleteCheckbox.dataset.game = game.game;

                resultBallsContainer.appendChild(slot7);

                resultLine.appendChild(infoText);
                resultLine.appendChild(resultBallsContainer);
                resultLine.appendChild(deleteCheckbox); // 체크박스를 가장 우측에 배치
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
 * 8자리 숫자를 yy/mm/dd 형식으로 치환 (조회기간 검증용)
 * - 19xx/20xx 시작 시 YYYYMMDD → yy/mm/dd
 * - 00000000 → 00/00/00
 * - 그 외 8자리 시 YYMMDDxx → yy/mm/dd (앞 6자리 사용)
 */
function formatEightDigitsToYYMMDD(str) {
    if (!str || typeof str !== 'string') return '';
    const digits = str.replace(/\D/g, '');
    if (digits.length !== 8) return '';
    const a = digits.substring(0, 2);
    let yy, mm, dd;
    if (a === '19' || a === '20') {
        yy = digits.substring(2, 4);
        mm = digits.substring(4, 6);
        dd = digits.substring(6, 8);
    } else {
        yy = digits.substring(0, 2);
        mm = digits.substring(2, 4);
        dd = digits.substring(4, 6);
    }
    return yy + '/' + mm + '/' + dd;
}

/**
 * 조회기간 입력을 yy/mm/dd 형식으로 통일
 * - 8자리 숫자, 00000000 → yy/mm/dd
 * - 999999, 99999999 → 당일(yy/mm/dd)
 * - yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd
 * @returns {string|null} yy/mm/dd 문자열 또는 변환 불가 시 null
 */
function normalizeToYYMMDD(value) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const digitsOnly = trimmed.replace(/\D/g, '');

    // 999999 또는 99999999 → 당일
    if (digitsOnly === '999999' || digitsOnly === '99999999') {
        return formatDateYYMMDD(new Date());
    }

    // 8자리 숫자 (00000000 포함)
    if (digitsOnly.length === 8) {
        const formatted = formatEightDigitsToYYMMDD(digitsOnly);
        return formatted || null;
    }

    // yyyy-mm-dd
    const dashMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dashMatch) {
        const yy = dashMatch[1].substring(2);
        return `${yy}/${dashMatch[2]}/${dashMatch[3]}`;
    }

    // yyyy/mm/dd
    const slashMatch = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (slashMatch) {
        const yy = slashMatch[1].substring(2);
        return `${yy}/${slashMatch[2]}/${slashMatch[3]}`;
    }

    // 이미 yy/mm/dd 형식 (2자리/2자리/2자리)
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    return null;
}

/**
 * 조회기간 yy/mm/dd 형식 검증 (유효한 날짜인지 확인)
 * 00/00/00(00000000 치환)은 전체 구간용으로 허용
 * @returns {{ valid: boolean, message?: string }}
 */
function validateYYMMDDInput(str) {
    if (!str || !str.trim()) return { valid: true };
    const value = str.trim();
    if (!/^\d{2}\/\d{2}\/\d{2}$/.test(value)) {
        return { valid: false, message: '조회기간은 yy/mm/dd 형식으로 입력해 주세요. (예: 26/03/09)' };
    }
    if (value === '00/00/00') return { valid: true };
    const date = parseDate(value);
    if (!date || date === '000000' || date === '999999') {
        return { valid: false, message: '유효한 날짜가 아닙니다. (yy/mm/dd)' };
    }
    if (isNaN(date.getTime())) {
        return { valid: false, message: '유효한 날짜가 아닙니다.' };
    }
    const [, mm, dd] = value.split('/').map(Number);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
        return { valid: false, message: '월(01-12), 일(01-31)을 확인해 주세요.' };
    }
    return { valid: true };
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
 * yy/mm/dd 형식을 YYYY-MM-DD 형식으로 변환 (000000/999999/00/00/00 특수 처리)
 */
function convertFromYYMMDD(dateString) {
    if (!dateString) return '';
    const trimmed = dateString.trim();
    if (trimmed === '000000' || trimmed === '999999' || trimmed === '00/00/00') {
        return trimmed === '00/00/00' ? '000000' : trimmed;
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
        // 특수값 000000, 00/00/00 또는 999999 처리
        if (value === '000000' || value === '00/00/00') {
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
    const startRoundInput = document.getElementById('startRound');
    const endRoundInput = document.getElementById('endRound');
    const startRoundDateSpan = document.getElementById('startRoundDate');
    const endRoundDateSpan = document.getElementById('endRoundDate');

    // Sync from date to round
    if (document.activeElement === startDateInput || document.activeElement === endDateInput) {
        const startRound = findRoundFromDateInput(startDateInput.value, true);
        if (startRound) startRoundInput.value = startRound;

        const endRound = findRoundFromDateInput(endDateInput.value, false);
        if (endRound) endRoundInput.value = endRound;
    }

    // Sync from round to date
    if (document.activeElement === startRoundInput || document.activeElement === endRoundInput) {
        const startDate = convertRoundToDate(startRoundInput.value);
        if (startDate) startDateInput.value = startDate;

        const endDate = convertRoundToDate(endRoundInput.value);
        if (endDate) endDateInput.value = endDate;
    }

    // Update date spans for rounds
    const startDateForRound = convertRoundToDate(startRoundInput.value);
    if (startRoundDateSpan) startRoundDateSpan.textContent = startDateForRound ? `(${startDateForRound})` : '';

    const endDateForRound = convertRoundToDate(endRoundInput.value);
    if (endRoundDateSpan) endRoundDateSpan.textContent = endDateForRound ? `(${endDateForRound})` : '';
}

/**
 * 회차 범위 표시 업데이트
 */
function updateRoundRangeDisplay() {
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
    const targetRoundInput = document.getElementById('targetRound');
    if (!targetRoundInput) return;
    // 이제 단일 필드이므로 이전의 복잡한 동기화 로직은 무시하거나 간소화
}

/**
 * 날짜 입력 -> 회차 자동 계산
 */
function syncDateToRound() {
    // 이제 단일 필드이므로 이전의 동기화 로직 무시
}


function setupRangeTypeSelectors() {
    const roundRadio = document.getElementById('rangeTypeRound');
    const dateRadio = document.getElementById('rangeTypeDate');
    const startRound = document.getElementById('startRound');
    const endRound = document.getElementById('endRound');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const startRoundDateSpan = document.getElementById('startRoundDate');
    const endRoundDateSpan = document.getElementById('endRoundDate');
    if (!roundRadio || !dateRadio) return;

    function syncFields() {
        if (roundRadio.checked) {
            if (startDate) startDate.value = '';
            if (endDate) endDate.value = '';
            if (startRoundDateSpan) {
                const d = convertRoundToDate(startRound.value);
                startRoundDateSpan.textContent = d ? '(' + d + ')' : '';
            }
            if (endRoundDateSpan) {
                const d = convertRoundToDate(endRound.value);
                endRoundDateSpan.textContent = d ? '(' + d + ')' : '';
            }
        } else {
            if (startRound) startRound.value = '';
            if (endRound) endRound.value = '';
            if (startRoundDateSpan) startRoundDateSpan.textContent = '';
            if (endRoundDateSpan) endRoundDateSpan.textContent = '';
        }
    }

    roundRadio.addEventListener('change', syncFields);
    dateRadio.addEventListener('change', syncFields);
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
    const acCounts = {};
    let minSum = Infinity;
    let maxSum = -Infinity;

    const hcResult = sortAndSplitHotCold(calculateWinStats(filteredData), calculateAppearanceStats(filteredData), calculateConsecutiveStats(filteredData));
    const hotSet = new Set(hcResult.hot);

    filteredData.forEach(round => {
        const nums = round.numbers;
        if (!nums || nums.length !== 6) return;

        let oddCount = 0;
        nums.forEach(n => { if (n % 2 !== 0) oddCount++; });
        const oeKey = `${oddCount}-${6 - oddCount}`;
        oddEvenCounts[oeKey] = (oddEvenCounts[oeKey] || 0) + 1;

        const sorted = [...nums].sort((a, b) => a - b);
        let seqPairCount = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i + 1] === sorted[i] + 1) seqPairCount++;
        }
        const seqKey = seqPairCount === 0 ? "none" : (seqPairCount >= 3 ? "3" : seqPairCount.toString());
        sequenceCounts[seqKey] = (sequenceCounts[seqKey] || 0) + 1;

        let hotCount = 0;
        nums.forEach(n => { if (hotSet.has(parseInt(n, 10))) hotCount++; });
        const hcKey = `${hotCount}-${6 - hotCount}`;
        hotColdCounts[hcKey] = (hotColdCounts[hcKey] || 0) + 1;

        const ac = calculateAC(sorted);
        const acKey = ac.toString();
        acCounts[acKey] = (acCounts[acKey] || 0) + 1;

        const sum = nums.reduce((a, b) => a + b, 0);
        if (sum < minSum) minSum = sum;
        if (sum > maxSum) maxSum = sum;
    });

    const getMode = (counts) => {
        let mode = 'none', maxFreq = -1;
        for (const key in counts) {
            if (counts[key] > maxFreq) { maxFreq = counts[key]; mode = key; }
        }
        return mode;
    };

    const bestOE = getMode(oddEvenCounts);
    const bestSeq = getMode(sequenceCounts);
    const bestHC = getMode(hotColdCounts);
    const bestAC = getMode(acCounts);

    // 게임공(가운데) 패널 필터에 적용
    const oeEl = document.getElementById('filterOddEven');
    const seqEl = document.getElementById('filterConsecutive');
    const hcEl = document.getElementById('filterHotCold');
    const acEl = document.getElementById('filterAC');
    const sumLowEl = document.getElementById('filterAvgLow');
    const sumHighEl = document.getElementById('filterAvgHigh');

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
    if (acEl) {
        if ([...acEl.options].some(opt => opt.value === bestAC)) acEl.value = bestAC;
        else acEl.value = 'none';
    }
    var chartVals = AppState.chartEndRoundValues;
    var chartMin = (chartVals && chartVals.min != null) ? parseFloat(chartVals.min.toFixed(1)) : null;
    var chartMax = (chartVals && chartVals.max != null) ? parseFloat(chartVals.max.toFixed(1)) : null;
    if (sumLowEl) {
        var lowVal = chartMin != null ? chartMin : (minSum !== Infinity ? minSum : null);
        if (lowVal != null) {
            sumLowEl.value = lowVal;
            AppState.sumRangeStart = lowVal;
        }
    }
    if (sumHighEl) {
        var highVal = chartMax != null ? chartMax : (maxSum !== -Infinity ? maxSum : null);
        if (highVal != null) {
            sumHighEl.value = highVal;
            AppState.sumRangeEnd = highVal;
        }
    }
}

/**
 * 날짜 범위 또는 회차 범위 변경 시 통계 및 회차별 당첨번호 업데이트
 */
function updateStatsByDateRange() {
    // console.log('[updateStatsByDateRange] Called');

    const rangeType = document.querySelector('input[name="rangeType"]:checked')?.value || 'round';

    let startRound, endRound;

    if (rangeType === 'round') {
        const startInput = document.getElementById('startRound');
        const endInput = document.getElementById('endRound');

        if (!startInput || !endInput) return;

        const sVal = startInput.value.trim();
        const eVal = endInput.value.trim();

        if (!sVal || !eVal) {
            alert('조회할 회차 범위를 입력해주세요.');
            return;
        }

        startRound = parseInt(sVal, 10);
        endRound = parseInt(eVal, 10);

        if (isNaN(startRound) || isNaN(endRound)) {
            alert('회차는 숫자로 입력해주세요.');
            return;
        }

    } else { // date — 조회기간 yy/mm/dd 검증
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');

        if (!startDateInput || !endDateInput) return;

        let startDateValue = startDateInput.value.trim();
        let endDateValue = endDateInput.value.trim();

        if (!startDateValue || !endDateValue) {
            alert('조회할 기간을 입력해주세요.');
            return;
        }

        // 8자리, 00000000, yyyy-mm-dd, yyyy/mm/dd → yy/mm/dd 치환
        const normStart = normalizeToYYMMDD(startDateValue);
        if (normStart !== null) {
            startDateInput.value = normStart;
            startDateValue = normStart;
        }
        const normEnd = normalizeToYYMMDD(endDateValue);
        if (normEnd !== null) {
            endDateInput.value = normEnd;
            endDateValue = normEnd;
        }

        const startCheck = validateYYMMDDInput(startDateValue);
        if (!startCheck.valid) {
            alert(startCheck.message || '시작일을 yy/mm/dd 형식으로 입력해 주세요.');
            return;
        }
        const endCheck = validateYYMMDDInput(endDateValue);
        if (!endCheck.valid) {
            alert(endCheck.message || '종료일을 yy/mm/dd 형식으로 입력해 주세요.');
            return;
        }

        startRound = findRoundFromDateInput(startDateValue, true);
        endRound = findRoundFromDateInput(endDateValue, false);

        if (startRound === null || endRound === null) {
            alert('입력한 기간에 해당하는 회차를 찾을 수 없습니다.');
            return;
        }
    }


    if (startRound > endRound) {
        alert('시작회차가 종료회차보다 클 수 없습니다.');
        return;
    }

    let filteredData = [];
    // 회차 범위 필터링
    filteredData = AppState.allLotto645Data.filter(r => r.round >= startRound && r.round <= endRound);

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
        const wsBox0 = document.getElementById('winStructureBox');
        if (wsBox0) wsBox0.style.display = 'none';
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
    AppState.consecutiveStatsMap = calculateConsecutiveStats(filteredData);

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

    const wsBox = document.getElementById('winStructureBox');
    if (wsBox) wsBox.style.display = '';

    // 시작회차~종료회차 사이의 특성을 추출하여 옵션필터에 적용
    extractAndApplyFilters(filteredData);

    // 차트 업데이트: 필터링된 데이터 기반으로 렌더링
    if (typeof renderMonthlyAverageChart === 'function') {
        renderMonthlyAverageChart(filteredData);
    }
    if (typeof renderNumberFrequencyChart === 'function') {
        renderNumberFrequencyChart(filteredData);
    }
    if (typeof renderWinFrequencyChart === 'function') {
        renderWinFrequencyChart(filteredData);
    }

    // 우측 패널 합계값에 마지막(최신) 회차 당첨번호 합계 반영 (차트 렌더링 이후)
    if (filteredData.length > 0) {
        const lastRound = filteredData[0];
        const nums = (lastRound && Array.isArray(lastRound.numbers)) ? lastRound.numbers : [];
        const lastSum = nums.reduce((a, b) => a + (Number(b) || 0), 0);
        const sumValEl = document.getElementById('resultSumValue');
        if (sumValEl && lastSum > 0) {
            sumValEl.value = lastSum;
            if (!AppState.resultFilters) AppState.resultFilters = {};
            AppState.resultFilters.sumValue = lastSum;
            renderViewNumbersList(filteredData);
        }
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
 * 통계공 렌더링 (전체 데이터 표시)
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

function updateAverageSumDisplay(data) {
    const el = document.getElementById('resultRoundRange');
    if (!el) return;

    if (!data || data.length === 0) {
        el.textContent = '[ 0000 ~ 0000, 000회 ]';
        return;
    }

    const rounds = data.map(r => Number(r.round)).filter(r => !isNaN(r));
    const startRound = Math.min(...rounds);
    const endRound = Math.max(...rounds);
    const count = data.length;

    const startStr = startRound.toString().padStart(4, '0');
    const endStr = endRound.toString().padStart(4, '0');
    const countStr = count.toString().padStart(3, '0');

    el.textContent = `[ ${startStr} ~ ${endStr}, ${countStr}회 ]`;
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
    roundLine.style.marginBottom = '0';
    roundLine.style.padding = '0 8px';
    roundLine.style.height = '24px';
    roundLine.style.minHeight = '24px';
    roundLine.style.boxSizing = 'border-box';
    const roundInfo = document.createElement('span');
    roundInfo.style.fontWeight = '400';
    roundInfo.style.fontSize = '0.85rem';
    roundInfo.style.minWidth = '100px';
    roundInfo.style.color = SHAREHARMONY_PALETTE.textPrimary;
    roundInfo.style.opacity = '1';
    roundInfo.style.display = 'flex';
    roundInfo.style.alignItems = 'center';
    roundInfo.style.gap = '4px';
    roundInfo.style.flexShrink = '0';
    roundInfo.style.whiteSpace = 'nowrap';
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
    sumDisplay.style.color = SHAREHARMONY_PALETTE.error;
    sumDisplay.style.fontWeight = 'bold';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'round-date-display';
    dateSpan.textContent = formattedDate;
    const minMaxSpan = document.createElement('span');
    minMaxSpan.className = 'round-minmax-display';
    minMaxSpan.style.fontSize = '0.78rem';
    minMaxSpan.style.color = SHAREHARMONY_PALETTE.textPrimary;
    minMaxSpan.style.fontFamily = "'Courier New', Courier, monospace";
    minMaxSpan.style.whiteSpace = 'nowrap';
    const rv = AppState.chartRoundValuesMap && AppState.chartRoundValuesMap[round.round];
    if (rv) {
        const mn = rv.min != null ? (rv.min).toFixed(1) : '-';
        const av = rv.avg != null ? (rv.avg).toFixed(1) : '-';
        const mx = rv.max != null ? (rv.max).toFixed(1) : '-';
        minMaxSpan.textContent = `(${mn}/${av}/${mx})`;
    }

    roundInfo.appendChild(roundNumber);
    roundInfo.appendChild(roundUnit);
    roundInfo.appendChild(sumDisplay);
    roundInfo.appendChild(minMaxSpan);
    roundInfo.appendChild(dateSpan);
    const numbersContainer = document.createElement('div');
    numbersContainer.style.display = 'flex';
    numbersContainer.style.alignItems = 'center';
    numbersContainer.style.gap = '2px';
    numbersContainer.style.justifyContent = 'flex-end';
    numbersContainer.style.flexWrap = 'nowrap';
    numbersContainer.style.flexShrink = '0';
    numbersContainer.style.marginLeft = 'auto';
    const nums = (round.numbers || []).map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const runs = getConsecutiveRuns(nums, 2);
    const seqSet = new Set(runs.flat());
    round.numbers.forEach(num => {
        const ball = createStatBall(num, 22, '0.8rem');
        if (seqSet.has(parseInt(num, 10))) {
            ball.classList.add('ball-seq3');
        }
        numbersContainer.appendChild(ball);
    });
    if (round.bonus && round.bonus > 0) {
        const plusSign = createPlusSign('color: #000000; font-weight: bold; margin: 0 4px; font-size: 1rem;');
        numbersContainer.appendChild(plusSign);
        const bonusBall = createStatBall(round.bonus, 22, '0.8rem');
        numbersContainer.appendChild(bonusBall);
    }
    roundLine.appendChild(roundInfo);
    roundLine.appendChild(numbersContainer);

    // 클릭 시 상세 정보 모달 표시
    roundLine.style.cursor = 'pointer';
    roundLine.addEventListener('click', function (event) {
        if (typeof loadAndShowLottoRound === 'function') {
            loadAndShowLottoRound(round.round, event.currentTarget);
        }
    });

    return roundLine;
}

/**
 * 당첨공(회차별 당첨번호) 목록 렌더링
 * data 인자가 없으면 전체 데이터 사용
 */
function showRoundInfoBubble(htmlContent, targetElement) {
    // 기존 말풍선 제거
    const existingBubble = document.querySelector('.round-info-bubble');
    if (existingBubble) {
        existingBubble.remove();
    }

    const bubble = document.createElement('div');
    bubble.className = 'round-info-bubble';
    bubble.innerHTML = htmlContent;

    // 닫기 버튼 추가
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'round-info-bubble-close';
    closeBtn.onclick = () => bubble.remove();
    bubble.prepend(closeBtn);

    document.body.appendChild(bubble);

    // 위치 계산
    const rect = targetElement.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    // 화면 오른쪽을 벗어나는지 확인
    let left = window.scrollX + rect.left - bubbleRect.width - 15;
    if (left < 0) {
        left = window.scrollX + rect.right + 15;
        // 오른쪽으로 표시될 때 꼬리표 방향 변경
        bubble.classList.add('arrow-right');
    }

    let top = window.scrollY + rect.top + (rect.height / 2) - (bubbleRect.height / 2);
    if (top < 0) top = 10;

    // 화면 아래쪽을 벗어나는지 확인
    if (top + bubbleRect.height > window.innerHeight) {
        top = window.innerHeight - bubbleRect.height - 10;
    }

    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.style.opacity = '1';

    // 외부 클릭 시 닫기
    const closeOnOutsideClick = (e) => {
        if (!bubble.contains(e.target) && e.target !== targetElement) {
            bubble.remove();
            document.removeEventListener('click', closeOnOutsideClick, true);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeOnOutsideClick, true);
    }, 100);
}

/**
 * 특정 회차(또는 최신) 로또 정보 모달 표시
 * roundNo가 없거나 null이면 최신 회차 조회
 */
async function loadAndShowLottoRound(roundNo, targetElement) {
    showRoundInfoBubble('<div style="text-align:center; padding:20px;"><p>데이터를 불러오는 중입니다...</p></div>', targetElement);

    try {
        const baseUrl = (typeof getApiBaseUrl === 'function') ? getApiBaseUrl() : '';
        const url = roundNo ? `${baseUrl}/api/lotto-round/${roundNo}` : `${baseUrl}/api/lotto-latest`;

        const res = await fetch(url);
        const data = await res.json().catch(() => ({ returnValue: 'fail' }));

        if (data.returnValue !== 'success' || data.drwNo == null) {
            const errHtml = `<div style="text-align:center; padding:20px;"><p class="error-msg">${data.error || '정보를 가져오지 못했습니다.'}</p></div>`;
            showRoundInfoBubble(errHtml, targetElement);
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

        function getBallBg(n) {
            if (n <= 10) return 'var(--lotto-yellow)';
            if (n <= 20) return 'var(--lotto-blue)';
            if (n <= 30) return 'var(--lotto-red)';
            if (n <= 40) return 'var(--lotto-gray)';
            return 'var(--lotto-green)';
        }
        const ballStyle = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;color:#333;font-weight:bold;font-size:0.8rem;';
        const makeBall = (n) => `<span style="${ballStyle}background:${getBallBg(n)};">${n}</span>`;

        const numbersRowHtml = nums.map(makeBall).join('')
            + (bnus != null ? `<span style="margin:0 4px;font-weight:bold;color:#999;">+</span>${makeBall(bnus)}` : '');

        const fmtAmt = (v) => (v && v !== '(없음)') ? v + '원' : (v || '(없음)');

        const thStyle = 'text-align:left;padding:6px 8px;border-bottom:1px solid #eee;white-space:nowrap;font-size:0.82rem;';
        const tdStyle = 'padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:0.82rem;';

        let tableHtml = `
            <table class="lotto-round-detail-table" style="width:100%; border-collapse: collapse; margin-top:10px;">
                <tbody>
                    <tr><th style="${thStyle}">당첨회차</th><td style="${tdStyle}">${drwNo}회</td></tr>
                    <tr><th style="${thStyle}">추첨일</th><td style="${tdStyle}">${dateStr}</td></tr>
                    <tr><th style="${thStyle}vertical-align:middle;">당첨번호</th><td style="${tdStyle}"><div style="display:flex;align-items:center;justify-content:flex-end;gap:3px;flex-wrap:nowrap;">${numbersRowHtml}</div></td></tr>
                    <tr><th style="${thStyle}">1등 당첨금액</th><td style="${tdStyle}">${data.firstWinamntFmt || '(없음)'}</td></tr>
                    <tr><th style="${thStyle}">1등 당첨자 수</th><td style="${tdStyle}">${data.firstPrzwnerCoFmt || '(없음)'}</td></tr>
                    <tr><th style="${thStyle}">1등 총당첨금액</th><td style="${tdStyle}">${data.firstAccumamntFmt || '(없음)'}</td></tr>
                    <tr><th style="${thStyle}">전체 판매금액</th><td style="${tdStyle}">${data.totSellamntFmt || '(없음)'}</td></tr>
                </tbody>
            </table>
        `;

        const source = data.source || '동행복권';
        tableHtml += `<p class="latest-draw-source" style="text-align:right; font-size:0.8rem; color:#666; margin-top:10px;">출처: ${source}</p>`;

        showRoundInfoBubble(tableHtml, targetElement);

    } catch (e) {
        showRoundInfoBubble(`<div style="text-align:center; padding:20px;"><p class="error-msg">요청 실패: ${e.message || String(e)}</p></div>`, targetElement);
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
    if (!viewNumbersList) return;

    let listData = baseData || AppState.currentStatsRounds || AppState.allLotto645Data;

    if (!listData || listData.length === 0) {
        viewNumbersList.innerHTML = '<p>데이터가 없습니다.</p>';
        updateAverageSumDisplay([]);
        return;
    }

    viewNumbersList.innerHTML = '';

    const INITIAL_DISPLAY_COUNT = 50;

    // 합계값 필터: 입력된 합계와 동일한 회차만 표시
    const sumFilter = (AppState.resultFilters && AppState.resultFilters.sumValue) || null;
    let filtered = listData;
    if (sumFilter != null) {
        filtered = filtered.filter(r => getRoundSum(r) === sumFilter);
    }

    const sortOrder = (AppState.resultFilters && AppState.resultFilters.sortOrder) || 'desc';
    let sortedRounds;
    if (sortOrder === 'asc') {
        sortedRounds = [...filtered].sort((a, b) => a.round - b.round);
    } else {
        sortedRounds = [...filtered].sort((a, b) => b.round - a.round);
    }

    AppState.currentViewRounds = sortedRounds;

    if (sortedRounds.length === 0) {
        viewNumbersList.innerHTML = '<p>필터 조건에 해당하는 회차가 없습니다.</p>';
        updateAverageSumDisplay(listData);
        return;
    }

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

    updateAverageSumDisplay(listData);
}

// 당첨회차 말풍선은 우측 패널 결과박스의 회차 클릭에서만 표시
// (헤더 제목 클릭 → 최신회차 말풍선 제거)

function hideAllBottomPanels() {
    ['bottomArea', 'bottomAreaWin', 'bottomAreaNumber'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('visible');
    });
    ['navStatsGraph', 'navWinStats', 'navNumberStats'].forEach(id => updateNavActive(id, false));
}

// 합계통계(하단 영역) 표시/숨김
function toggleStatsGraph() {
    const panel = document.getElementById('bottomArea');
    if (!panel) return;
    const isHidden = window.getComputedStyle(panel).display === 'none';
    hideAllBottomPanels();
    if (isHidden) {
        panel.classList.add('visible');
        updateNavActive('navStatsGraph', true);
        if (AppState.allLotto645Data && typeof renderMonthlyAverageChart === 'function') {
            renderMonthlyAverageChart(AppState.allLotto645Data);
        }
    }
}

// 출현통계(하단 영역) 표시/숨김 - 1~45 당첨횟수
function toggleWinStats() {
    const panel = document.getElementById('bottomAreaWin');
    if (!panel) return;
    const isHidden = window.getComputedStyle(panel).display === 'none';
    hideAllBottomPanels();
    if (isHidden) {
        panel.classList.add('visible');
        updateNavActive('navWinStats', true);
        const data = AppState.currentStatsRounds || AppState.allLotto645Data;
        if (data && typeof renderWinFrequencyChart === 'function') {
            renderWinFrequencyChart(data);
        }
    }
}

// 번호통계(하단 영역) 표시/숨김
function toggleNumberStats() {
    const panel = document.getElementById('bottomAreaNumber');
    if (!panel) return;
    const isHidden = window.getComputedStyle(panel).display === 'none';
    hideAllBottomPanels();
    if (isHidden) {
        panel.classList.add('visible');
        updateNavActive('navNumberStats', true);
        const data = AppState.currentStatsRounds || AppState.allLotto645Data;
        if (data && typeof renderNumberFrequencyChart === 'function') {
            renderNumberFrequencyChart(data);
        }
    }
}

function updateNavActive(id, active) {
    const el = document.getElementById(id);
    if (!el) return;
    if (active) {
        el.classList.add('nav-active');
        el.style.color = 'white';
        el.style.borderBottom = '2px solid var(--color-accent)';
        el.style.paddingBottom = '4px';
    } else {
        el.classList.remove('nav-active');
        el.style.color = 'rgba(255,255,255,0.7)';
        el.style.borderBottom = 'none';
        el.style.paddingBottom = '0';
    }
}

function setupFooterToggle() {
    const footer = document.getElementById('mainFooter');
    const bottomArea = document.getElementById('bottomArea');
    const dragHandle = document.getElementById('bottomDragHandle');
    const navStatsGraph = document.getElementById('navStatsGraph');
    const navWinStats = document.getElementById('navWinStats');
    const navNumberStats = document.getElementById('navNumberStats');
    const navLuckyNumbers = document.getElementById('navLuckyNumbers');
    if (!footer || !bottomArea) return;

    const panels = [
        { nav: navStatsGraph, toggle: toggleStatsGraph },
        { nav: navWinStats, toggle: toggleWinStats },
        { nav: navNumberStats, toggle: toggleNumberStats }
    ];
    panels.forEach(({ nav, toggle }) => {
        if (nav) nav.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
    });

    if (navLuckyNumbers) {
        navLuckyNumbers.addEventListener('click', (e) => {
            e.preventDefault();
            const gameBox = document.getElementById('gameBox');
            if (gameBox) gameBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof generateGoldenAiGames === 'function') generateGoldenAiGames();
        });
    }

    const allPanelIds = ['bottomArea', 'bottomAreaWin', 'bottomAreaNumber'];
    const allNavEls = [navStatsGraph, navWinStats, navNumberStats].filter(Boolean);

    document.addEventListener('click', (e) => {
        if (allNavEls.some(n => n.contains(e.target))) return;
        allPanelIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.classList.contains('visible') && !el.contains(e.target)) {
                hideAllBottomPanels();
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideAllBottomPanels();
    });

    // 3. 하단 영역(출현통계) 상하 드래그로 위치 조절
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

// 전체화면 버튼: 클릭 시 토글, fullscreenchange 시 버튼 텍스트 갱신
function setupFullscreenButton() {
    const btn = document.getElementById('fullscreenBtn');
    if (!btn) return;
    function updateLabel() {
        btn.textContent = document.fullscreenElement ? '창모드' : '전체화면';
    }
    document.addEventListener('fullscreenchange', updateLabel);
    updateLabel();
    btn.addEventListener('click', function () {
        if (!document.documentElement.requestFullscreen) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(function () {});
        } else {
            document.documentElement.requestFullscreen().catch(function () {});
        }
    });
}

function setupResultFilterListeners() {
    if (!AppState.resultFilters) {
        AppState.resultFilters = {};
    }
    AppState.resultFilters = Object.assign(
        { sumValue: null, sortOrder: 'desc' },
        AppState.resultFilters
    );
    var sumVal = document.getElementById('resultSumValue');
    var sortOrder = document.getElementById('resultSortOrder');

    if (sumVal) sumVal.addEventListener('change', function () {
        var v = parseInt(this.value, 10);
        AppState.resultFilters.sumValue = isNaN(v) ? null : v;
        if (AppState.currentViewNumbersBaseData) {
            renderViewNumbersList(AppState.currentViewNumbersBaseData);
        }
    });
    if (sortOrder) sortOrder.addEventListener('change', function () {
        AppState.resultFilters.sortOrder = this.value;
        if (AppState.currentViewNumbersBaseData) {
            renderViewNumbersList(AppState.currentViewNumbersBaseData);
        }
    });

}

function updateResultFilterAvg() {
    var sumValEl = document.getElementById('resultSumValue');

    var vals = AppState.chartEndRoundValues;
    if (!vals) return;

    if (sumValEl && vals.avg != null) {
        sumValEl.value = Math.round(vals.avg);
        AppState.resultFilters.sumValue = parseInt(sumValEl.value, 10);
    }

    var listData = AppState.currentViewNumbersBaseData || AppState.currentStatsRounds || AppState.allLotto645Data;
    updateAverageSumDisplay(listData);
    extractAndApplyFilters(listData);
}

function showNavBubble(anchor, message, duration = 3000) {
    const existing = document.getElementById('navBubbleTooltip');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.id = 'navBubbleTooltip';
    bubble.textContent = message;
    Object.assign(bubble.style, {
        position: 'absolute',
        background: SHAREHARMONY_PALETTE.primaryNavy,
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        zIndex: '9999',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        opacity: '0',
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none'
    });
    document.body.appendChild(bubble);

    const rect = anchor.getBoundingClientRect();
    bubble.style.left = `${rect.left + rect.width / 2 - bubble.offsetWidth / 2}px`;
    bubble.style.top = `${rect.bottom + 6 + window.scrollY}px`;
    bubble.style.opacity = '1';

    setTimeout(() => {
        bubble.style.opacity = '0';
        setTimeout(() => bubble.remove(), 200);
    }, duration);
}

async function fetchLatestWinningNumbers() {
    const navBtn = document.getElementById('navFetchLatest');
    if (navBtn) {
        navBtn.style.pointerEvents = 'none';
        navBtn.textContent = '조회중...';
    }

    try {
        const base = getApiBaseUrl();

        const latestRes = await fetch(base + '/api/lotto-latest', { cache: 'no-store' });
        const latestData = await latestRes.json().catch(() => ({}));
        if (latestData.returnValue !== 'success' || latestData.drwNo == null) {
            alert('동행복권 최신 회차 정보를 가져오지 못했습니다.');
            return;
        }

        const apiLatestRound = latestData.drwNo;
        const localEndRound = AppState.endRound || 0;

        if (apiLatestRound <= localEndRound) {
            showNavBubble(navBtn, `이미 최신 상태입니다. (${localEndRound}회)`);
            return;
        }

        const missingCount = apiLatestRound - localEndRound;
        if (navBtn) navBtn.textContent = `${missingCount}회 취득중...`;

        if (missingCount <= 100) {
            const missingRounds = [];
            for (let r = localEndRound + 1; r <= apiLatestRound; r++) missingRounds.push(r);
            await fetch(base + '/api/fetch-missing-rounds?rounds=' + missingRounds.join(','), { cache: 'no-store' });
        }

        const syncRes = await fetch(base + '/api/sync-lotto645', { method: 'POST', cache: 'no-store' });
        const syncData = await syncRes.json().catch(() => ({}));

        if (syncData.returnValue === 'fail' && syncData.error) {
            alert('회차 추가 실패: ' + syncData.error + '\nExcel에서 Lotto645.xlsx를 닫고 다시 시도하세요.');
            return;
        }

        const loadFunc = (typeof window !== 'undefined' && window.loadLotto645Data)
            ? window.loadLotto645Data
            : (typeof loadLotto645Data !== 'undefined' ? loadLotto645Data : null);

        if (!loadFunc) {
            alert('데이터 로드 함수를 찾을 수 없습니다. 페이지를 새로고침하세요.');
            return;
        }

        const newData = await loadFunc();
        if (newData && newData.length > 0) {
            await initializeStats(newData);

            AppState.latestRoundApi = apiLatestRound;
            AppState.latestRoundDateApi = latestData.drwNoDate || '';

            const endInput = document.getElementById('endDate');
            if (endInput && latestData.drwNoDate) {
                const apiDateObj = parseDate(String(latestData.drwNoDate).trim());
                if (apiDateObj instanceof Date && !isNaN(apiDateObj.getTime())) {
                    endInput.value = formatDateYYMMDD(apiDateObj);
                }
            }

            if (typeof updateRoundRangeDisplay === 'function') updateRoundRangeDisplay();
            if (typeof renderStats === 'function') renderStats(newData);

            // 중앙 패널 게임 초기화: 공 비우고 합계 000으로 리셋
            AppState.setSelectedBalls = Array.from({ length: 5 }, () => []);
            for (let i = 1; i <= 5; i++) {
                const ballsContainer = document.getElementById(`gameBalls${i}`);
                if (ballsContainer) ballsContainer.innerHTML = '';
                const modeBtn = document.getElementById(`modeBtn${i}`);
                if (modeBtn) {
                    modeBtn.dataset.mode = 'manual';
                    modeBtn.textContent = '수동';
                }
                const cb = document.getElementById(`gameCheckbox${i}`);
                if (cb) cb.checked = false;
                updateGameSum(i, []);
            }

            // 우측 패널 합계값에 최신 당첨번호 합계 반영
            const latestNums = [1,2,3,4,5,6].map(n => Number(latestData[`drwtNo${n}`]) || 0);
            const latestSum = latestNums.reduce((a, b) => a + b, 0);
            const sumValEl = document.getElementById('resultSumValue');
            if (sumValEl && latestSum > 0) {
                sumValEl.value = latestSum;
                AppState.resultFilters.sumValue = latestSum;
                if (AppState.currentViewNumbersBaseData) {
                    renderViewNumbersList(AppState.currentViewNumbersBaseData);
                }
            }

            const added = newData.length - (AppState.previousDataCount || 0);
            alert(`${localEndRound + 1}회 ~ ${apiLatestRound}회 (${missingCount}회차) 추가 완료!\n총 ${newData.length}회차 데이터`);
        } else {
            alert('데이터를 다시 불러오지 못했습니다. 페이지를 새로고침하세요.');
        }
    } catch (e) {
        console.error('[최근당첨번호] 오류:', e);
        alert('최근당첨번호 조회 중 오류가 발생했습니다: ' + (e.message || String(e)));
    } finally {
        if (navBtn) {
            navBtn.style.pointerEvents = '';
            navBtn.textContent = '최근당첨번호';
        }
    }
}

function setupPanelLabelToggle() {
    const map = {
        stats: '.panel-box-stats',
        game: '.panel-box-game',
        win: '.panel-box-win'
    };
    document.querySelectorAll('.panel-toggle-btn').forEach(btn => {
        btn.classList.add('active');
        btn.addEventListener('click', () => {
            const panelBox = document.querySelector(map[btn.dataset.panel]);
            if (!panelBox) return;
            panelBox.classList.toggle('collapsed');
            btn.classList.toggle('active', !panelBox.classList.contains('collapsed'));
        });
    });
}

window.addEventListener('load', () => {
    setTimeout(function () {
        try {
            initializeApp();
            initAIChat();
            setupRangeTypeSelectors();
            setupFooterToggle();
            setupPanelLabelToggle();
            setupResultFilterListeners();
            const navFetchBtn = document.getElementById('navFetchLatest');
            setupScrollToTopButton();
            if (navFetchBtn) {
                navFetchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    fetchLatestWinningNumbers();
                });
            }
            // 전체화면은 헤더 '전체화면' 버튼으로만 전환 (첫 로드 시 자동 전체화면 없음)
            setupFullscreenButton();
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
            // 저장된 위치 확인
            const savedPosition = localStorage.getItem('aiChatModalPosition');
            if (savedPosition) {
                try {
                    const { top, left } = JSON.parse(savedPosition);
                    chatModal.style.top = top;
                    chatModal.style.left = left;
                    // CSS fixed 위치 간섭 제거
                    chatModal.style.right = 'auto';
                    chatModal.style.bottom = 'auto';
                } catch (e) {
                    console.error("Failed to parse saved chat position:", e);
                    localStorage.removeItem('aiChatModalPosition'); // 잘못된 데이터 삭제
                }
            } else if (!chatModal.style.left || !chatModal.style.top) {
                // 저장된 위치가 없고, 처음 열릴 때 위치 자동 조정
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
            chatBtn.dataset.state = 'on'; // Set active state

            // 안내 메시지 업데이트
            const targetRound = document.getElementById('targetRound')?.value;
            const systemMsg = chatBody.querySelector('.ai-message.system');
            if (systemMsg) {
                if (targetRound) {
                    systemMsg.innerHTML = `안녕하세요! 현재 설정된 <b>${targetRound}회</b>까지의 데이터를 기반으로 로또 번호를 분석해 드립니다.<br>궁금한 점을 물어보세요.`;
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
            chatBtn.dataset.state = 'off'; // Set inactive state
        }
    });

    closeBtn.addEventListener('click', () => {
        chatModal.style.display = 'none';
        chatBtn.dataset.state = 'off'; // Set inactive state
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

        // 현재 설정된 회차 가져오기
        const startRoundInput = document.getElementById('startRound');
        const endRoundInput = document.getElementById('endRound');

        try {
            const response = await fetch('/api/ask-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: text,
                    startRound: startRoundInput ? startRoundInput.value : null,
                    endRound: endRoundInput ? endRoundInput.value : null,
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
        if (isDragging) {
            isDragging = false;
            chatModal.style.transition = ''; // 드래그 끝나면 다시 효과 켬
            // 위치 저장
            localStorage.setItem('aiChatModalPosition', JSON.stringify({ top: chatModal.style.top, left: chatModal.style.left }));
        }
    });
}


/**
 * 회차별 당첨 합계 막대그래프 렌더링
 */
function renderMonthlyAverageChart(currentData) {
    const ctx = document.getElementById('averageSumChart');
    // 전체 범위를 알기 위해 AppState.allLotto645Data가 필수입니다.
    if (!ctx || !AppState.allLotto645Data || AppState.allLotto645Data.length === 0) return;

    // 1. 전체 데이터 가공: 최근회차 -> 과거회차 순 (좌측=최근, 우측=과거)
    const fullData = [...AppState.allLotto645Data].sort((a, b) => b.round - a.round);

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

    // 2. 회차별 누적 평균: 1회 ~ 당 회차까지의 평균 (파란 점선·툴팁용)
    const cumulativeAverages = [];
    const n = fullData.length;
    for (let i = 0; i < n; i++) {
        const R = fullData[i].round;
        const startIdx = Math.max(0, n - R);
        let sum = 0;
        let count = 0;
        for (let j = startIdx; j < n; j++) {
            if (roundSums[j] !== null) {
                sum += roundSums[j];
                count += 1;
            }
        }
        cumulativeAverages.push(count > 0 ? parseFloat((sum / count).toFixed(1)) : null);
    }

    // 2-1. Max(파란 평균보다 큰 회차들의 평균) / Min(파란 평균보다 작은 회차들의 평균)
    const maxLine = [];
    const minLine = [];
    for (let i = 0; i < n; i++) {
        const R = fullData[i].round;
        const startIdx = Math.max(0, n - R);
        const blueVal = cumulativeAverages[i];
        let aboveSum = 0, aboveCount = 0, belowSum = 0, belowCount = 0;
        for (let j = startIdx; j < n; j++) {
            if (roundSums[j] === null) continue;
            if (roundSums[j] > blueVal) {
                aboveSum += roundSums[j];
                aboveCount += 1;
            } else if (roundSums[j] < blueVal) {
                belowSum += roundSums[j];
                belowCount += 1;
            }
        }
        maxLine.push(aboveCount > 0 ? parseFloat((aboveSum / aboveCount).toFixed(1)) : null);
        minLine.push(belowCount > 0 ? parseFloat((belowSum / belowCount).toFixed(1)) : null);
    }

    // 전체 회차별 min/avg/max 맵 저장
    const chartRoundMap = {};
    for (let i = 0; i < n; i++) {
        chartRoundMap[fullData[i].round] = {
            min: minLine[i],
            avg: cumulativeAverages[i],
            max: maxLine[i]
        };
    }
    AppState.chartRoundValuesMap = chartRoundMap;

    // 종료회차(endRound)에 해당하는 그래프 값을 AppState에 저장
    const endRound = AppState.endRound || (fullData.length > 0 ? fullData[0].round : 0);
    const endIdx = fullData.findIndex(r => r.round === endRound);
    if (endIdx >= 0) {
        AppState.chartEndRoundValues = {
            min: minLine[endIdx],
            avg: cumulativeAverages[endIdx],
            max: maxLine[endIdx]
        };
    } else if (fullData.length > 0) {
        AppState.chartEndRoundValues = {
            min: minLine[0],
            avg: cumulativeAverages[0],
            max: maxLine[0]
        };
    }
    updateResultFilterAvg();

    // 3. 차트 너비 계산 및 스크롤바 설정을 위한 wrapper 처리
    const chartWrapper = document.getElementById('chartWrapper');
    const chartYAxisFixed = document.getElementById('chartYAxisFixed');
    const bottomUnifiedContent = document.getElementById('bottomUnifiedContent');
    if (chartWrapper) {
        // 회차당 고정 6px 유지
        const fixedBarWidth = 6;
        const calculatedWidth = labels.length * fixedBarWidth;
        chartWrapper.style.width = calculatedWidth + 'px';

        // 캔버스 크기 강제 동기화
        ctx.width = calculatedWidth;
        ctx.height = chartWrapper.offsetHeight;

        // 좌측=최근이므로 기본은 스크롤 0(최근이 보이도록)
        setTimeout(() => {
            if (bottomUnifiedContent) {
                bottomUnifiedContent.scrollLeft = 0;
            }
        }, 100);
    }

    // 4. Y축 고정 (이론적 최소 21 ~ 최대 255, 로또 6개 번호 합 범위)
    const yMin = 21;
    const yMax = 255;
    const yStep = 10;

    // 고정 Y축 눈금 렌더 (스크롤 시 사라지지 않음, 차트와 동일 21~250 step 10)
    if (chartYAxisFixed) {
        chartYAxisFixed.innerHTML = '';
        const yTicks = [];
        for (let v = 250; v > yMin; v -= yStep) yTicks.push(v);
        yTicks.push(yMin);
        yTicks.forEach(function (v) {
            const span = document.createElement('span');
            span.textContent = String(v);
            span.setAttribute('role', 'presentation');
            chartYAxisFixed.appendChild(span);
        });
    }

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
                    backgroundColor: '#69C8F2', // 공식 파란색 (11-20번 색상 활용)
                    borderColor: '#1b2f89', // 공식 딥 블루
                    borderWidth: 1,
                    hoverBackgroundColor: '#1b2f89',
                    hoverBorderColor: '#1b2f89',
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                    zIndex: 1
                },
                {
                    label: '선택 평균 (1회~당 회차)',
                    type: 'line',
                    data: cumulativeAverages,
                    borderColor: '#69C8F2',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    zIndex: 2
                },
                {
                    label: 'Max (평균보다 큰 회차 평균)',
                    type: 'line',
                    data: maxLine,
                    borderColor: SHAREHARMONY_PALETTE.error,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    zIndex: 3
                },
                {
                    label: 'Min (평균보다 작은 회차 평균)',
                    type: 'line',
                    data: minLine,
                    borderColor: '#000000',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    zIndex: 3
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
                        label: function () { return null; },
                        afterBody: function (context) {
                            const idx = (context[0] && context[0].dataIndex != null) ? context[0].dataIndex : -1;
                            const tot = idx >= 0 && roundSums[idx] != null ? roundSums[idx] : '-';
                            const maxVal = idx >= 0 && maxLine[idx] != null ? maxLine[idx] : '-';
                            const avrVal = idx >= 0 && cumulativeAverages[idx] != null ? cumulativeAverages[idx] : '-';
                            const minVal = idx >= 0 && minLine[idx] != null ? minLine[idx] : '-';

                            const label = (context[0] && context[0].label) ? context[0].label : '';
                            const roundNum = parseInt(String(label).replace(/회$/, ''), 10);

                            const lines = [];
                            lines.push('TOT: ' + tot);
                            lines.push('Max: ' + maxVal);
                            lines.push('Avr.: ' + avrVal + '(1회~' + (isNaN(roundNum) ? '?' : roundNum) + '회)');
                            lines.push('Min: ' + minVal);

                            if (!isNaN(roundNum) && AppState.allLotto645Data) {
                                const roundData = AppState.allLotto645Data.find(function (r) { return r.round === roundNum; });
                                if (roundData) {
                                    const nums = (roundData.numbers || []).slice(0, 6).map(function (n) { return Number(n); }).filter(function (n) { return !isNaN(n); }).sort(function (a, b) { return a - b; });
                                    const bonus = roundData.bonus != null ? String(roundData.bonus).trim() : '';
                                    const bonusStr = bonus ? ' + ' + bonus : '';
                                    lines.push('Number: ' + nums.join(', ') + bonusStr);
                                }
                            }
                            return lines;
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
                        color: SHAREHARMONY_PALETTE.textSecondary
                    }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    beginAtZero: false,
                    display: false,
                    ticks: {
                        stepSize: yStep,
                        font: { size: 10 }
                    },
                    grid: { color: SHAREHARMONY_PALETTE.bgLighter }
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

/**
 * 번호통계 차트: X축 1~45, Y축 출현횟수
 */
/**
 * 출현통계 차트: X축 1~45, Y축 당첨회수 (해당 번호가 당첨번호에 포함된 회차 수)
 */
function renderWinFrequencyChart(currentData) {
    const ctx = document.getElementById('winFrequencyChart');
    if (!ctx) return;

    const displayData = currentData || AppState.currentStatsRounds || AppState.allLotto645Data;
    if (!displayData || displayData.length === 0) return;

    // 1~45 번호별 당첨회수 (메인번호 + 보너스번호 포함)
    const freq = new Array(45).fill(0);
    displayData.forEach(r => {
        if (r.numbers) {
            r.numbers.forEach(n => {
                const num = parseInt(n, 10);
                if (num >= 1 && num <= 45) freq[num - 1]++;
            });
        }
        if (r.bonus) {
            const bn = parseInt(r.bonus, 10);
            if (bn >= 1 && bn <= 45) freq[bn - 1]++;
        }
    });

    const labels = [];
    for (let i = 1; i <= 45; i++) labels.push(String(i));

    const bgColors = labels.map((_, i) => {
        const n = i + 1;
        if (n <= 10) return 'var(--lotto-yellow)';
        if (n <= 20) return 'var(--lotto-blue)';
        if (n <= 30) return 'var(--lotto-red)';
        if (n <= 40) return 'var(--lotto-gray)';
        return 'var(--lotto-green)';
    });

    const rootStyle = getComputedStyle(document.documentElement);
    const resolveColor = (v) => {
        const match = v.match(/var\((--[^)]+)\)/);
        return match ? rootStyle.getPropertyValue(match[1]).trim() : v;
    };
    const resolvedBg = bgColors.map(resolveColor);

    const maxFreq = Math.max(...freq);
    const avgFreq = freq.reduce((a, b) => a + b, 0) / 45;

    if (window.winFreqChart) {
        window.winFreqChart.destroy();
    }

    window.winFreqChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '당첨회수',
                    data: freq,
                    backgroundColor: resolvedBg,
                    borderColor: resolvedBg.map(c => c),
                    borderWidth: 1,
                    barPercentage: 0.85,
                    categoryPercentage: 0.9
                },
                {
                    label: '평균',
                    data: new Array(45).fill(parseFloat(avgFreq.toFixed(1))),
                    type: 'line',
                    borderColor: '#D96E64',
                    borderWidth: 2,
                    borderDash: [6, 3],
                    pointRadius: 0,
                    fill: false,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function (items) {
                            return items[0].label + '번';
                        },
                        label: function () { return null; },
                        afterBody: function (items) {
                            const idx = items[0].dataIndex;
                            const count = freq[idx];
                            const totalCount = freq.reduce((a, b) => a + b, 0);
                            const pct = totalCount > 0 ? (count / totalCount * 100).toFixed(2) : '0.00';
                            return [
                                '출현: ' + count + '회 (보너스공 포함)',
                                '평균: ' + avgFreq.toFixed(2),
                                '비율: ' + pct + '%'
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        font: { size: 11 },
                        color: SHAREHARMONY_PALETTE.textSecondary
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: { color: SHAREHARMONY_PALETTE.bgLighter },
                    ticks: {
                        font: { size: 10 },
                        stepSize: Math.ceil(maxFreq / 10)
                    }
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

function renderNumberFrequencyChart(currentData) {
    const ctx = document.getElementById('numberFrequencyChart');
    if (!ctx) return;

    const displayData = currentData || AppState.currentStatsRounds || AppState.allLotto645Data;
    if (!displayData || displayData.length === 0) return;

    // 1~45 번호별 출현횟수 집계
    const freq = new Array(45).fill(0);
    displayData.forEach(r => {
        if (!r.numbers) return;
        r.numbers.forEach(n => {
            const num = parseInt(n, 10);
            if (num >= 1 && num <= 45) freq[num - 1]++;
        });
    });

    const labels = [];
    for (let i = 1; i <= 45; i++) labels.push(String(i));

    // 동행복권 색상 매핑
    const bgColors = labels.map((_, i) => {
        const n = i + 1;
        if (n <= 10) return 'var(--lotto-yellow)';
        if (n <= 20) return 'var(--lotto-blue)';
        if (n <= 30) return 'var(--lotto-red)';
        if (n <= 40) return 'var(--lotto-gray)';
        return 'var(--lotto-green)';
    });

    // CSS 변수를 실제 색상으로 변환
    const rootStyle = getComputedStyle(document.documentElement);
    const resolveColor = (v) => {
        const match = v.match(/var\((--[^)]+)\)/);
        return match ? rootStyle.getPropertyValue(match[1]).trim() : v;
    };
    const resolvedBg = bgColors.map(resolveColor);

    const maxFreq = Math.max(...freq);
    const avgFreq = freq.reduce((a, b) => a + b, 0) / 45;

    if (window.numberFreqChart) {
        window.numberFreqChart.destroy();
    }

    window.numberFreqChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '출현횟수',
                    data: freq,
                    backgroundColor: resolvedBg,
                    borderColor: resolvedBg.map(c => c),
                    borderWidth: 1,
                    barPercentage: 0.85,
                    categoryPercentage: 0.9
                },
                {
                    label: '평균',
                    data: new Array(45).fill(parseFloat(avgFreq.toFixed(1))),
                    type: 'line',
                    borderColor: '#4A90D9',
                    borderWidth: 2,
                    borderDash: [6, 3],
                    pointRadius: 0,
                    fill: false,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function (items) {
                            return items[0].label + '번';
                        },
                        label: function () { return null; },
                        afterBody: function (items) {
                            const idx = items[0].dataIndex;
                            const count = freq[idx];
                            const totalCount = freq.reduce((a, b) => a + b, 0);
                            const pct = totalCount > 0 ? (count / totalCount * 100).toFixed(2) : '0.00';
                            return [
                                '출현: ' + count + '회',
                                '평균: ' + avgFreq.toFixed(2),
                                '비율: ' + pct + '%'
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        font: { size: 11 },
                        color: SHAREHARMONY_PALETTE.textSecondary
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    grid: { color: SHAREHARMONY_PALETTE.bgLighter },
                    ticks: {
                        font: { size: 10 },
                        stepSize: Math.ceil(maxFreq / 10)
                    }
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

/**
 * 화면 우측 하단 'TOP' 버튼 기능 설정
 */
function setupScrollToTopButton() {
    const topBtn = document.getElementById('scrollToTopBtn');
    if (!topBtn) return;

    // 스크롤 가능한 메인 패널 3개
    const scrollContainers = [
        document.querySelector('.panel-box-stats .panel-inner'),
        document.querySelector('.panel-box-game .panel-inner'),
        document.querySelector('.panel-box-win .panel-inner')
    ].filter(el => el); // null인 경우 제외

    if (scrollContainers.length === 0) return;

    // 스크롤 위치를 감지하여 버튼 표시/숨김
    const checkScroll = () => {
        // 3개 패널 중 하나라도 200px 이상 스크롤되면 버튼 표시
        const shouldShow = scrollContainers.some(container => container.scrollTop > 200);
        topBtn.classList.toggle('show', shouldShow);
    };

    // 각 패널에 스크롤 이벤트 리스너 추가
    scrollContainers.forEach(container => {
        container.addEventListener('scroll', checkScroll);
    });

    // 버튼 클릭 시, 현재 가장 많이 스크롤된 패널을 최상단으로 이동
    topBtn.addEventListener('click', () => {
        const mostScrolledContainer = scrollContainers.reduce((prev, current) => {
            return (prev.scrollTop > current.scrollTop) ? prev : current;
        });

        if (mostScrolledContainer) {
            mostScrolledContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

if (document.readyState === 'complete') {
    setTimeout(initializeApp, 200);
}

function showHelpModal() {
    let modal = document.getElementById('helpModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'helpModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:560px;">
                <h2 style="margin:0 0 16px;font-size:1.2rem;color:var(--color-primary);">ShareHarmony Lotto 도움말</h2>
                <div style="font-size:0.88rem;line-height:1.8;color:var(--color-text-primary);">
                    <p><b>좌측 패널</b> — 조회기간/회차를 설정하고 [조회]를 누르면 통계가 갱신됩니다.</p>
                    <p><b>중앙 패널</b> — 옵션필터 조건에 맞는 번호를 AI추천/반자동/수동 모드로 생성합니다.</p>
                    <p><b>우측 패널</b> — 회차별 당첨번호를 합계값으로 필터링하여 조회합니다.</p>
                    <p><b>최근당첨번호</b> — 동행복권 API에서 최신 회차를 가져와 데이터를 갱신합니다.</p>
                    <p><b>하단 차트</b> — 합계통계/출현통계/번호통계를 그래프로 확인할 수 있습니다.</p>
                </div>
                <div style="text-align:right;margin-top:16px;">
                    <button onclick="document.getElementById('helpModal').classList.remove('show')"
                        style="padding:8px 20px;background:var(--color-primary);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;">닫기</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    }
    modal.classList.add('show');
}
