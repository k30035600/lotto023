/**
 * 데이터 로더 모듈
 * 로또 데이터 로드 및 캐싱 관리
 */

/**
 * LocalStorage 캐시 키
 */
const CACHE_KEYS = {
    LOTTO645: 'LOTTO645_DATA_CACHE_V2',
    LOTTO023: 'LOTTO023_DATA_CACHE_V2',
    METADATA: 'LOTTO_METADATA_CACHE_V2'
};

/**
 * LocalStorage에서 데이터 가져오기
 * @param {string} key - 캐시 키
 * @returns {*|null} 캐시된 데이터 또는 null
 */
function getFromCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (error) {
        console.error(`캐시 읽기 오류 [${key}]:`, error);
    }
    return null;
}

/**
 * LocalStorage에 데이터 저장
 * @param {string} key - 캐시 키
 * @param {*} data - 저장할 데이터
 * @returns {boolean} 성공 여부
 */
function saveToCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error(`캐시 저장 오류 [${key}]:`, error);
        // LocalStorage 용량 초과 시 오래된 캐시 삭제
        if (error.name === 'QuotaExceededError') {
            clearOldCache();
            try {
                localStorage.setItem(key, JSON.stringify(data));
                return true;
            } catch (retryError) {
                console.error('재시도 실패:', retryError);
            }
        }
    }
    return false;
}

/**
 * 오래된 캐시 삭제
 */
function clearOldCache() {
    try {
        // 메타데이터 제외하고 모든 캐시 삭제
        Object.values(CACHE_KEYS).forEach(key => {
            if (key !== CACHE_KEYS.METADATA) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('캐시 정리 오류:', error);
    }
}

/**
 * JSON 파일 로드
 * @param {string} url - JSON 파일 URL
 * @returns {Promise<Array>} 로드된 데이터
 */
async function loadJSON(url) {
    try {
        const timestamp = Date.now();
        const response = await fetch(`${url}?t=${timestamp}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error(`JSON 로드 오류 [${url}]:`, error);
        throw error;
    }
}

/**
 * XLSX 파일 로드 (SheetJS 사용)
 * @param {string} url - XLSX 파일 URL
 * @returns {Promise<Array>} 파싱된 데이터
 */
async function loadXLSX(url) {
    try {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
        }

        const timestamp = Date.now();
        const response = await fetch(`${url}?t=${timestamp}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
            throw new Error('XLSX 파일에 시트가 없습니다.');
        }

        const sheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        return data;
    } catch (error) {
        console.error(`XLSX 로드 오류 [${url}]:`, error);
        throw error;
    }
}

/**
 * 데이터 정규화 (필드명 통합)
 * @param {Array} data - 원본 데이터
 * @returns {Array} 정규화된 데이터
 */
function normalizeLottoData(data) {
    if (!Array.isArray(data)) return [];

    return data.map(item => {
        // 이미 정규화되어 있으면 그대로 반환 (date가 없으면 날짜에서 복사)
        if (item.round !== undefined && Array.isArray(item.numbers)) {
            if (item.date === undefined && item['날짜'] !== undefined) {
                item.date = item['날짜'];
            }
            return item;
        }

        const normalized = { ...item };

        // 1. 회차 -> round
        if (item['회차'] !== undefined) {
            normalized.round = Number(item['회차']);
        }

        // 1-1. 날짜 -> date
        if (item['날짜'] !== undefined && item['날짜'] !== null && item['날짜'] !== '') {
            normalized.date = item['날짜'];
        }

        // 2. 번호1~6 또는 선택1~6 -> numbers 배열
        if (!Array.isArray(item.numbers)) {
            const numbers = [];
            for (let i = 1; i <= 6; i++) {
                let num = item[`번호${i}`];
                if (num === undefined || num === '') {
                    num = item[`선택${i}`];
                }
                if (num !== undefined && num !== '') {
                    numbers.push(Number(num));
                }
            }
            if (numbers.length === 6) {
                normalized.numbers = numbers;
            }
        }

        // 3. 보너스번호 -> bonus
        if (item['보너스번호'] !== undefined) {
            normalized.bonus = Number(item['보너스번호']);
        }

        // 4. 세트 -> set
        if (item['세트'] !== undefined) {
            normalized.set = Number(item['세트']);
        }

        // 5. 게임 -> game
        if (item['게임'] !== undefined) {
            normalized.game = Number(item['게임']);
        }

        // 6. 홀짝 -> oddEven (null/빈값이면 번호에서 계산)
        if (item['홀짝'] != null && item['홀짝'] !== '') {
            normalized.oddEven = Number(item['홀짝']);
        } else if (normalized.numbers && normalized.numbers.length === 6) {
            normalized.oddEven = normalized.numbers.filter(n => n % 2 === 1).length;
        }

        // 7. 연속 -> sequence (null/빈값이면 번호에서 계산)
        if (item['연속'] != null && item['연속'] !== '') {
            normalized.sequence = Number(item['연속']);
        } else if (normalized.numbers && normalized.numbers.length === 6) {
            const s = [...normalized.numbers].sort((a, b) => a - b);
            let cnt = 0;
            for (let i = 1; i < s.length; i++) { if (s[i] - s[i - 1] === 1) cnt++; }
            normalized.sequence = cnt;
        }

        // 8. 핫콜 -> hotCold (null/빈값은 렌더링 시 계산)
        if (item['핫콜'] != null && item['핫콜'] !== '') {
            normalized.hotCold = Number(item['핫콜']);
        }

        // 9. 게임선택 -> gameMode
        if (item['게임선택'] !== undefined) {
            normalized.gameMode = item['게임선택'];
        }

        return normalized;
    });
}

/**
 * Lotto645 데이터 로드 (캐시 우선)
 * @param {string} basePath - 기본 경로
 * @returns {Promise<Array>} 로또 데이터
 */
async function loadLotto645Data(basePath = '') {
    console.time('LoadLotto645');

    // 1. 캐시 확인
    const cached = getFromCache(CACHE_KEYS.LOTTO645);
    if (cached && Array.isArray(cached) && cached.length > 0) {
        console.timeEnd('LoadLotto645');
        return cached.sort((a, b) => b.round - a.round);
    }

    // 2. JSON 로드 시도
    try {
        const jsonUrl = `${basePath}.source/Lotto645.json`;
        const data = await loadJSON(jsonUrl);

        if (data.length > 0) {
            const normalized = normalizeLottoData(data);
            const sorted = normalized.sort((a, b) => b.round - a.round);
            saveToCache(CACHE_KEYS.LOTTO645, sorted);
            console.timeEnd('LoadLotto645');
            return sorted;
        }
    } catch (error) {
        console.warn('JSON 로드 실패, XLSX 시도:', error);
    }

    // 3. XLSX 로드 (fallback)
    try {
        const xlsxUrl = `${basePath}.source/Lotto645.xlsx`;
        const data = await loadXLSX(xlsxUrl);

        if (data.length > 0) {
            const normalized = normalizeLottoData(data);
            const sorted = normalized.sort((a, b) => b.round - a.round);
            saveToCache(CACHE_KEYS.LOTTO645, sorted);
            console.timeEnd('LoadLotto645');
            return sorted;
        }
    } catch (error) {
        console.error('XLSX 로드 실패:', error);
    }

    console.timeEnd('LoadLotto645');
    return [];
}

/**
 * Lotto023 데이터 로드
 * @param {string} basePath - 기본 경로
 * @returns {Promise<Array>} 로또 데이터
 */
async function loadLotto023Data(basePath = '') {
    console.time('LoadLotto023');

    // 1. 캐시 확인
    const cached = getFromCache(CACHE_KEYS.LOTTO023);
    if (cached && Array.isArray(cached) && cached.length > 0) {
        console.timeEnd('LoadLotto023');
        return cached;
    }

    // 2. XLSX 로드 (원본 데이터 소스)
    try {
        const xlsxUrl = `${basePath}.source/Lotto023.xlsx`;
        const data = await loadXLSX(xlsxUrl);

        if (data.length > 0) {
            const normalized = normalizeLottoData(data);
            saveToCache(CACHE_KEYS.LOTTO023, normalized);
            console.timeEnd('LoadLotto023');
            return normalized;
        }
    } catch (error) {
        console.error('Lotto023 XLSX 로드 실패:', error);
    }

    console.timeEnd('LoadLotto023');
    return [];
}

/**
 * API에서 최신 회차 정보 가져오기
 * @param {string} apiUrl - API URL
 * @returns {Promise<Object|null>} 최신 회차 데이터
 */
async function fetchLatestRound(apiUrl) {
    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('최신 회차 조회 오류:', error);
        return null;
    }
}

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CACHE_KEYS,
        getFromCache,
        saveToCache,
        clearOldCache,
        loadJSON,
        loadXLSX,
        loadLotto645Data,
        loadLotto023Data,
        fetchLatestRound,
    };
}
