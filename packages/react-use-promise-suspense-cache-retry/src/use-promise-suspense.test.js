import { JSDOM } from 'jsdom';
import { act, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import {
  createResourceCache,
  createUncachedDataComponent,
  CachedDataComponent,
  createFailingDataSource,
  createConditionalDataSource,
  ErrorBoundary,
} from './use-promise-suspense.js';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});

let testResults = [];
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`FAIL: ${message}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    testResults.push(`FAIL: ${message} (expected: ${expected}, actual: ${actual})`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test1_uncached_never_leaves_fallback() {
  console.log('\n=== Test 1: 캐시 없이 렌더링마다 새 Promise 생성 - 폴백에서 벗어나지 못함 ===');

  const container = document.createElement('div');
  const root = createRoot(container);

  const { UncachedDataComponent, getCreatedCount } = createUncachedDataComponent();

  function TestComponent() {
    return createElement(
      'div',
      null,
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading...') },
        createElement(UncachedDataComponent, { delayMs: 30 })
      )
    );
  }

  await act(async () => {
    root.render(createElement(TestComponent));
  });

  assertEqual(container.textContent, 'Loading...', '초기 렌더링 시 폴백 표시');
  const initialCreatedCount = getCreatedCount();
  assert(initialCreatedCount >= 1, `초기 Promise 생성 횟수는 1 이상 (실제: ${initialCreatedCount})`);

  await act(async () => {
    await delay(100);
  });

  const finalCreatedCount = getCreatedCount();
  assertEqual(container.textContent, 'Loading...', '여러 틱 후에도 폴백 유지');
  assert(
    finalCreatedCount > 1,
    `Promise 생성이 계속됨 (초기: ${initialCreatedCount}, 최종: ${finalCreatedCount})`
  );

  root.unmount();
}

async function test2_cached_single_fetch_shows_content() {
  console.log('\n=== Test 2: 캐시된 Promise - fetch 1회, 폴백 한 번, 이후 콘텐츠 표시 ===');

  const cache = createResourceCache(async id => {
    await delay(50);
    return `Data ${id}`;
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  function TestComponent() {
    return createElement(
      'div',
      null,
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading...') },
        createElement(CachedDataComponent, { id: 'test-1', cache })
      )
    );
  }

  await act(async () => {
    root.render(createElement(TestComponent));
  });

  assertEqual(container.textContent, 'Loading...', '초기 렌더링 시 폴백 표시');
  assertEqual(cache.getFetchCount(), 1, 'fetch 1회 실행');

  await act(async () => {
    await delay(100);
  });

  assertEqual(container.textContent, 'Data test-1', 'Promise 완료 후 콘텐츠 표시');
  assertEqual(cache.getFetchCount(), 1, 'fetch 여전히 1회 (캐시됨)');

  await act(async () => {
    root.render(createElement(TestComponent));
  });

  assertEqual(container.textContent, 'Data test-1', '재렌더링 시에도 콘텐츠 즉시 표시');
  assertEqual(cache.getFetchCount(), 1, 'fetch 여전히 1회 (캐시 재사용)');

  root.unmount();
}

async function test3_rejected_cached_promise_shows_error() {
  console.log('\n=== Test 3: 거부된 캐시 Promise - Error Boundary가 에러 메시지 표시 ===');

  const dataSource = createFailingDataSource();
  const cache = createResourceCache(dataSource.fetchData);

  const container = document.createElement('div');
  const root = createRoot(container);

  function TestComponent() {
    return createElement(
      ErrorBoundary,
      null,
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading...') },
        createElement(CachedDataComponent, { id: 'fail-1', cache })
      )
    );
  }

  await act(async () => {
    root.render(createElement(TestComponent));
  });

  assertEqual(container.textContent, 'Loading...', '초기 렌더링 시 폴백 표시');

  await act(async () => {
    await delay(100);
  });

  assertEqual(container.textContent, 'Failed to load fail-1', 'Error Boundary가 에러 메시지 표시');
  assertEqual(dataSource.getAttemptCount(), 1, '시도 횟수 1회');

  root.unmount();
}

async function test4_reset_boundary_without_evict_rethrows() {
  console.log('\n=== Test 4: 캐시 유지 + key 재설정 - 같은 에러 재발생, 시도 횟수 불변 ===');

  const dataSource = createFailingDataSource();
  const cache = createResourceCache(dataSource.fetchData);

  const container = document.createElement('div');
  const root = createRoot(container);

  function TestComponent({ boundaryKey }) {
    return createElement(
      ErrorBoundary,
      { key: boundaryKey },
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading...') },
        createElement(CachedDataComponent, { id: 'fail-2', cache })
      )
    );
  }

  await act(async () => {
    root.render(createElement(TestComponent, { boundaryKey: 'key-1' }));
  });

  await act(async () => {
    await delay(100);
  });

  assertEqual(container.textContent, 'Failed to load fail-2', '첫 번째 에러 표시');
  assertEqual(dataSource.getAttemptCount(), 1, '시도 횟수 1회');

  await act(async () => {
    root.render(createElement(TestComponent, { boundaryKey: 'key-2' }));
  });

  await act(async () => {
    await delay(100);
  });

  assertEqual(container.textContent, 'Failed to load fail-2', '같은 에러 메시지 표시');
  assertEqual(dataSource.getAttemptCount(), 1, '시도 횟수 여전히 1회 (캐시 재사용)');

  root.unmount();
}

async function test5_evict_cache_and_reset_boundary_succeeds() {
  console.log('\n=== Test 5: 캐시 제거 + key 재설정 - 새 시도 성공, 콘텐츠 표시 ===');

  let attemptNumber = 0;
  const cache = createResourceCache(async (id) => {
    attemptNumber++;
    await delay(50);
    if (attemptNumber === 1) {
      throw new Error(`Failed to load ${id}`);
    }
    return `Data for ${id}`;
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  function TestComponent({ boundaryKey }) {
    return createElement(
      ErrorBoundary,
      { key: boundaryKey },
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading...') },
        createElement(CachedDataComponent, { id: 'resource-1', cache })
      )
    );
  }

  await act(async () => {
    root.render(createElement(TestComponent, { boundaryKey: 'key-1' }));
  });

  await act(async () => {
    await delay(100);
  });

  assertEqual(container.textContent, 'Failed to load resource-1', '첫 번째 에러 표시');
  assertEqual(attemptNumber, 1, '시도 횟수 1회');
  assertEqual(cache.getFetchCount(), 1, 'fetch 횟수 1회');

  cache.evict('resource-1');

  await act(async () => {
    root.render(createElement(TestComponent, { boundaryKey: 'key-1' }));
  });

  assertEqual(container.textContent, 'Failed to load resource-1', 'evict만으로는 에러 UI 유지 (boundary는 여전히 에러 상태)');
  assertEqual(attemptNumber, 1, 'evict만으로는 시도 횟수 불변');

  await act(async () => {
    root.render(createElement(TestComponent, { boundaryKey: 'key-2' }));
  });

  assertEqual(container.textContent, 'Loading...', 'evict + key 재설정 시 폴백 표시');

  await act(async () => {
    await delay(100);
  });

  assertEqual(container.textContent, 'Data for resource-1', '재시도 성공, 콘텐츠 표시');
  assertEqual(attemptNumber, 2, '시도 횟수 2회');
  assertEqual(cache.getFetchCount(), 2, 'fetch 횟수 2회');

  root.unmount();
}

async function test6_different_ids_separate_cache_entries() {
  console.log('\n=== Test 6: 다른 id는 별도 캐시 항목 - 각각 독립적으로 fetch ===');

  const cache = createResourceCache(async id => {
    await delay(50);
    return `Data ${id}`;
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  function TestComponent() {
    return createElement(
      'div',
      null,
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading A...') },
        createElement(CachedDataComponent, { id: 'id-a', cache })
      ),
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading B...') },
        createElement(CachedDataComponent, { id: 'id-b', cache })
      )
    );
  }

  await act(async () => {
    root.render(createElement(TestComponent));
  });

  assert(container.textContent.includes('Loading'), '초기 렌더링 시 폴백 표시');
  assertEqual(cache.getFetchCount(), 2, '서로 다른 id로 2회 fetch 실행');

  await act(async () => {
    await delay(100);
  });

  assert(container.textContent.includes('Data id-a'), 'id-a 데이터 표시');
  assert(container.textContent.includes('Data id-b'), 'id-b 데이터 표시');
  assertEqual(cache.getFetchCount(), 2, 'fetch 여전히 2회 (캐시됨)');

  root.unmount();
}

async function test7_same_id_shared_cache_single_fetch() {
  console.log('\n=== Test 7: 같은 id를 공유하는 두 컴포넌트 - 단일 fetch 공유 ===');

  const cache = createResourceCache(async id => {
    await delay(50);
    return `Shared ${id}`;
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  function TestComponent() {
    return createElement(
      'div',
      null,
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading 1...') },
        createElement(CachedDataComponent, { id: 'shared-id', cache })
      ),
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Loading 2...') },
        createElement(CachedDataComponent, { id: 'shared-id', cache })
      )
    );
  }

  await act(async () => {
    root.render(createElement(TestComponent));
  });

  assert(container.textContent.includes('Loading'), '초기 렌더링 시 폴백 표시');
  assertEqual(cache.getFetchCount(), 1, '같은 id로 1회만 fetch 실행');

  await act(async () => {
    await delay(100);
  });

  const text = container.textContent;
  const matchCount = (text.match(/Shared shared-id/g) || []).length;
  assertEqual(matchCount, 2, '두 컴포넌트 모두 같은 데이터 표시');
  assertEqual(cache.getFetchCount(), 1, 'fetch 여전히 1회 (캐시 공유)');

  root.unmount();
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('React use(promise)와 Suspense에서 Promise 식별성·캐시·거부 재시도 테스트');
  console.log('='.repeat(80));

  try {
    await test1_uncached_never_leaves_fallback();
    await test2_cached_single_fetch_shows_content();
    await test3_rejected_cached_promise_shows_error();
    await test4_reset_boundary_without_evict_rethrows();
    await test5_evict_cache_and_reset_boundary_succeeds();
    await test6_different_ids_separate_cache_entries();
    await test7_same_id_shared_cache_single_fetch();

    console.log('\n' + '='.repeat(80));
    console.log('테스트 결과 요약');
    console.log('='.repeat(80));
    testResults.forEach(result => console.log(result));
    console.log(`\n총 ${testResults.length}개 검증, ${failedTests}개 실패`);

    if (failedTests > 0) {
      console.error(`\n테스트 실패: ${failedTests}개의 검증이 실패했습니다.`);
      process.exit(1);
    } else {
      console.log('\n모든 테스트 통과!');
      process.exit(0);
    }
  } catch (err) {
    console.error('\n테스트 실행 중 예외 발생:', err);
    process.exit(1);
  }
}

runAllTests();
