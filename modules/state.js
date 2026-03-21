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

    /** 옵션필터 핫콜 비율 판정 시 사용하는 당첨 구간(null이면 전체 데이터와 동일) */
    optionHotColdBasisRounds: null,
    /** AI추천 옵션 통계 창(종료회차-99~종료회차) 표시용 */
    aiRecommendWindowStart: null,
    aiRecommendWindowEnd: null,

    /** 행운번호 분석 오버레이: 신뢰도 산출용 통계 필터 스냅샷(표시 후 즉시 해제) */
    _luckyStatTrustContext: null,

    /** 저장 목록(Lotto023): 번호저장용 미추첨 회차(스코프·로직에서 갱신) */
    resultListRoundFilter: null,
    /** null=초기·데이터 없음 | pending_only=미추첨 저장만(기본) | drawn_only=추첨 완료 저장만 — 회차 헤더로 토글 */
    resultListScopeFilter: 'pending_only',
    /** 저장 목록: BoB 정성도 내림차순 정렬 */
    resultListBobSort: false,

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
        this.resultListScopeFilter = 'pending_only';
        this.resultListBobSort = false;
        this.optionHotColdBasisRounds = null;
        this.aiRecommendWindowStart = null;
        this.aiRecommendWindowEnd = null;
        this._luckyStatTrustContext = null;
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
