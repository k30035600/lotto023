/**
 * 캐시 관리 시스템
 * 메모리 누수 방지 및 캐시 일관성 보장
 */
const CacheManager = {
    caches: {
        avgCount: null,
        avgPercentage: null,
        winPercentage: null,
        appearancePercentage: null,
        overallHotCold: null
    },

    /**
     * 캐시 값 가져오기
     * @param {string} key - 캐시 키
     * @returns {*} 캐시된 값
     */
    get(key) {
        return this.caches[key];
    },

    /**
     * 캐시 값 설정
     * @param {string} key - 캐시 키
     * @param {*} value - 저장할 값
     */
    set(key, value) {
        this.caches[key] = value;
    },

    /**
     * 캐시 무효화
     * @param {string} [key] - 특정 키만 무효화, 없으면 전체
     */
    invalidate(key) {
        if (key) {
            this.caches[key] = null;
        } else {
            // 모든 캐시 무효화
            Object.keys(this.caches).forEach(k => {
                this.caches[k] = null;
            });
        }
    },

    /**
     * 데이터 변경 시 자동 무효화
     * 로또 데이터가 변경되면 모든 통계 캐시 무효화
     */
    onDataChange() {
        this.invalidate();
    },

    /**
     * 캐시 존재 여부 확인
     * @param {string} key - 캐시 키
     * @returns {boolean}
     */
    has(key) {
        return this.caches[key] !== null && this.caches[key] !== undefined;
    },

    /**
     * 캐시 상태 조회
     * @returns {Object} 각 캐시의 존재 여부
     */
    status() {
        const status = {};
        Object.keys(this.caches).forEach(key => {
            status[key] = this.has(key);
        });
        return status;
    }
};

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}
