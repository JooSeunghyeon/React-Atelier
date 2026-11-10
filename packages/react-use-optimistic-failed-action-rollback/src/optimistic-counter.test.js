import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { OptimisticCounter, OptimisticList } from './optimistic-counter.js';
import { createElement } from 'react';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});

let testResults = [];
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testResults.push(`❌ ${message}`);
    failedTests++;
  } else {
    console.log(`✅ PASS: ${message}`);
    testResults.push(`✅ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    testResults.push(`❌ ${message} (expected: ${expected}, actual: ${actual})`);
    failedTests++;
  } else {
    console.log(`✅ PASS: ${message}`);
    testResults.push(`✅ ${message}`);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test1_successfulAction() {
  console.log('\n=== Test 1: 성공하는 액션 - 낙관적 값이 실제 상태로 확정됨 ===');
  
  const container = document.createElement('div');
  const root = createRoot(container);
  
  let hookResult;
  function TestComponent() {
    hookResult = OptimisticCounter();
    return null;
  }
  
  await act(async () => {
    root.render(createElement(TestComponent));
  });
  
  assertEqual(hookResult.count, 0, '초기 count는 0');
  assertEqual(hookResult.optimisticCount, 0, '초기 optimisticCount는 0');
  assertEqual(hookResult.isPending, false, '초기 isPending은 false');
  
  await act(async () => {
    hookResult.incrementSuccess();
  });
  
  assertEqual(hookResult.optimisticCount, 1, '액션 시작 직후 optimisticCount는 1');
  assertEqual(hookResult.count, 0, '액션 시작 직후 count는 여전히 0');
  assertEqual(hookResult.isPending, true, '액션 진행 중 isPending은 true');
  
  await act(async () => {
    await delay(150);
  });
  
  assertEqual(hookResult.count, 1, '액션 완료 후 count는 1');
  assertEqual(hookResult.optimisticCount, 1, '액션 완료 후 optimisticCount는 1');
  assertEqual(hookResult.isPending, false, '액션 완료 후 isPending은 false');
  
  root.unmount();
}

async function test2_failedActionWithCatch() {
  console.log('\n=== Test 2: 실패하는 액션 (catch로 처리) - 낙관적 값이 롤백되고 에러 상태 설정 ===');
  
  const container = document.createElement('div');
  const root = createRoot(container);
  
  let hookResult;
  function TestComponent() {
    hookResult = OptimisticCounter();
    return null;
  }
  
  await act(async () => {
    root.render(createElement(TestComponent));
  });
  
  assertEqual(hookResult.count, 0, '초기 count는 0');
  assertEqual(hookResult.optimisticCount, 0, '초기 optimisticCount는 0');
  assertEqual(hookResult.error, null, '초기 error는 null');
  
  await act(async () => {
    hookResult.incrementWithErrorCatch();
  });
  
  assertEqual(hookResult.optimisticCount, 1, '액션 시작 직후 optimisticCount는 1');
  assertEqual(hookResult.count, 0, '액션 시작 직후 count는 여전히 0');
  
  await act(async () => {
    await delay(100);
  });
  
  assertEqual(hookResult.count, 0, '액션 실패 후 count는 여전히 0');
  assertEqual(hookResult.optimisticCount, 0, '액션 실패 후 optimisticCount는 0으로 롤백됨');
  assertEqual(hookResult.error, 'Action failed', '에러 메시지가 상태에 설정됨');
  assertEqual(hookResult.isPending, false, '액션 실패 후 isPending은 false');
  
  root.unmount();
}

async function test3_twoActionsOneFailure() {
  console.log('\n=== Test 3: 연속 두 액션 중 두 번째만 실패 - 첫 번째 성공 유지, 두 번째 롤백 ===');
  
  const container = document.createElement('div');
  const root = createRoot(container);
  
  let hookResult;
  function TestComponent() {
    hookResult = OptimisticCounter();
    return null;
  }
  
  await act(async () => {
    root.render(createElement(TestComponent));
  });
  
  assertEqual(hookResult.count, 0, '초기 count는 0');
  
  await act(async () => {
    hookResult.incrementSuccess();
  });
  
  assertEqual(hookResult.optimisticCount, 1, '첫 번째 액션 시작 직후 optimisticCount는 1');
  
  await act(async () => {
    await delay(100);
  });
  
  assertEqual(hookResult.count, 1, '첫 번째 액션 완료 후 count는 1');
  assertEqual(hookResult.optimisticCount, 1, '첫 번째 액션 완료 후 optimisticCount는 1');
  
  await act(async () => {
    hookResult.incrementWithErrorCatch();
  });
  
  assertEqual(hookResult.optimisticCount, 2, '두 번째 액션 시작 직후 optimisticCount는 2');
  
  await act(async () => {
    await delay(100);
  });
  
  assertEqual(hookResult.count, 1, '두 번째 액션 실패 후 count는 1 유지');
  assertEqual(hookResult.optimisticCount, 1, '두 번째 액션 실패 후 optimisticCount는 1로 롤백');
  assertEqual(hookResult.error, 'Action failed', '에러 메시지가 설정됨');
  
  root.unmount();
}

async function test4_listAddSuccess() {
  console.log('\n=== Test 4: 리스트 추가 성공 - 낙관적 아이템이 실제 아이템으로 확정됨 ===');
  
  const container = document.createElement('div');
  const root = createRoot(container);
  
  let hookResult;
  function TestComponent() {
    hookResult = OptimisticList();
    return null;
  }
  
  await act(async () => {
    root.render(createElement(TestComponent));
  });
  
  assertEqual(hookResult.items.length, 0, '초기 items는 빈 배열');
  assertEqual(hookResult.optimisticItems.length, 0, '초기 optimisticItems는 빈 배열');
  
  await act(async () => {
    hookResult.addItemSuccess('Test Item');
  });
  
  assertEqual(hookResult.optimisticItems.length, 1, '액션 시작 직후 optimisticItems에 1개 추가');
  assert(hookResult.optimisticItems[0].pending === true, '낙관적 아이템은 pending 상태');
  assertEqual(hookResult.items.length, 0, '액션 시작 직후 items는 여전히 빈 배열');
  
  await act(async () => {
    await delay(100);
  });
  
  assertEqual(hookResult.items.length, 1, '액션 완료 후 items에 1개 추가됨');
  assert(hookResult.items[0].pending === false, '실제 아이템은 pending이 false');
  assertEqual(hookResult.optimisticItems.length, 1, '액션 완료 후 optimisticItems도 1개');
  
  root.unmount();
}

async function test5_listAddFailure() {
  console.log('\n=== Test 5: 리스트 추가 실패 - 낙관적 아이템이 제거됨 ===');
  
  const container = document.createElement('div');
  const root = createRoot(container);
  
  let hookResult;
  function TestComponent() {
    hookResult = OptimisticList();
    return null;
  }
  
  await act(async () => {
    root.render(createElement(TestComponent));
  });
  
  assertEqual(hookResult.items.length, 0, '초기 items는 빈 배열');
  
  await act(async () => {
    hookResult.addItemWithErrorCatch('Fail Item');
  });
  
  assertEqual(hookResult.optimisticItems.length, 1, '액션 시작 직후 optimisticItems에 1개 추가');
  
  await act(async () => {
    await delay(100);
  });
  
  assertEqual(hookResult.items.length, 0, '액션 실패 후 items는 여전히 빈 배열');
  assertEqual(hookResult.optimisticItems.length, 0, '액션 실패 후 optimisticItems도 빈 배열로 롤백');
  assertEqual(hookResult.error, 'Failed to add item', '에러 메시지가 설정됨');
  
  root.unmount();
}

async function test6_twoListAddsMixedResults() {
  console.log('\n=== Test 6: 리스트에 두 번 추가, 하나 성공 하나 실패 - 성공만 유지됨 ===');
  
  const container = document.createElement('div');
  const root = createRoot(container);
  
  let hookResult;
  function TestComponent() {
    hookResult = OptimisticList();
    return null;
  }
  
  await act(async () => {
    root.render(createElement(TestComponent));
  });
  
  await act(async () => {
    hookResult.addItemSuccess('Success Item');
  });
  
  await act(async () => {
    await delay(100);
  });
  
  assertEqual(hookResult.items.length, 1, '첫 번째 성공 후 items에 1개');
  assertEqual(hookResult.optimisticItems.length, 1, '첫 번째 성공 후 optimisticItems에 1개');
  
  await act(async () => {
    hookResult.addItemWithErrorCatch('Fail Item');
  });
  
  assertEqual(hookResult.optimisticItems.length, 2, '두 번째 액션 시작 직후 optimisticItems에 2개');
  
  await act(async () => {
    await delay(100);
  });
  
  assertEqual(hookResult.items.length, 1, '두 번째 실패 후 items는 여전히 1개');
  assertEqual(hookResult.optimisticItems.length, 1, '두 번째 실패 후 optimisticItems는 1개로 롤백');
  assertEqual(hookResult.error, 'Failed to add item', '에러 메시지가 설정됨');
  
  root.unmount();
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('React useOptimistic 비동기 액션 실패 시 롤백 테스트');
  console.log('='.repeat(80));
  
  try {
    await test1_successfulAction();
    await test2_failedActionWithCatch();
    await test3_twoActionsOneFailure();
    await test4_listAddSuccess();
    await test5_listAddFailure();
    await test6_twoListAddsMixedResults();
    
    console.log('\n' + '='.repeat(80));
    console.log('테스트 결과 요약');
    console.log('='.repeat(80));
    testResults.forEach(result => console.log(result));
    console.log(`\n총 ${testResults.length}개 검증, ${failedTests}개 실패`);
    
    if (failedTests > 0) {
      console.error(`\n테스트 실패: ${failedTests}개의 검증이 실패했습니다.`);
      process.exit(1);
    } else {
      console.log('\n✅ 모든 테스트 통과!');
      process.exit(0);
    }
  } catch (err) {
    console.error('\n테스트 실행 중 예외 발생:', err);
    process.exit(1);
  }
}

runAllTests();
