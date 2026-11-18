import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import {
  createRefLog,
  createSubscriptionCounter,
  createInlineRefComponent,
  createStableRefComponent,
  createCleanupRefComponent,
  createStableCleanupRefComponent,
  createLeakySubscriptionComponent,
  createProperSubscriptionComponent,
  createConditionalComponent,
} from './callback-ref-cleanup.js';

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

function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    console.error(`FAIL: ${message}`);
    console.error(`   Expected: ${expectedStr}`);
    console.error(`   Actual: ${actualStr}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

async function test1_inline_ref_without_cleanup() {
  console.log('\n=== Test 1: 인라인 콜백 ref (cleanup 없음) - 리렌더 시 null → 새 함수 재호출 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const refLog = createRefLog();
  const InlineRefComponent = createInlineRefComponent(refLog);

  await act(async () => {
    root.render(createElement(InlineRefComponent));
  });

  const initialLog = refLog.getLog();
  assertEqual(initialLog.length, 1, '초기 마운트 시 ref 호출 1회');
  assertEqual(initialLog[0].label, 'inline', '초기 호출 label 확인');
  assertEqual(initialLog[0].node, 'node', '초기 호출 시 node 전달');

  refLog.clearLog();

  const button = container.querySelector('[data-testid="rerender-button"]');
  await act(async () => {
    button.click();
  });

  const afterRerenderLog = refLog.getLog();
  // 인라인 ref는 리렌더 시 이전 함수가 null로 호출되고 새 함수가 node로 호출됨
  // 실제 React 19 동작: 함수 식별성이 바뀌면 null → node 순서로 호출
  assertDeepEqual(afterRerenderLog, [
    { label: 'inline', node: 'null' },
    { label: 'inline', node: 'node' }
  ], '리렌더 시 null → node 순서로 호출');

  await act(async () => {
    root.unmount();
  });
}

async function test2_stable_ref_no_reattach() {
  console.log('\n=== Test 2: useCallback 고정 콜백 ref - 리렌더 시 재호출 없음 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const refLog = createRefLog();
  const StableRefComponent = createStableRefComponent(refLog);

  await act(async () => {
    root.render(createElement(StableRefComponent));
  });

  const initialLog = refLog.getLog();
  assertEqual(initialLog.length, 1, '초기 마운트 시 ref 호출 1회');
  assertEqual(initialLog[0].label, 'stable', '초기 호출 label 확인');
  assertEqual(initialLog[0].node, 'node', '초기 호출 시 node 전달');

  refLog.clearLog();

  const button = container.querySelector('[data-testid="rerender-button"]');
  await act(async () => {
    button.click();
  });

  const afterRerenderLog = refLog.getLog();
  assertEqual(afterRerenderLog.length, 0, '리렌더 시 ref 재호출 없음 (식별성 고정)');

  refLog.clearLog();

  await act(async () => {
    root.unmount();
  });

  const afterUnmountLog = refLog.getLog();
  assertEqual(afterUnmountLog.length, 1, '언마운트 시 null 호출 1회');
  assertEqual(afterUnmountLog[0].node, 'null', '언마운트 시 null 전달');
}

async function test3_cleanup_return_inline() {
  console.log('\n=== Test 3: cleanup 반환 콜백 ref (인라인) - 리렌더마다 cleanup → 재연결 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const refLog = createRefLog();
  const CleanupRefComponent = createCleanupRefComponent(refLog);

  await act(async () => {
    root.render(createElement(CleanupRefComponent));
  });

  const initialLog = refLog.getLog();
  assertEqual(initialLog.length, 1, '초기 마운트 시 attach 호출 1회');
  assertEqual(initialLog[0].label, 'cleanup-attach', '초기 호출 label 확인');

  refLog.clearLog();

  const button = container.querySelector('[data-testid="rerender-button"]');
  await act(async () => {
    button.click();
  });

  const afterRerenderLog = refLog.getLog();
  // cleanup 반환 + 인라인 = 식별성 변경 → 이전 cleanup 호출 → 새 attach 호출
  assertDeepEqual(afterRerenderLog, [
    { label: 'cleanup-detach', node: 'null' },
    { label: 'cleanup-attach', node: 'node' }
  ], '리렌더 시 cleanup-detach → cleanup-attach 순서로 호출');

  refLog.clearLog();

  await act(async () => {
    root.unmount();
  });

  const afterUnmountLog = refLog.getLog();
  assertEqual(afterUnmountLog.length, 1, '언마운트 시 cleanup-detach 호출 1회');
  assertEqual(afterUnmountLog[0].label, 'cleanup-detach', '언마운트 시 cleanup 호출 확인');
}

async function test4_cleanup_return_stable() {
  console.log('\n=== Test 4: cleanup 반환 콜백 ref (useCallback 고정) - 리렌더 시 재호출 없음 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const refLog = createRefLog();
  const StableCleanupRefComponent = createStableCleanupRefComponent(refLog);

  await act(async () => {
    root.render(createElement(StableCleanupRefComponent));
  });

  const initialLog = refLog.getLog();
  assertEqual(initialLog.length, 1, '초기 마운트 시 attach 호출 1회');
  assertEqual(initialLog[0].label, 'stable-cleanup-attach', '초기 호출 label 확인');

  refLog.clearLog();

  const button = container.querySelector('[data-testid="rerender-button"]');
  await act(async () => {
    button.click();
  });

  const afterRerenderLog = refLog.getLog();
  assertEqual(afterRerenderLog.length, 0, '리렌더 시 재호출 없음 (식별성 고정 + cleanup)');

  refLog.clearLog();

  await act(async () => {
    root.unmount();
  });

  const afterUnmountLog = refLog.getLog();
  assertEqual(afterUnmountLog.length, 1, '언마운트 시 cleanup-detach 호출 1회');
  assertEqual(afterUnmountLog[0].label, 'stable-cleanup-detach', '언마운트 시 cleanup 호출 확인');
}

async function test5_subscription_leak_vs_cleanup() {
  console.log('\n=== Test 5: 구독 누수 vs cleanup - null 처리 누락 시 누적, cleanup은 항상 1 유지 ===');

  // 5-1: null 처리 누락 - 구독 누수
  const container1 = document.createElement('div');
  const root1 = createRoot(container1);
  const counter1 = createSubscriptionCounter();
  const LeakyComponent = createLeakySubscriptionComponent(counter1);

  await act(async () => {
    root1.render(createElement(LeakyComponent));
  });

  assertEqual(counter1.getCount(), 1, '초기 마운트 후 활성 구독 1개');

  const button1 = container1.querySelector('[data-testid="rerender-button"]');
  await act(async () => {
    button1.click();
  });

  // 리렌더 시 인라인 ref는 이전 함수 null 호출(subscribe 1회) + 새 함수 node 호출(subscribe 1회)
  // 총 3회 subscribe: 초기 1 + null 호출 1 + node 호출 1 = 3
  assertEqual(counter1.getCount(), 3, '리렌더 후 구독 3개 누적 (null/node 호출 시 모두 subscribe)');

  await act(async () => {
    root1.unmount();
  });

  // 5-2: cleanup으로 관리 - 항상 1 유지
  const container2 = document.createElement('div');
  const root2 = createRoot(container2);
  const counter2 = createSubscriptionCounter();
  const ProperComponent = createProperSubscriptionComponent(counter2);

  await act(async () => {
    root2.render(createElement(ProperComponent));
  });

  assertEqual(counter2.getCount(), 1, '초기 마운트 후 활성 구독 1개 (cleanup 버전)');

  const button2 = container2.querySelector('[data-testid="rerender-button"]');
  await act(async () => {
    button2.click();
  });

  assertEqual(counter2.getCount(), 1, '리렌더 후에도 활성 구독 1개 유지 (cleanup으로 관리)');

  await act(async () => {
    button2.click();
  });

  assertEqual(counter2.getCount(), 1, '두 번째 리렌더 후에도 활성 구독 1개 유지');

  await act(async () => {
    root2.unmount();
  });

  assertEqual(counter2.getCount(), 0, '언마운트 후 활성 구독 0개 (cleanup으로 정리)');
}

async function test6_conditional_render() {
  console.log('\n=== Test 6: 조건부 렌더 - 요소 제거 후 재등장 시 연결/해제 순서 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const refLog = createRefLog();
  const ConditionalComponent = createConditionalComponent(refLog);

  await act(async () => {
    root.render(createElement(ConditionalComponent, { showTarget: true }));
  });

  const initialLog = refLog.getLog();
  assertEqual(initialLog.length, 1, '초기 렌더 시 attach 호출 1회');
  assertEqual(initialLog[0].label, 'conditional-attach', '초기 attach 확인');

  refLog.clearLog();

  await act(async () => {
    root.render(createElement(ConditionalComponent, { showTarget: false }));
  });

  const afterHideLog = refLog.getLog();
  assertEqual(afterHideLog.length, 1, '요소 제거 시 detach 호출 1회');
  assertEqual(afterHideLog[0].label, 'conditional-detach', '요소 제거 시 detach 확인');

  refLog.clearLog();

  await act(async () => {
    root.render(createElement(ConditionalComponent, { showTarget: true }));
  });

  const afterShowLog = refLog.getLog();
  assertEqual(afterShowLog.length, 1, '요소 재등장 시 attach 호출 1회');
  assertEqual(afterShowLog[0].label, 'conditional-attach', '요소 재등장 시 attach 확인');

  await act(async () => {
    root.unmount();
  });
}

async function test7_key_change() {
  console.log('\n=== Test 7: key 변경 - 요소 교체 시 detach → attach 순서 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const refLog = createRefLog();
  const ConditionalComponent = createConditionalComponent(refLog);

  await act(async () => {
    root.render(createElement(ConditionalComponent, { showTarget: true, useKey: true }));
  });

  const initialLog = refLog.getLog();
  assertEqual(initialLog.length, 1, '초기 렌더 시 attach 호출 1회');

  refLog.clearLog();

  const button = container.querySelector('[data-testid="rerender-button"]');
  await act(async () => {
    button.click();
  });

  const afterKeyChangeLog = refLog.getLog();
  // key가 변경되면 이전 요소 detach → 새 요소 attach
  assertDeepEqual(afterKeyChangeLog, [
    { label: 'conditional-detach', node: 'null' },
    { label: 'conditional-attach', node: 'node' }
  ], 'key 변경 시 detach → attach 순서로 호출');

  await act(async () => {
    root.unmount();
  });
}

async function runAllTests() {
  await test1_inline_ref_without_cleanup();
  await test2_stable_ref_no_reattach();
  await test3_cleanup_return_inline();
  await test4_cleanup_return_stable();
  await test5_subscription_leak_vs_cleanup();
  await test6_conditional_render();
  await test7_key_change();

  console.log('\n=== 테스트 결과 요약 ===');
  console.log(`총 ${testResults.length}개 검증, ${failedTests}개 실패`);

  if (failedTests === 0) {
    console.log('모든 테스트 통과!');
    process.exit(0);
  } else {
    console.error(`\n${failedTests}개의 검증이 실패했습니다.`);
    process.exit(1);
  }
}

runAllTests();
