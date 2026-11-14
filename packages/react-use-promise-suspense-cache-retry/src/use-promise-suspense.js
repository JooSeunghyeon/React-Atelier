import { use, Suspense, Component, createElement } from 'react';

/**
 * Promise 기반 리소스 캐시를 생성한다.
 * @param {Function} fetchFn - 리소스를 가져오는 비동기 함수 (id) => Promise
 * @returns {Object} { load, evict, getFetchCount }
 */
export function createResourceCache(fetchFn) {
  const cache = new Map();
  let fetchCount = 0;

  function load(id) {
    if (cache.has(id)) {
      return cache.get(id);
    }
    fetchCount++;
    const promise = fetchFn(id);
    cache.set(id, promise);
    return promise;
  }

  function evict(id) {
    cache.delete(id);
  }

  function getFetchCount() {
    return fetchCount;
  }

  return { load, evict, getFetchCount };
}

/**
 * 렌더링마다 새 Promise를 생성하는 컴포넌트 (캐시 없음)
 */
export function UncachedDataComponent({ delayMs = 50 }) {
  const promise = new Promise(resolve => {
    setTimeout(() => resolve('Data'), delayMs);
  });
  const data = use(promise);
  return createElement('div', null, data);
}

/**
 * 캐시된 Promise를 사용하는 컴포넌트
 */
export function CachedDataComponent({ id, cache }) {
  const promise = cache.load(id);
  const data = use(promise);
  return createElement('div', null, data);
}

/**
 * 실패하는 Promise를 반환하는 데이터 소스
 */
export function createFailingDataSource() {
  let attemptCount = 0;

  async function fetchData(id) {
    attemptCount++;
    await new Promise(resolve => setTimeout(resolve, 50));
    throw new Error(`Failed to load ${id}`);
  }

  function getAttemptCount() {
    return attemptCount;
  }

  function reset() {
    attemptCount = 0;
  }

  return { fetchData, getAttemptCount, reset };
}

/**
 * 조건부로 성공/실패하는 데이터 소스
 */
export function createConditionalDataSource() {
  let attemptCount = 0;

  async function fetchData(id, shouldSucceed) {
    attemptCount++;
    await new Promise(resolve => setTimeout(resolve, 50));
    if (!shouldSucceed) {
      throw new Error(`Failed to load ${id}`);
    }
    return `Data for ${id}`;
  }

  function getAttemptCount() {
    return attemptCount;
  }

  function reset() {
    attemptCount = 0;
  }

  return { fetchData, getAttemptCount, reset };
}

/**
 * React Error Boundary 컴포넌트
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return createElement('div', { className: 'error' }, this.state.error.message);
    }
    return this.props.children;
  }
}
