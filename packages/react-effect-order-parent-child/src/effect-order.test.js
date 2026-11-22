import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import {
  createLog,
  createMountOrderTest,
  createNaiveFailureTest,
  createDesignATest,
  createDesignBTest,
  createDesignCTest,
  createRerenderTest,
  createDesignCConditionalTest,
  createDesignCDuplicateTest,
} from './effect-order.js';

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

const originalConsoleError = console.error;
let unexpectedErrors = [];

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('An update to Root inside a test was not wrapped in act(...)')) {
    unexpectedErrors.push('Unexpected act warning');
  }
  originalConsoleError(...args);
};

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

function assertContains(array, value, message) {
  if (!array.includes(value)) {
    console.error(`FAIL: ${message}`);
    console.error(`   Value "${value}" not found in array: ${JSON.stringify(array)}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

function assertIndexBefore(array, valueBefore, valueAfter, message) {
  const indexBefore = array.indexOf(valueBefore);
  const indexAfter = array.indexOf(valueAfter);
  if (indexBefore === -1 || indexAfter === -1) {
    console.error(`FAIL: ${message}`);
    console.error(`   One or both values not found in array: ${JSON.stringify(array)}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else if (indexBefore >= indexAfter) {
    console.error(`FAIL: ${message}`);
    console.error(`   "${valueBefore}" (index ${indexBefore}) is not before "${valueAfter}" (index ${indexAfter})`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

function assertNoErrors(log, message) {
  const errors = log.filter(entry => entry.startsWith('ERROR:'));
  if (errors.length > 0) {
    console.error(`FAIL: ${message}`);
    console.error(`   Found ${errors.length} errors: ${JSON.stringify(errors)}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

async function test1_mount_order() {
  console.log('\n=== Test 1: 마운트 순서 - useLayoutEffect와 useEffect 순서 확인 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createMountOrderTest(logger);

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('Recorded log:', log);

  assertContains(log, 'GrandChild1 useLayoutEffect setup', 'GrandChild1 useLayoutEffect setup 실행됨');
  assertContains(log, 'Child1 useLayoutEffect setup', 'Child1 useLayoutEffect setup 실행됨');
  assertContains(log, 'Child2 useLayoutEffect setup', 'Child2 useLayoutEffect setup 실행됨');
  assertContains(log, 'Parent useLayoutEffect setup', 'Parent useLayoutEffect setup 실행됨');
  assertContains(log, 'GrandChild1 useEffect setup', 'GrandChild1 useEffect setup 실행됨');
  assertContains(log, 'Child1 useEffect setup', 'Child1 useEffect setup 실행됨');
  assertContains(log, 'Child2 useEffect setup', 'Child2 useEffect setup 실행됨');
  assertContains(log, 'Parent useEffect setup', 'Parent useEffect setup 실행됨');

  assertIndexBefore(log, 'GrandChild1 useLayoutEffect setup', 'Child1 useLayoutEffect setup', 'GrandChild1 useLayoutEffect가 Child1보다 먼저');
  assertIndexBefore(log, 'Child1 useLayoutEffect setup', 'Parent useLayoutEffect setup', 'Child1 useLayoutEffect가 Parent보다 먼저');
  assertIndexBefore(log, 'Child2 useLayoutEffect setup', 'Parent useLayoutEffect setup', 'Child2 useLayoutEffect가 Parent보다 먼저');
  assertIndexBefore(log, 'Parent useLayoutEffect setup', 'GrandChild1 useEffect setup', 'useLayoutEffect 전체가 useEffect 전체보다 먼저');
  assertIndexBefore(log, 'GrandChild1 useEffect setup', 'Child1 useEffect setup', 'GrandChild1 useEffect가 Child1보다 먼저');
  assertIndexBefore(log, 'Child1 useEffect setup', 'Parent useEffect setup', 'Child1 useEffect가 Parent보다 먼저');
  assertIndexBefore(log, 'Child2 useEffect setup', 'Parent useEffect setup', 'Child2 useEffect가 Parent보다 먼저');

  logger.clearLog();

  await act(async () => {
    root.unmount();
  });

  const unmountLog = logger.getLog();
  console.log('Unmount log:', unmountLog);

  assertContains(unmountLog, 'Parent useEffect cleanup', 'Parent useEffect cleanup 실행됨');
  assertContains(unmountLog, 'Child1 useEffect cleanup', 'Child1 useEffect cleanup 실행됨');
  assertContains(unmountLog, 'Child2 useEffect cleanup', 'Child2 useEffect cleanup 실행됨');
  assertContains(unmountLog, 'GrandChild1 useEffect cleanup', 'GrandChild1 useEffect cleanup 실행됨');
  assertContains(unmountLog, 'Parent useLayoutEffect cleanup', 'Parent useLayoutEffect cleanup 실행됨');
  assertContains(unmountLog, 'Child1 useLayoutEffect cleanup', 'Child1 useLayoutEffect cleanup 실행됨');
  assertContains(unmountLog, 'Child2 useLayoutEffect cleanup', 'Child2 useLayoutEffect cleanup 실행됨');
  assertContains(unmountLog, 'GrandChild1 useLayoutEffect cleanup', 'GrandChild1 useLayoutEffect cleanup 실행됨');

  assertIndexBefore(unmountLog, 'Parent useLayoutEffect cleanup', 'Parent useEffect cleanup', 'useLayoutEffect cleanup이 useEffect cleanup보다 먼저');
  assertIndexBefore(unmountLog, 'Parent useLayoutEffect cleanup', 'Child1 useLayoutEffect cleanup', 'useLayoutEffect cleanup은 부모가 먼저');
  assertIndexBefore(unmountLog, 'Parent useLayoutEffect cleanup', 'Child2 useLayoutEffect cleanup', 'useLayoutEffect cleanup은 부모가 먼저');
  assertIndexBefore(unmountLog, 'Child1 useLayoutEffect cleanup', 'GrandChild1 useLayoutEffect cleanup', 'useLayoutEffect cleanup은 부모가 먼저');
  assertIndexBefore(unmountLog, 'Parent useEffect cleanup', 'Child1 useEffect cleanup', 'useEffect cleanup은 부모가 먼저');
  assertIndexBefore(unmountLog, 'Parent useEffect cleanup', 'Child2 useEffect cleanup', 'useEffect cleanup은 부모가 먼저');
  assertIndexBefore(unmountLog, 'Child1 useEffect cleanup', 'GrandChild1 useEffect cleanup', 'useEffect cleanup은 부모가 먼저');
}

async function test2_naive_failure() {
  console.log('\n=== Test 2: 실패 재현 (Naive) - 부모 useEffect에서 registry 생성, 자식 useEffect에서 사용 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const registryHolder = {};
  const Parent = createNaiveFailureTest(logger, registryHolder);

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('Recorded log:', log);

  assertContains(log, 'Child useEffect: attempting to register', '자식 useEffect가 실행됨');
  assertContains(log, 'ERROR: registry is null at child useEffect', '자식 시점에 registry가 null임');
  assertContains(log, 'Parent useEffect: creating registry', '부모 useEffect가 실행됨');

  assertIndexBefore(log, 'Child useEffect: attempting to register', 'Parent useEffect: creating registry', '자식 useEffect가 부모 useEffect보다 먼저 실행됨');

  assertEqual(registryHolder.registry.items.length, 0, '마운트 후에도 registry.items가 비어 있음 (등록 영구 누락)');

  await act(async () => {
    root.unmount();
  });
}

async function test3_design_a() {
  console.log('\n=== Test 3: 설계 A - 부모 useLayoutEffect로 준비 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const registryHolder = {};
  const Parent = createDesignATest(logger, registryHolder);

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('Recorded log:', log);

  assertContains(log, 'Parent useLayoutEffect: creating registry', '부모 useLayoutEffect가 실행됨');
  assertContains(log, 'ChildWithLayoutEffect useLayoutEffect: checking registry', '자식 useLayoutEffect가 실행됨');
  assertContains(log, 'ERROR: registry is null at child useLayoutEffect', '자식 useLayoutEffect 시점에는 여전히 null');
  assertContains(log, 'ChildWithEffect useEffect: checking registry', '자식 useEffect가 실행됨');
  assertContains(log, 'Parent registry.register called with id: child-effect', '자식 useEffect에서는 등록 성공');

  assertIndexBefore(log, 'ChildWithLayoutEffect useLayoutEffect: checking registry', 'Parent useLayoutEffect: creating registry', '자식 useLayoutEffect가 부모보다 먼저');
  assertIndexBefore(log, 'Parent useLayoutEffect: creating registry', 'ChildWithEffect useEffect: checking registry', '부모 useLayoutEffect가 자식 useEffect보다 먼저');

  assertDeepEqual(registryHolder.registry.items, ['child-effect'], '마운트 후 items가 [child-effect]뿐임');

  await act(async () => {
    root.unmount();
  });
}

async function test4_design_b() {
  console.log('\n=== Test 4: 설계 B - 렌더 중 지연 초기화와 Context ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createDesignBTest(logger);

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('Recorded log:', log);

  assertContains(log, 'Parent useState initializer: creating registry', 'registry가 렌더 중에 생성됨');
  assertContains(log, 'child-layout useLayoutEffect: registering', '자식 useLayoutEffect 실행됨');
  assertContains(log, 'Parent registry.register called with id: child-layout', 'useLayoutEffect에서 등록 성공');
  assertContains(log, 'child-effect useLayoutEffect: registering', '다른 자식 useLayoutEffect 실행됨');
  assertContains(log, 'Parent registry.register called with id: child-effect', 'useLayoutEffect에서 등록 성공');

  assertIndexBefore(log, 'Parent useState initializer: creating registry', 'child-layout useLayoutEffect: registering', 'registry 생성이 모든 effect보다 먼저');
  assertIndexBefore(log, 'Parent useState initializer: creating registry', 'child-effect useLayoutEffect: registering', 'registry 생성이 모든 effect보다 먼저');

  assertNoErrors(log, '로그에 ERROR가 없음');

  logger.clearLog();

  await act(async () => {
    root.unmount();
  });

  const unmountLog = logger.getLog();
  console.log('Unmount log:', unmountLog);

  assertContains(unmountLog, 'Parent useEffect cleanup: disposing registry', 'registry가 정리됨');
  assertContains(unmountLog, 'Parent registry.dispose called', 'dispose 메서드 호출됨');
  assertContains(unmountLog, 'child-layout useLayoutEffect cleanup: unregistering', 'child-layout cleanup 실행됨');
  assertContains(unmountLog, 'Parent registry.unregister called with id: child-layout (after dispose, no-op)', 'dispose 후 unregister는 no-op');
  assertContains(unmountLog, 'child-effect useEffect cleanup: unregistering', 'child-effect cleanup 실행됨');
  assertContains(unmountLog, 'Parent registry.unregister called with id: child-effect (after dispose, no-op)', 'dispose 후 unregister는 no-op');

  assertIndexBefore(unmountLog, 'child-layout useLayoutEffect cleanup: unregistering', 'Parent useEffect cleanup: disposing registry', 'useLayoutEffect cleanup 후 부모 useEffect cleanup');
  assertIndexBefore(unmountLog, 'Parent useEffect cleanup: disposing registry', 'child-layout useEffect cleanup: unregistering', '부모 useEffect cleanup 후 자식 useEffect cleanup');
  assertIndexBefore(unmountLog, 'Parent registry.dispose called', 'Parent registry.unregister called with id: child-layout (after dispose, no-op)', 'dispose가 자식 unregister보다 먼저');
}

async function test5_design_c() {
  console.log('\n=== Test 5: 설계 C - 자식이 effect에서 등록하고 부모 effect에서 처리 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createDesignCTest(logger);

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('Recorded log:', log);

  assertContains(log, 'Parent useState initializer: creating registry functions', 'registry 함수가 렌더 중 생성됨');
  assertContains(log, 'child-1 useEffect setup: registering', 'child-1이 effect에서 등록');
  assertContains(log, 'registry.register called with id: child-1', 'child-1 등록됨');
  assertContains(log, 'child-2 useEffect setup: registering', 'child-2가 effect에서 등록');
  assertContains(log, 'registry.register called with id: child-2', 'child-2 등록됨');
  assertContains(log, 'Parent useEffect: processing 2 registrations', '부모 useEffect에서 2개 등록 처리');
  assertContains(log, 'Parent processing registration: child-1', 'child-1 처리됨');
  assertContains(log, 'Parent processing registration: child-2', 'child-2 처리됨');

  assertIndexBefore(log, 'child-1 useEffect setup: registering', 'Parent useEffect: processing 2 registrations', '자식 effect가 부모 effect보다 먼저');
  assertIndexBefore(log, 'child-2 useEffect setup: registering', 'Parent useEffect: processing 2 registrations', '자식 effect가 부모 effect보다 먼저');

  logger.clearLog();

  await act(async () => {
    root.unmount();
  });

  const unmountLog = logger.getLog();
  console.log('Unmount log:', unmountLog);

  assertContains(unmountLog, 'Parent useEffect cleanup', '부모 cleanup 실행됨');
  assertContains(unmountLog, 'child-1 useEffect cleanup: unregistering', 'child-1 cleanup 실행됨');
  assertContains(unmountLog, 'registry.unregister called with id: child-1', 'child-1 unregister 호출됨');

  assertIndexBefore(unmountLog, 'Parent useEffect cleanup', 'child-1 useEffect cleanup: unregistering', '부모 cleanup이 자식보다 먼저');
}

async function test6_rerender_cleanup_order() {
  console.log('\n=== Test 6: 리렌더 시 cleanup과 setup 순서 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createRerenderTest(logger);

  await act(async () => {
    root.render(createElement(Parent));
  });

  logger.clearLog();

  const button = container.querySelector('[data-testid="increment-button"]');
  await act(async () => {
    button.click();
  });

  const log = logger.getLog();
  console.log('Rerender log:', log);

  assertContains(log, 'Parent useLayoutEffect cleanup', 'Parent useLayoutEffect cleanup 실행됨');
  assertContains(log, 'Child useLayoutEffect cleanup', 'Child useLayoutEffect cleanup 실행됨');
  assertContains(log, 'Parent useLayoutEffect setup', 'Parent useLayoutEffect setup 실행됨');
  assertContains(log, 'Child useLayoutEffect setup', 'Child useLayoutEffect setup 실행됨');
  assertContains(log, 'Parent useEffect cleanup', 'Parent useEffect cleanup 실행됨');
  assertContains(log, 'Child useEffect cleanup', 'Child useEffect cleanup 실행됨');
  assertContains(log, 'Parent useEffect setup', 'Parent useEffect setup 실행됨');
  assertContains(log, 'Child useEffect setup', 'Child useEffect setup 실행됨');

  assertIndexBefore(log, 'Child useLayoutEffect cleanup', 'Parent useLayoutEffect cleanup', 'useLayoutEffect cleanup은 자식이 먼저');
  assertIndexBefore(log, 'Parent useLayoutEffect cleanup', 'Child useLayoutEffect setup', 'cleanup이 setup보다 먼저');
  assertIndexBefore(log, 'Child useLayoutEffect setup', 'Parent useLayoutEffect setup', 'useLayoutEffect setup은 자식이 먼저');
  assertIndexBefore(log, 'Parent useLayoutEffect setup', 'Child useEffect cleanup', 'useLayoutEffect 전체가 useEffect 전체보다 먼저');
  assertIndexBefore(log, 'Child useEffect cleanup', 'Parent useEffect cleanup', 'useEffect cleanup은 자식이 먼저');
  assertIndexBefore(log, 'Parent useEffect cleanup', 'Child useEffect setup', 'cleanup이 setup보다 먼저');
  assertIndexBefore(log, 'Child useEffect setup', 'Parent useEffect setup', 'useEffect setup은 자식이 먼저');

  await act(async () => {
    root.unmount();
  });
}

async function test7_design_c_conditional() {
  console.log('\n=== Test 7: 설계 C - 자식 조건부 사라짐과 memo된 자식 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createDesignCConditionalTest(logger);

  await act(async () => {
    root.render(createElement(Parent));
  });

  const initialLog = logger.getLog();
  console.log('Initial log:', initialLog);

  assertContains(initialLog, 'child-1 render', 'child-1 렌더됨');
  assertContains(initialLog, 'Parent useEffect: current children: [child-1, child-2]', '초기에 2개 자식 등록됨');

  logger.clearLog();

  const button = container.querySelector('[data-testid="toggle-button"]');
  await act(async () => {
    button.click();
  });

  const afterToggleLog = logger.getLog();
  console.log('After toggle log:', afterToggleLog);

  assertContains(afterToggleLog, 'child-2 useEffect cleanup: unregistering', 'child-2 cleanup 실행됨');
  assertContains(afterToggleLog, 'registry.unregister called with id: child-2', 'child-2 unregister 호출됨');
  assertContains(afterToggleLog, 'Parent useEffect: current children: [child-1]', '토글 후 1개 자식만 등록됨');

  const child1RenderCount = afterToggleLog.filter(e => e === 'child-1 render').length;
  assertEqual(child1RenderCount, 0, 'memo된 child-1은 다시 렌더되지 않음');

  const child1EffectSetupCount = afterToggleLog.filter(e => e === 'child-1 useEffect setup: registering').length;
  assertEqual(child1EffectSetupCount, 0, 'child-1 effect는 재실행되지 않아 등록 유지됨');

  logger.clearLog();

  await act(async () => {
    button.click();
  });

  const afterToggleBackLog = logger.getLog();
  console.log('After toggle back log:', afterToggleBackLog);

  assertContains(afterToggleBackLog, 'Parent useEffect: current children: [child-1, child-2]', '다시 토글하면 2개 자식 등록됨');

  await act(async () => {
    root.unmount();
  });
}

async function test8_design_c_duplicate() {
  console.log('\n=== Test 8: 설계 C - 중복 등록 감지와 소유자 비교 ===');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createDesignCDuplicateTest(logger);

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('Recorded log:', log);

  assertContains(log, 'Registering id: same-id', '첫 번째 등록 성공');
  assertContains(log, 'ERROR: duplicate registration of id: same-id', '두 번째 등록 시 중복 오류 발생');
  assertContains(log, 'Parent useEffect: registered ids: [same-id]', '중복은 무시되고 1개만 등록됨');

  logger.clearLog();

  const button = container.querySelector('[data-testid="remove-owner2-button"]');
  await act(async () => {
    button.click();
  });

  const afterRemoveLog = logger.getLog();
  console.log('After remove owner-2 log:', afterRemoveLog);

  assertContains(afterRemoveLog, 'Unregistering id: same-id (owner mismatch, no-op)', 'owner-2 unregister는 owner mismatch로 no-op');
  assertContains(afterRemoveLog, 'Parent useEffect: registered ids: [same-id]', 'owner-2 제거 후에도 등록은 [same-id]로 유지 (owner-1 소유)');

  logger.clearLog();

  await act(async () => {
    root.unmount();
  });

  const unmountLog = logger.getLog();
  console.log('Unmount log:', unmountLog);

  assertContains(unmountLog, 'Unregistering id: same-id (owner match)', 'owner-1의 unregister는 등록을 제거함');

  const ownerMatchCount = unmountLog.filter(e => e === 'Unregistering id: same-id (owner match)').length;
  assertEqual(ownerMatchCount, 1, 'owner-1 unregister만 호출됨 (owner-2는 이미 cleanup됨)');
}

async function runAllTests() {
  console.log('React Effect 실행 순서 테스트 시작\n');

  await test1_mount_order();
  await test2_naive_failure();
  await test3_design_a();
  await test4_design_b();
  await test5_design_c();
  await test6_rerender_cleanup_order();
  await test7_design_c_conditional();
  await test8_design_c_duplicate();

  console.log('\n=== 테스트 요약 ===');
  console.log(`총 테스트: ${testResults.length}개`);
  console.log(`실패: ${failedTests}개`);
  console.log(`예상하지 못한 act 경고: ${unexpectedErrors.length}개`);

  if (failedTests > 0 || unexpectedErrors.length > 0) {
    console.error('\n일부 테스트가 실패했습니다.');
    process.exitCode = 1;
  } else {
    console.log('\n모든 테스트가 통과했습니다.');
  }
}

runAllTests().catch(err => {
  console.error('테스트 실행 중 오류:', err);
  process.exitCode = 1;
});
