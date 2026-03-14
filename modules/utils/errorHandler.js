/**
 * 전역 에러 핸들링 시스템
 * 예상치 못한 에러 처리 및 사용자 친화적 메시지 표시
 */

/**
 * 에러 로그 저장소 (디버깅용)
 */
const ErrorLog = {
    errors: [],
    maxSize: 50,

    add(error, context = '') {
        this.errors.push({
            timestamp: new Date().toISOString(),
            message: error.message || String(error),
            stack: error.stack,
            context
        });

        // 최대 크기 유지
        if (this.errors.length > this.maxSize) {
            this.errors.shift();
        }
    },

    getAll() {
        return this.errors;
    },

    clear() {
        this.errors = [];
    }
};

/**
 * 사용자에게 에러 알림 표시
 * @param {string} message - 표시할 메시지
 */
function showErrorNotification(message) {
    // 기존 알림 제거
    const existing = document.querySelector('.error-notification');
    if (existing) {
        existing.remove();
    }

    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        white-space: pre-wrap;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 5초 후 자동 제거
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * 에러 객체에서 파일명:라인번호 또는 에러 메시지 추출
 * @param {Error|{stack?: string, message?: string}} err
 * @returns {string} "파일명:라인" 또는 "에러메시지" 또는 ""
 */
function getErrorLocation(err) {
    if (!err) return '';
    const stack = err.stack;
    if (stack && typeof stack === 'string') {
        const lines = stack.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const withCol = line.match(/([^/\\()]+\.(?:js|ts|html?)):(\d+):\d+/);
            if (withCol) return `${withCol[1].trim()}:${withCol[2]}`;
            const fileLine = line.match(/([^/\\()]+\.(?:js|ts|html?)):(\d+)/);
            if (fileLine) return `${fileLine[1].trim()}:${fileLine[2]}`;
            const anyLine = line.match(/:(\d+):(\d+)\s*\)?\s*$/);
            if (anyLine) return `라인 ${anyLine[1]}`;
        }
    }
    const msg = err.message || (typeof err === 'string' ? err : '');
    return msg ? String(msg).slice(0, 80) : '';
}

/**
 * 전역 에러 핸들러
 */
window.addEventListener('error', (event) => {
    const err = event.error;
    console.error('전역 에러:', err);
    ErrorLog.add(err, 'window.error');

    const detail = getErrorLocation(err);
    const message = detail
        ? `오류가 발생했습니다. 페이지를 새로고침해주세요. (${detail})`
        : '오류가 발생했습니다. 페이지를 새로고침해주세요.';
    showErrorNotification(message);

    // 에러 전파 방지 (선택적)
    // event.preventDefault();
});

/**
 * Promise rejection 핸들러
 */
window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    console.error('처리되지 않은 Promise 거부:', reason);
    ErrorLog.add(reason, 'unhandledrejection');

    const detail = getErrorLocation(reason);
    const message = detail
        ? `오류가 발생했습니다. 페이지를 새로고침해주세요. (${detail})`
        : '오류가 발생했습니다. 페이지를 새로고침해주세요.';
    showErrorNotification(message);

    // event.preventDefault();
});

/**
 * 안전한 함수 실행 래퍼
 * @param {Function} fn - 실행할 함수
 * @param {*} fallback - 에러 시 반환할 기본값
 * @param {string} context - 에러 컨텍스트
 * @returns {*} 함수 실행 결과 또는 fallback
 */
function safeExecute(fn, fallback = null, context = '') {
    try {
        return fn();
    } catch (error) {
        console.error(`함수 실행 오류 [${context}]:`, error);
        ErrorLog.add(error, context);
        return fallback;
    }
}

/**
 * 안전한 비동기 함수 실행 래퍼
 * @param {Function} fn - 실행할 비동기 함수
 * @param {*} fallback - 에러 시 반환할 기본값
 * @param {string} context - 에러 컨텍스트
 * @returns {Promise<*>}
 */
async function safeExecuteAsync(fn, fallback = null, context = '') {
    try {
        return await fn();
    } catch (error) {
        console.error(`비동기 함수 실행 오류 [${context}]:`, error);
        ErrorLog.add(error, context);
        return fallback;
    }
}

/**
 * CSS 애니메이션 추가
 */
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 전역으로 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ErrorLog,
        showErrorNotification,
        safeExecute,
        safeExecuteAsync
    };
}
