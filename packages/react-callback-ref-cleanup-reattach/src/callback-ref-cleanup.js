import { createElement, useCallback, useState } from 'react';

/**
 * ref 호출 로그를 기록하는 팩토리를 생성한다.
 */
export function createRefLog() {
  const log = [];

  function recordRef(label, node) {
    log.push({ label, node: node === null ? 'null' : 'node' });
  }

  function getLog() {
    return log;
  }

  function clearLog() {
    log.length = 0;
  }

  return { recordRef, getLog, clearLog };
}

/**
 * 구독 카운터를 생성한다. (ResizeObserver나 이벤트 리스너 대신 간단한 구독 추적)
 */
export function createSubscriptionCounter() {
  let activeCount = 0;

  function subscribe() {
    activeCount++;
  }

  function unsubscribe() {
    activeCount--;
  }

  function getCount() {
    return activeCount;
  }

  function reset() {
    activeCount = 0;
  }

  return { subscribe, unsubscribe, getCount, reset };
}

/**
 * 인라인 콜백 ref 컴포넌트 (cleanup 없음)
 */
export function createInlineRefComponent(refLog) {
  return function InlineRefComponent({ text = 'content' }) {
    const [count, setCount] = useState(0);

    return createElement(
      'div',
      null,
      createElement('button', {
        onClick: () => setCount(c => c + 1),
        'data-testid': 'rerender-button'
      }, `Rerender (${count})`),
      createElement('div', {
        ref: (node) => {
          refLog.recordRef('inline', node);
        },
        'data-testid': 'target'
      }, text)
    );
  };
}

/**
 * useCallback으로 고정된 콜백 ref 컴포넌트
 */
export function createStableRefComponent(refLog) {
  return function StableRefComponent({ text = 'content' }) {
    const [count, setCount] = useState(0);

    const stableRef = useCallback((node) => {
      refLog.recordRef('stable', node);
    }, []);

    return createElement(
      'div',
      null,
      createElement('button', {
        onClick: () => setCount(c => c + 1),
        'data-testid': 'rerender-button'
      }, `Rerender (${count})`),
      createElement('div', {
        ref: stableRef,
        'data-testid': 'target'
      }, text)
    );
  };
}

/**
 * cleanup 반환 콜백 ref 컴포넌트 (인라인)
 */
export function createCleanupRefComponent(refLog) {
  return function CleanupRefComponent({ text = 'content' }) {
    const [count, setCount] = useState(0);

    return createElement(
      'div',
      null,
      createElement('button', {
        onClick: () => setCount(c => c + 1),
        'data-testid': 'rerender-button'
      }, `Rerender (${count})`),
      createElement('div', {
        ref: (node) => {
          if (node) {
            refLog.recordRef('cleanup-attach', node);
            return () => {
              refLog.recordRef('cleanup-detach', null);
            };
          }
        },
        'data-testid': 'target'
      }, text)
    );
  };
}

/**
 * cleanup 반환 콜백 ref 컴포넌트 (useCallback으로 고정)
 */
export function createStableCleanupRefComponent(refLog) {
  return function StableCleanupRefComponent({ text = 'content' }) {
    const [count, setCount] = useState(0);

    const stableCleanupRef = useCallback((node) => {
      if (node) {
        refLog.recordRef('stable-cleanup-attach', node);
        return () => {
          refLog.recordRef('stable-cleanup-detach', null);
        };
      }
    }, []);

    return createElement(
      'div',
      null,
      createElement('button', {
        onClick: () => setCount(c => c + 1),
        'data-testid': 'rerender-button'
      }, `Rerender (${count})`),
      createElement('div', {
        ref: stableCleanupRef,
        'data-testid': 'target'
      }, text)
    );
  };
}

/**
 * 구독 카운터를 사용하는 컴포넌트 (null 처리 누락)
 */
export function createLeakySubscriptionComponent(counter) {
  return function LeakySubscriptionComponent({ text = 'content' }) {
    const [count, setCount] = useState(0);

    return createElement(
      'div',
      null,
      createElement('button', {
        onClick: () => setCount(c => c + 1),
        'data-testid': 'rerender-button'
      }, `Rerender (${count})`),
      createElement('div', {
        ref: (node) => {
          // 버그: null 체크 없이 항상 subscribe
          counter.subscribe();
        },
        'data-testid': 'target'
      }, text)
    );
  };
}

/**
 * 구독 카운터를 cleanup으로 관리하는 컴포넌트
 */
export function createProperSubscriptionComponent(counter) {
  return function ProperSubscriptionComponent({ text = 'content' }) {
    const [count, setCount] = useState(0);

    return createElement(
      'div',
      null,
      createElement('button', {
        onClick: () => setCount(c => c + 1),
        'data-testid': 'rerender-button'
      }, `Rerender (${count})`),
      createElement('div', {
        ref: (node) => {
          if (node) {
            counter.subscribe();
            return () => {
              counter.unsubscribe();
            };
          }
        },
        'data-testid': 'target'
      }, text)
    );
  };
}

/**
 * 조건부 렌더링 컴포넌트
 */
export function createConditionalComponent(refLog) {
  return function ConditionalComponent({ showTarget = true, useKey = false }) {
    const [count, setCount] = useState(0);

    return createElement(
      'div',
      null,
      createElement('button', {
        onClick: () => setCount(c => c + 1),
        'data-testid': 'rerender-button'
      }, `Rerender (${count})`),
      showTarget && createElement('div', {
        key: useKey ? count : undefined,
        ref: (node) => {
          if (node) {
            refLog.recordRef('conditional-attach', node);
            return () => {
              refLog.recordRef('conditional-detach', null);
            };
          }
        },
        'data-testid': 'target'
      }, 'conditional')
    );
  };
}
