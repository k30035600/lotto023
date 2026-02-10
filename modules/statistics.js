/**
 * 통계 계산 모듈
 * 로또 번호 통계 분석 및 계산 기능
 */

/**
 * 번호별 당첨 횟수 계산 (보너스 제외)
 * @param {Array} lottoData - 로또 데이터 배열
 * @param {number} maxNumber - 최대 번호 (기본값: 45)
 * @returns {Map<number, number>} 번호별 당첨 횟수 맵
 */
function calculateWinStats(lottoData, maxNumber = 45) {
    const statsMap = new Map();

    // 모든 번호 초기화
    for (let i = 1; i <= maxNumber; i++) {
        statsMap.set(i, 0);
    }

    // 당첨 번호만 카운트 (보너스 제외)
    lottoData.forEach(round => {
        if (round.numbers && Array.isArray(round.numbers)) {
            round.numbers.forEach(num => {
                if (num >= 1 && num <= maxNumber) {
                    statsMap.set(num, (statsMap.get(num) || 0) + 1);
                }
            });
        }
    });

    return statsMap;
}

/**
 * 번호별 출현 횟수 계산 (보너스 포함)
 * @param {Array} lottoData - 로또 데이터 배열
 * @param {number} maxNumber - 최대 번호 (기본값: 45)
 * @returns {Map<number, number>} 번호별 출현 횟수 맵
 */
function calculateAppearanceStats(lottoData, maxNumber = 45) {
    const statsMap = new Map();

    // 모든 번호 초기화
    for (let i = 1; i <= maxNumber; i++) {
        statsMap.set(i, 0);
    }

    // 당첨 번호 + 보너스 번호 카운트
    lottoData.forEach(round => {
        // 당첨 번호 카운트
        if (round.numbers && Array.isArray(round.numbers)) {
            round.numbers.forEach(num => {
                if (num >= 1 && num <= maxNumber) {
                    statsMap.set(num, (statsMap.get(num) || 0) + 1);
                }
            });
        }

        // 보너스 번호 카운트
        if (round.bonus && round.bonus >= 1 && round.bonus <= maxNumber) {
            statsMap.set(round.bonus, (statsMap.get(round.bonus) || 0) + 1);
        }
    });

    return statsMap;
}

/**
 * 번호별 출현 비율 계산 (퍼센트)
 * @param {Map<number, number>} statsMap - 번호별 횟수 맵
 * @param {number} totalRounds - 전체 회차 수
 * @param {number} maxNumber - 최대 번호 (기본값: 45)
 * @returns {Map<number, number>} 번호별 출현 비율 맵 (퍼센트)
 */
function calculatePercentageStats(statsMap, totalRounds, maxNumber = 45) {
    const percentageMap = new Map();

    if (totalRounds === 0) {
        for (let i = 1; i <= maxNumber; i++) {
            percentageMap.set(i, 0);
        }
        return percentageMap;
    }

    statsMap.forEach((count, number) => {
        const percentage = (count / totalRounds) * 100;
        percentageMap.set(number, percentage);
    });

    return percentageMap;
}

/**
 * 핫/콜드 번호 분석
 * @param {Map<number, number>} statsMap - 번호별 통계 맵
 * @param {number} threshold - 핫/콜드 기준 (평균 대비 비율)
 * @returns {Object} {hot: 핫 번호 배열, cold: 콜드 번호 배열}
 */
function analyzeHotColdNumbers(statsMap, threshold = 1.0) {
    const numbers = Array.from(statsMap.entries());
    const avgCount = numbers.reduce((sum, [, count]) => sum + count, 0) / numbers.length;

    const hot = [];
    const cold = [];

    numbers.forEach(([number, count]) => {
        if (count > avgCount * threshold) {
            hot.push(number);
        } else if (count < avgCount / threshold) {
            cold.push(number);
        }
    });

    return { hot, cold };
}

/**
 * 홀수/짝수 분포 분석
 * @param {Array} lottoData - 로또 데이터 배열
 * @returns {Object} {odd: 홀수 비율, even: 짝수 비율}
 */
function analyzeOddEvenDistribution(lottoData) {
    let oddCount = 0;
    let evenCount = 0;
    let totalNumbers = 0;

    lottoData.forEach(round => {
        if (round.numbers && Array.isArray(round.numbers)) {
            round.numbers.forEach(num => {
                totalNumbers++;
                if (num % 2 === 0) {
                    evenCount++;
                } else {
                    oddCount++;
                }
            });
        }
    });

    return {
        odd: totalNumbers > 0 ? (oddCount / totalNumbers) * 100 : 0,
        even: totalNumbers > 0 ? (evenCount / totalNumbers) * 100 : 0
    };
}

/**
 * 연속 번호 분석
 * @param {Array} lottoData - 로또 데이터 배열
 * @returns {Object} 연속 번호 통계
 */
function analyzeConsecutiveNumbers(lottoData) {
    let hasConsecutive = 0;
    let noConsecutive = 0;

    lottoData.forEach(round => {
        if (round.numbers && Array.isArray(round.numbers)) {
            const sorted = [...round.numbers].sort((a, b) => a - b);
            let consecutive = false;

            for (let i = 0; i < sorted.length - 1; i++) {
                if (sorted[i + 1] - sorted[i] === 1) {
                    consecutive = true;
                    break;
                }
            }

            if (consecutive) {
                hasConsecutive++;
            } else {
                noConsecutive++;
            }
        }
    });

    return {
        hasConsecutive,
        noConsecutive,
        percentage: lottoData.length > 0 ? (hasConsecutive / lottoData.length) * 100 : 0
    };
}

/**
 * 번호 합계 범위 분석
 * @param {Array} lottoData - 로또 데이터 배열
 * @returns {Object} {min: 최소값, max: 최대값, avg: 평균}
 */
function analyzeSumRange(lottoData) {
    const sums = lottoData
        .map(round => {
            if (round.numbers && Array.isArray(round.numbers)) {
                return round.numbers.reduce((sum, num) => sum + Number(num), 0);
            }
            return 0;
        })
        .filter(sum => sum >= 21 && sum <= 255);

    if (sums.length === 0) {
        return { min: 21, max: 255, avg: 138 };
    }

    return {
        min: Math.min(...sums),
        max: Math.max(...sums),
        avg: sums.reduce((a, b) => a + b, 0) / sums.length
    };
}

/**
 * 통계 데이터 초기화 및 계산
 * @param {Array} lottoData - 로또 데이터 배열
 * @param {number} maxNumber - 최대 번호 (기본값: 45)
 * @returns {Object} 계산된 모든 통계
 */
function initializeStatistics(lottoData, maxNumber = 45) {
    // 당첨 통계 (보너스 제외)
    const winStatsMap = calculateWinStats(lottoData, maxNumber);

    // 출현 통계 (보너스 포함)
    const appearanceStatsMap = calculateAppearanceStats(lottoData, maxNumber);

    // 비율 계산
    const winPercentageMap = calculatePercentageStats(winStatsMap, lottoData.length, maxNumber);
    const appearancePercentageMap = calculatePercentageStats(appearanceStatsMap, lottoData.length, maxNumber);

    // 핫/콜드 분석
    const hotCold = analyzeHotColdNumbers(appearanceStatsMap);

    // 홀짝 분석
    const oddEven = analyzeOddEvenDistribution(lottoData);

    // 연속 번호 분석
    const consecutive = analyzeConsecutiveNumbers(lottoData);

    // 합계 범위 분석
    const sumRange = analyzeSumRange(lottoData);

    return {
        winStatsMap,
        appearanceStatsMap,
        winPercentageMap,
        appearancePercentageMap,
        hotCold,
        oddEven,
        consecutive,
        sumRange,
        totalRounds: lottoData.length
    };
}

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateWinStats,
        calculateAppearanceStats,
        calculatePercentageStats,
        analyzeHotColdNumbers,
        analyzeOddEvenDistribution,
        analyzeConsecutiveNumbers,
        analyzeSumRange,
        initializeStatistics
    };
}
