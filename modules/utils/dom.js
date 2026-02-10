/**
 * DOM 캐싱 유틸리티
 * document.getElementById 호출을 최적화하여 성능 향상
 */
const DOM = {
    cache: new Map(),

    /**
     * ID로 DOM 요소 가져오기 (캐싱)
     * @param {string} id - 요소 ID
     * @returns {HTMLElement|null}
     */
    get(id) {
        if (!this.cache.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                this.cache.set(id, element);
            }
            return element;
        }
        return this.cache.get(id);
    },

    /**
     * 여러 요소 한번에 가져오기
     * @param {string[]} ids - 요소 ID 배열
     * @returns {Object} ID를 키로 하는 요소 객체
     */
    getMultiple(ids) {
        const elements = {};
        ids.forEach(id => {
            elements[id] = this.get(id);
        });
        return elements;
    },

    /**
     * 캐시 무효화
     * @param {string} [id] - 특정 ID만 무효화, 없으면 전체
     */
    invalidate(id) {
        if (id) {
            this.cache.delete(id);
        } else {
            this.cache.clear();
        }
    },

    /**
     * 캐시 상태 확인
     * @returns {number} 캐시된 요소 수
     */
    size() {
        return this.cache.size;
    }
};

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOM;
}
