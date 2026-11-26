import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import {
  setupTestEnvironment,
  ErrorBoundary,
  resetTestResults,
  getTestResults,
  assert,
  assertEqual,
  assertDeepEqual,
  assertGreaterThan,
  assertLessThan,
} from './test-helpers.js';
import {
  DesignAImpure,
  DesignBPureWithEventId,
  DesignCPureWithEffect,
  resetModuleState,
  getModuleLog,
  getModuleIdCounter,
  resetRenderLog,
  getRenderLog,
  resetEffectLog,
  getEffectLog,
  createReducerCallCounter,
  CounterWithCallTracking,
  createBailOutReducer,
  BailOutComponent,
  createThrowingReducer,
  ThrowingComponent,
} from './reducer-components.js';

setupTestEnvironment();

function printTestHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

// 테스트 1: 설계 A - 단일 인스턴스에서 불순한 reducer
async function test01_designA_singleInstance() {
  printTestHeader('테스트 1: 설계 A - 단일 인스턴스에서 불순한 reducer');

  resetTestResults();
  resetModuleState();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedState = null;
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ state, dispatch }) => {
          capturedState = state;
          capturedDispatch = dispatch;
        },
      })
    );
  });

  resetModuleState();

  await act(async () => {
    capturedDispatch({ type: 'add', text: 'first' });
  });

  assertEqual(capturedState.items.length, 1, '아이템이 1개여야 함');
  assertEqual(capturedState.items[0].id, 1, '첫 번째 아이템 id는 1이어야 함');
  assertEqual(getModuleIdCounter(), 1, '모듈 카운터는 1이어야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 2: 설계 A - 두 인스턴스 간 모듈 상태 공유 문제
async function test02_designA_twoInstances() {
  printTestHeader('테스트 2: 설계 A - 두 인스턴스 간 모듈 상태 공유 문제');

  resetTestResults();
  resetModuleState();

  const container1 = document.createElement('div');
  const root1 = createRoot(container1);
  let state1 = null;
  let dispatch1 = null;

  await act(async () => {
    root1.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ state, dispatch }) => {
          state1 = state;
          dispatch1 = dispatch;
        },
      })
    );
  });

  resetModuleState();

  await act(async () => {
    dispatch1({ type: 'add', text: 'first' });
  });

  const firstId = state1.items[0].id;
  assertEqual(firstId, 1, '첫 번째 인스턴스의 id는 1이어야 함');

  const container2 = document.createElement('div');
  const root2 = createRoot(container2);
  let state2 = null;
  let dispatch2 = null;

  await act(async () => {
    root2.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ state, dispatch }) => {
          state2 = state;
          dispatch2 = dispatch;
        },
      })
    );
  });

  await act(async () => {
    dispatch2({ type: 'add', text: 'second' });
  });

  const secondId = state2.items[0].id;
  assertGreaterThan(secondId, 1, '두 번째 인스턴스의 id는 1보다 커야 함 (모듈 상태 공유)');
  assertEqual(secondId, 2, '두 번째 인스턴스의 id는 2여야 함');

  await act(async () => {
    root1.unmount();
    root2.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 3: 설계 A - 연속 dispatch
async function test03_designA_consecutiveDispatches() {
  printTestHeader('테스트 3: 설계 A - 연속 dispatch');

  resetTestResults();
  resetModuleState();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedState = null;
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ state, dispatch }) => {
          capturedState = state;
          capturedDispatch = dispatch;
        },
      })
    );
  });

  resetModuleState();

  await act(async () => {
    capturedDispatch({ type: 'add', text: 'first' });
    capturedDispatch({ type: 'add', text: 'second' });
  });

  assertEqual(capturedState.items.length, 2, '아이템이 2개여야 함');
  assertEqual(capturedState.items[0].id, 1, '첫 번째 id는 1이어야 함');
  assertEqual(capturedState.items[1].id, 2, '두 번째 id는 2여야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 4: 설계 B - 단일 인스턴스에서 순수 reducer
async function test04_designB_singleInstance() {
  printTestHeader('테스트 4: 설계 B - 단일 인스턴스에서 순수 reducer');

  resetTestResults();
  resetRenderLog();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedState = null;

  await act(async () => {
    root.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: ({ state }) => {
          capturedState = state;
        },
      })
    );
  });

  const button = container.querySelector('button');
  await act(async () => {
    button.click();
  });

  assertEqual(capturedState.items.length, 1, '아이템이 1개여야 함');
  assertEqual(capturedState.items[0].id, 1, '첫 번째 아이템 id는 1이어야 함');

  await act(async () => {
    button.click();
  });

  assertEqual(capturedState.items.length, 2, '아이템이 2개여야 함');
  assertEqual(capturedState.items[1].id, 2, '두 번째 아이템 id는 2여야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 5: 설계 B - 두 인스턴스 독립성
async function test05_designB_twoInstances() {
  printTestHeader('테스트 5: 설계 B - 두 인스턴스 독립성');

  resetTestResults();
  resetRenderLog();

  const container1 = document.createElement('div');
  const root1 = createRoot(container1);
  let state1 = null;

  await act(async () => {
    root1.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: ({ state }) => {
          state1 = state;
        },
      })
    );
  });

  const button1 = container1.querySelector('button');
  await act(async () => {
    button1.click();
  });

  const firstId = state1.items[0].id;

  const container2 = document.createElement('div');
  const root2 = createRoot(container2);
  let state2 = null;

  await act(async () => {
    root2.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: ({ state }) => {
          state2 = state;
        },
      })
    );
  });

  const button2 = container2.querySelector('button');
  await act(async () => {
    button2.click();
  });

  const secondId = state2.items[0].id;
  assertEqual(firstId, 1, '첫 번째 인스턴스의 id는 1이어야 함');
  assertEqual(secondId, 1, '두 번째 인스턴스의 id도 1이어야 함 (독립적)');

  await act(async () => {
    root1.unmount();
    root2.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 6: 설계 C - 순수 reducer + effect 로그
async function test06_designC_effectLog() {
  printTestHeader('테스트 6: 설계 C - 순수 reducer + effect 로그');

  resetTestResults();
  resetEffectLog();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedState = null;

  await act(async () => {
    root.render(
      createElement(DesignCPureWithEffect, {
        strictMode: false,
        onRender: ({ state }) => {
          capturedState = state;
        },
      })
    );
  });

  const button = container.querySelector('button');
  await act(async () => {
    button.click();
  });

  const log = getEffectLog();
  assertEqual(log.length, 1, 'effect 로그가 1개여야 함');
  assertEqual(log[0], 'effect: add id=1', 'effect 로그가 올바르게 기록되어야 함');
  assertEqual(capturedState.items.length, 1, '아이템이 1개여야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 7: 설계 C - 두 인스턴스 로그 공유 문제
async function test07_designC_logSharing() {
  printTestHeader('테스트 7: 설계 C - 두 인스턴스 로그 공유 문제');

  resetTestResults();
  resetEffectLog();

  const container1 = document.createElement('div');
  const root1 = createRoot(container1);

  await act(async () => {
    root1.render(
      createElement(DesignCPureWithEffect, {
        strictMode: false,
        onRender: () => {},
      })
    );
  });

  const button1 = container1.querySelector('button');
  await act(async () => {
    button1.click();
  });

  const logAfterFirst = getEffectLog().length;

  const container2 = document.createElement('div');
  const root2 = createRoot(container2);

  await act(async () => {
    root2.render(
      createElement(DesignCPureWithEffect, {
        strictMode: false,
        onRender: () => {},
      })
    );
  });

  const button2 = container2.querySelector('button');
  await act(async () => {
    button2.click();
  });

  const logAfterSecond = getEffectLog().length;
  assertGreaterThan(logAfterSecond, logAfterFirst, '두 번째 인스턴스도 같은 로그에 추가됨');

  await act(async () => {
    root1.unmount();
    root2.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 8: reducer 호출 횟수
async function test08_callCount() {
  printTestHeader('테스트 8: reducer 호출 횟수');

  resetTestResults();

  const counter = createReducerCallCounter();
  counter.reset();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(CounterWithCallTracking, {
        strictMode: false,
        counter,
        onRender: ({ dispatch }) => {
          capturedDispatch = dispatch;
        },
      })
    );
  });

  assertEqual(counter.getCallCount(), 1, 'init이 1번 호출되어야 함');

  counter.reset();

  await act(async () => {
    capturedDispatch({ type: 'increment' });
  });

  assertEqual(counter.getCallCount(), 1, 'dispatch 1회에 reducer가 1번 호출되어야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 9: StrictMode에서 reducer 호출 횟수 (React 19)
async function test09_callCount_strictMode() {
  printTestHeader('테스트 9: StrictMode에서 reducer 호출 횟수 (React 19)');

  resetTestResults();

  const counter = createReducerCallCounter();
  counter.reset();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(CounterWithCallTracking, {
        strictMode: true,
        counter,
        onRender: ({ dispatch }) => {
          capturedDispatch = dispatch;
        },
      })
    );
  });

  assertEqual(counter.getCallCount(), 1, 'React 19에서는 StrictMode에서도 init이 1번 호출됨');

  counter.reset();

  await act(async () => {
    capturedDispatch({ type: 'increment' });
  });

  assertEqual(counter.getCallCount(), 1, 'React 19에서는 StrictMode에서도 reducer가 1번 호출됨');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 10: 연속 dispatch 2회
async function test10_consecutiveDispatches() {
  printTestHeader('테스트 10: 연속 dispatch 2회');

  resetTestResults();

  const counter = createReducerCallCounter();
  counter.reset();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(CounterWithCallTracking, {
        strictMode: false,
        counter,
        onRender: ({ dispatch }) => {
          capturedDispatch = dispatch;
        },
      })
    );
  });

  counter.reset();

  await act(async () => {
    capturedDispatch({ type: 'increment' });
    capturedDispatch({ type: 'increment' });
  });

  assertEqual(counter.getCallCount(), 2, '연속 dispatch 2회에 reducer가 2번 호출되어야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 11: bail-out (같은 state 반환)
async function test11_bailOut() {
  printTestHeader('테스트 11: bail-out (같은 state 반환)');

  resetTestResults();

  const bailOut = createBailOutReducer();
  bailOut.reset();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedDispatch = null;
  let capturedRenderCount = 0;

  await act(async () => {
    root.render(
      createElement(BailOutComponent, {
        strictMode: false,
        bailOut,
        onRender: ({ dispatch, renderCount }) => {
          capturedDispatch = dispatch;
          capturedRenderCount = renderCount;
        },
      })
    );
  });

  const initialRenderCount = capturedRenderCount;
  bailOut.reset();

  await act(async () => {
    capturedDispatch({ type: 'noop' });
  });

  assertEqual(bailOut.getCallCount(), 1, 'noop dispatch에서 reducer가 1번 호출되어야 함');
  assertEqual(capturedRenderCount, initialRenderCount, 'bail-out 시 재렌더링이 없어야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 12: reducer에서 예외 발생
async function test12_throwingReducer() {
  printTestHeader('테스트 12: reducer에서 예외 발생');

  resetTestResults();

  const throwing = createThrowingReducer();
  throwing.reset();

  const container = document.createElement('div');
  const root = createRoot(container);
  let caughtError = null;
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(ErrorBoundary, {
        onError: (error) => {
          caughtError = error;
        },
        children: createElement(ThrowingComponent, {
          strictMode: false,
          throwing,
          onRender: ({ dispatch }) => {
            capturedDispatch = dispatch;
          },
        }),
      })
    );
  });

  throwing.reset();

  await act(async () => {
    capturedDispatch({ type: 'throw' });
  });

  assert(caughtError !== null, 'Error Boundary가 예외를 잡아야 함');
  assertEqual(caughtError.message, 'Reducer error', '예외 메시지가 올바르게 전달되어야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 13: 설계 A와 B 비교
async function test13_compareDesignAandB() {
  printTestHeader('테스트 13: 설계 A와 B 비교');

  resetTestResults();
  resetModuleState();

  const containerA1 = document.createElement('div');
  const rootA1 = createRoot(containerA1);
  let dispatchA1 = null;

  await act(async () => {
    rootA1.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ dispatch }) => {
          dispatchA1 = dispatch;
        },
      })
    );
  });

  resetModuleState();

  await act(async () => {
    dispatchA1({ type: 'add', text: 'item' });
  });

  const containerA2 = document.createElement('div');
  const rootA2 = createRoot(containerA2);
  let stateA2 = null;
  let dispatchA2 = null;

  await act(async () => {
    rootA2.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ state, dispatch }) => {
          stateA2 = state;
          dispatchA2 = dispatch;
        },
      })
    );
  });

  await act(async () => {
    dispatchA2({ type: 'add', text: 'item' });
  });

  const idA = stateA2.items[0].id;

  await act(async () => {
    rootA1.unmount();
    rootA2.unmount();
  });

  const containerB1 = document.createElement('div');
  const rootB1 = createRoot(containerB1);

  await act(async () => {
    rootB1.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: () => {},
      })
    );
  });

  const buttonB1 = containerB1.querySelector('button');
  await act(async () => {
    buttonB1.click();
  });

  const containerB2 = document.createElement('div');
  const rootB2 = createRoot(containerB2);
  let stateB2 = null;

  await act(async () => {
    rootB2.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: ({ state }) => {
          stateB2 = state;
        },
      })
    );
  });

  const buttonB2 = containerB2.querySelector('button');
  await act(async () => {
    buttonB2.click();
  });

  const idB = stateB2.items[0].id;

  assertGreaterThan(idA, 1, '불순한 reducer는 모듈 상태를 공유하여 id가 1보다 큼');
  assertEqual(idB, 1, '순수 reducer는 각 인스턴스가 독립적이어서 id가 1');

  await act(async () => {
    rootB1.unmount();
    rootB2.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 14: 설계 A - 모듈 로그 누적
async function test14_designA_logAccumulation() {
  printTestHeader('테스트 14: 설계 A - 모듈 로그 누적');

  resetTestResults();
  resetModuleState();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ dispatch }) => {
          capturedDispatch = dispatch;
        },
      })
    );
  });

  resetModuleState();

  await act(async () => {
    capturedDispatch({ type: 'add', text: 'item' });
  });

  const log = getModuleLog();
  assertEqual(log.length, 1, '로그가 1개여야 함');

  await act(async () => {
    capturedDispatch({ type: 'add', text: 'item' });
  });

  const log2 = getModuleLog();
  assertEqual(log2.length, 2, '로그가 누적되어 2개여야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 15: 설계 B - 연속 추가 후 id 순서 확인
async function test15_designB_sequentialIds() {
  printTestHeader('테스트 15: 설계 B - 연속 추가 후 id 순서 확인');

  resetTestResults();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedState = null;

  await act(async () => {
    root.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: ({ state }) => {
          capturedState = state;
        },
      })
    );
  });

  const button = container.querySelector('button');
  await act(async () => {
    button.click();
  });
  await act(async () => {
    button.click();
  });
  await act(async () => {
    button.click();
  });

  assertEqual(capturedState.items.length, 3, '아이템이 3개여야 함');
  assertDeepEqual(
    capturedState.items.map(item => item.id),
    [1, 2, 3],
    'id가 순차적이어야 함'
  );

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 16: 설계 A - clear 후 추가 시 id 연속성
async function test16_designA_clearAndAdd() {
  printTestHeader('테스트 16: 설계 A - clear 후 추가 시 id 연속성');

  resetTestResults();
  resetModuleState();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedState = null;
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ state, dispatch }) => {
          capturedState = state;
          capturedDispatch = dispatch;
        },
      })
    );
  });

  resetModuleState();

  await act(async () => {
    capturedDispatch({ type: 'add', text: 'first' });
  });

  const firstId = capturedState.items[0].id;

  await act(async () => {
    capturedDispatch({ type: 'clear' });
  });

  assertEqual(capturedState.items.length, 0, 'clear 후 아이템이 없어야 함');

  await act(async () => {
    capturedDispatch({ type: 'add', text: 'second' });
  });

  const secondId = capturedState.items[0].id;
  assertGreaterThan(secondId, firstId, 'clear 후에도 모듈 카운터는 증가해야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 17: 설계 B - clear 후 추가 시 id 계속 증가
async function test17_designB_clearAndAdd() {
  printTestHeader('테스트 17: 설계 B - clear 후 추가 시 id 계속 증가');

  resetTestResults();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedState = null;

  await act(async () => {
    root.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: ({ state }) => {
          capturedState = state;
        },
      })
    );
  });

  const addButton = container.querySelector('button:first-child');
  const clearButton = container.querySelector('button:nth-child(2)');

  await act(async () => {
    addButton.click();
  });

  const firstId = capturedState.items[0].id;

  await act(async () => {
    clearButton.click();
  });

  await act(async () => {
    addButton.click();
  });

  const secondId = capturedState.items[0].id;
  assertGreaterThan(secondId, firstId, 'clear 후에도 nextId는 계속 증가해야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 18: 설계 C - clear 액션의 effect 로그
async function test18_designC_clearAction() {
  printTestHeader('테스트 18: 설계 C - clear 액션의 effect 로그');

  resetTestResults();
  resetEffectLog();

  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(DesignCPureWithEffect, {
        strictMode: false,
        onRender: () => {},
      })
    );
  });

  const addButton = container.querySelector('button:first-child');
  const clearButton = container.querySelector('button:nth-child(2)');

  await act(async () => {
    addButton.click();
  });

  resetEffectLog();

  await act(async () => {
    clearButton.click();
  });

  const log = getEffectLog();
  assertEqual(log.length, 1, 'clear 액션의 effect가 1번 실행되어야 함');
  assertEqual(log[0], 'effect: clear', 'clear effect 로그가 기록되어야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 19: 연속 3회 dispatch
async function test19_tripleDispatch() {
  printTestHeader('테스트 19: 연속 3회 dispatch');

  resetTestResults();

  const counter = createReducerCallCounter();
  counter.reset();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedDispatch = null;

  await act(async () => {
    root.render(
      createElement(CounterWithCallTracking, {
        strictMode: false,
        counter,
        onRender: ({ dispatch }) => {
          capturedDispatch = dispatch;
        },
      })
    );
  });

  counter.reset();

  await act(async () => {
    capturedDispatch({ type: 'increment' });
    capturedDispatch({ type: 'increment' });
    capturedDispatch({ type: 'increment' });
  });

  assertEqual(counter.getCallCount(), 3, '연속 dispatch 3회에 reducer가 3번 호출되어야 함');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 20: 설계 A - 테스트 간 간섭 (모듈 상태 초기화 없이)
async function test20_designA_testInterference() {
  printTestHeader('테스트 20: 설계 A - 테스트 간 간섭');

  resetTestResults();
  resetModuleState();

  const container1 = document.createElement('div');
  const root1 = createRoot(container1);
  let dispatch1 = null;

  await act(async () => {
    root1.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ dispatch }) => {
          dispatch1 = dispatch;
        },
      })
    );
  });

  resetModuleState();

  await act(async () => {
    dispatch1({ type: 'add', text: 'item' });
  });

  const counter1 = getModuleIdCounter();

  await act(async () => {
    root1.unmount();
  });

  const container2 = document.createElement('div');
  const root2 = createRoot(container2);
  let state2 = null;
  let dispatch2 = null;

  await act(async () => {
    root2.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ state, dispatch }) => {
          state2 = state;
          dispatch2 = dispatch;
        },
      })
    );
  });

  await act(async () => {
    dispatch2({ type: 'add', text: 'item' });
  });

  const id2 = state2.items[0].id;
  assertGreaterThan(id2, counter1, '이전 테스트의 모듈 상태가 남아 있으면 id가 더 큼');

  await act(async () => {
    root2.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 21: 설계 B - 테스트 간 독립성
async function test21_designB_testIndependence() {
  printTestHeader('테스트 21: 설계 B - 테스트 간 독립성');

  resetTestResults();

  const container1 = document.createElement('div');
  const root1 = createRoot(container1);

  await act(async () => {
    root1.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: () => {},
      })
    );
  });

  const button1 = container1.querySelector('button');
  await act(async () => {
    button1.click();
    button1.click();
    button1.click();
  });

  await act(async () => {
    root1.unmount();
  });

  const container2 = document.createElement('div');
  const root2 = createRoot(container2);
  let state2 = null;

  await act(async () => {
    root2.render(
      createElement(DesignBPureWithEventId, {
        strictMode: false,
        onRender: ({ state }) => {
          state2 = state;
        },
      })
    );
  });

  const button2 = container2.querySelector('button');
  await act(async () => {
    button2.click();
  });

  assertEqual(state2.items[0].id, 1, '이전 테스트와 무관하게 id는 1부터 시작');

  await act(async () => {
    root2.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 22: bail-out 후 update
async function test22_bailOut_thenUpdate() {
  printTestHeader('테스트 22: bail-out 후 update');

  resetTestResults();

  const bailOut = createBailOutReducer();
  bailOut.reset();

  const container = document.createElement('div');
  const root = createRoot(container);
  let capturedState = null;
  let capturedDispatch = null;
  let capturedRenderCount = 0;

  await act(async () => {
    root.render(
      createElement(BailOutComponent, {
        strictMode: false,
        bailOut,
        onRender: ({ state, dispatch, renderCount }) => {
          capturedState = state;
          capturedDispatch = dispatch;
          capturedRenderCount = renderCount;
        },
      })
    );
  });

  const initialRenderCount = capturedRenderCount;

  await act(async () => {
    capturedDispatch({ type: 'noop' });
  });

  assertEqual(capturedRenderCount, initialRenderCount, 'bail-out 시 재렌더링 없음');

  bailOut.reset();

  await act(async () => {
    capturedDispatch({ type: 'update', value: 1 });
  });

  assertEqual(bailOut.getCallCount(), 1, 'update dispatch에서 reducer 호출');
  assertGreaterThan(capturedRenderCount, initialRenderCount, 'update 시 재렌더링 발생');
  assertEqual(capturedState.value, 1, 'value가 업데이트됨');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 23: 설계 A - 모듈 상태 초기화 중요성
async function test23_designA_resetImportance() {
  printTestHeader('테스트 23: 설계 A - 모듈 상태 초기화 중요성');

  resetTestResults();

  const container = document.createElement('div');
  const root = createRoot(container);
  let state = null;
  let dispatch = null;

  await act(async () => {
    root.render(
      createElement(DesignAImpure, {
        strictMode: false,
        onRender: ({ state: s, dispatch: d }) => {
          state = s;
          dispatch = d;
        },
      })
    );
  });

  const counterBefore = getModuleIdCounter();

  await act(async () => {
    dispatch({ type: 'add', text: 'item' });
  });

  const id1 = state.items[0].id;
  assertGreaterThan(id1, counterBefore, 'id는 현재 모듈 카운터보다 큼');

  resetModuleState();

  await act(async () => {
    dispatch({ type: 'add', text: 'item' });
  });

  const id2 = state.items[1].id;
  assertEqual(id2, 1, '모듈 상태를 초기화하면 id가 1부터 시작');
  assertLessThan(id2, id1, '초기화 후 id가 이전보다 작음');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

// 테스트 24: 설계 C - effect 로그 누적
async function test24_designC_logAccumulation() {
  printTestHeader('테스트 24: 설계 C - effect 로그 누적');

  resetTestResults();
  resetEffectLog();

  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(DesignCPureWithEffect, {
        strictMode: false,
        onRender: () => {},
      })
    );
  });

  const button = container.querySelector('button');
  
  await act(async () => {
    button.click();
  });

  assertEqual(getEffectLog().length, 1, 'effect 로그 1개');

  await act(async () => {
    button.click();
  });

  assertEqual(getEffectLog().length, 2, 'effect 로그가 누적되어 2개');

  await act(async () => {
    button.click();
  });

  assertEqual(getEffectLog().length, 3, 'effect 로그가 누적되어 3개');

  await act(async () => {
    root.unmount();
  });

  const { failedTests } = getTestResults();
  if (failedTests > 0) process.exitCode = 1;
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   React useReducer 순수성과 모듈 상태 공유 테스트        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  await test01_designA_singleInstance();
  await test02_designA_twoInstances();
  await test03_designA_consecutiveDispatches();
  await test04_designB_singleInstance();
  await test05_designB_twoInstances();
  await test06_designC_effectLog();
  await test07_designC_logSharing();
  await test08_callCount();
  await test09_callCount_strictMode();
  await test10_consecutiveDispatches();
  await test11_bailOut();
  await test12_throwingReducer();
  await test13_compareDesignAandB();
  await test14_designA_logAccumulation();
  await test15_designB_sequentialIds();
  await test16_designA_clearAndAdd();
  await test17_designB_clearAndAdd();
  await test18_designC_clearAction();
  await test19_tripleDispatch();
  await test20_designA_testInterference();
  await test21_designB_testIndependence();
  await test22_bailOut_thenUpdate();
  await test23_designA_resetImportance();
  await test24_designC_logAccumulation();

  console.log('\n' + '='.repeat(60));
  console.log('테스트 완료');
  console.log('='.repeat(60));

  if (process.exitCode === 1) {
    console.log('\n일부 테스트가 실패했습니다.');
  } else {
    console.log('\nALL_CHECKS_PASSED');
  }
}

runAllTests().catch(err => {
  console.error('테스트 실행 중 오류:', err);
  process.exitCode = 1;
});
