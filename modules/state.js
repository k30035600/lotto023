/**
 * 전역 상태 관리 모듈
 * 애플리케이션의 모든 상태를 중앙에서 관리
 */

// DEFAULT_SET_COUNT는 constants.js에서 전역으로 정의됨

const AppState = {
    // 게임 관련 상태
    currentSets: [],
    setSelectedBalls: Array.from({ length: DEFAULT_SET_COUNT }, () => []),
    ballsToReplace: Array.from({ length: DEFAULT_SET_COUNT }, () => null),
    rememberedBalls: [],
    gameModes: Array.from({ length: DEFAULT_SET_COUNT }, () => "semi-auto"),

    // 필터 상태
    activeFilters: {
        statFilter: "none",
        sequence: "none",
        oddEven: "none",
        hotCold: "none"
    },
    toggleStates: {
        statFilter: "none",
        sequence: "none",
        oddEven: "none",
        hotCold: "none"
    },

    // 통계 관련 상태
    statFilterOriginalNumbers: [],
    selectedPreferredNumbers: [],
    winStats: [],
    winStatsMap: new Map(),
    appearanceStatsMap: new Map(),
    currentStats: [],
    currentSort: "number-asc",

    // 캐시 (CacheManager로 이관 예정)
    avgCountCache: null,
    avgPercentageCache: null,
    winPercentageCache: null,
    appearancePercentageCache: null,
    overallHotColdCache: null,

    // 데이터 관련 상태
    allLotto645Data: [],
    selectedSeqRounds: null,
    seqFilterType: null,
    startRound: null,
    endRound: null,
    latestRoundApi: null,
    latestRoundDateApi: null,
    sumRangeStart: 21,
    sumRangeEnd: 255,

    /** 저장 목록(Lotto023): null이면 전체 회차, 숫자면 해당 회차만 표시 */
    resultListRoundFilter: null,

    /** 미추첨 게임 정성도 점수 순위 정렬 토글 */
    pendingScoreSortEnabled: false,

    /**
     * 상태 초기화
     */
    reset() {
        this.currentSets = [];
        this.setSelectedBalls = Array.from({ length: DEFAULT_SET_COUNT }, () => []);
        this.ballsToReplace = Array.from({ length: DEFAULT_SET_COUNT }, () => null);
        this.rememberedBalls = [];
        this.statFilterOriginalNumbers = [];
        this.gameModes = Array.from({ length: DEFAULT_SET_COUNT }, () => "manual");
        this.activeFilters = {
            statFilter: "none",
            sequence: "none",
            oddEven: "none",
            hotCold: "none"
        };
        this.toggleStates = {
            statFilter: "none",
            sequence: "none",
            oddEven: "none",
            hotCold: "none"
        };
        this.resultListRoundFilter = null;
    },

    /**
     * 캐시 무효화 (CacheManager 사용 권장)
     */
    invalidateCache() {
        this.avgCountCache = null;
        this.avgPercentageCache = null;
        this.winPercentageCache = null;
        this.appearancePercentageCache = null;
        this.overallHotColdCache = null;
    },

    /**
     * 상태 스냅샷 (디버깅용)
     */
    snapshot() {
        return {
            currentSetsCount: this.currentSets.length,
            gameModes: [...this.gameModes],
            activeFilters: { ...this.activeFilters },
            dataCount: this.allLotto645Data.length,
            latestRound: this.latestRoundApi
        };
    }
};

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState, DEFAULT_SET_COUNT };
}
