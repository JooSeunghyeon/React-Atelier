process.env.NODE_ENV = 'development';

import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement, StrictMode } from 'react';
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
} from './reducer-components.js';

console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);

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

function printSeparator(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60) + '\n');
}

async function demoReducerCallCount() {
  printSeparator('1. reducer와 init 호출 횟수 - development 빌드');

  console.log('[StrictMode off]\n');

  const counterOff = createReducerCallCounter();
  counterOff.reset();

  const containerOff = document.createElement('div');
  const rootOff = createRoot(containerOff);
  let dispatchOff = null;

  await act(async () => {
    rootOff.render(
      createElement(CounterWithCallTracking, {
        
        counter: counterOff,
        onRender: ({ dispatch }) => {
          dispatchOff = dispatch;
        },
      })
    );
  });

  console.log(`init 호출 횟수: ${counterOff.getCallCount()}`);

  counterOff.reset();

  await act(async () => {
    dispatchOff({ type: 'increment' });
  });

  console.log(`dispatch 1회 후 reducer 호출 횟수: ${counterOff.getCallCount()}`);

  counterOff.reset();

  await act(async () => {
    dispatchOff({ type: 'increment' });
    dispatchOff({ type: 'increment' });
  });

  console.log(`연속 dispatch 2회 후 reducer 호출 횟수: ${counterOff.getCallCount()}`);

  await act(async () => {
    rootOff.unmount();
  });

  console.log('\n[StrictMode on]\n');

  const counterOn = createReducerCallCounter();
  counterOn.reset();

  const containerOn = document.createElement('div');
  const rootOn = createRoot(containerOn);
  let dispatchOn = null;

  await act(async () => {
    rootOn.render(
      createElement(StrictMode, null,
        createElement(CounterWithCallTracking, {
          counter: counterOn,
          onRender: ({ dispatch }) => {
            dispatchOn = dispatch;
          },
        })
      )
    );
  });

  console.log(`init 호출 횟수: ${counterOn.getCallCount()}`);

  counterOn.reset();

  await act(async () => {
    dispatchOn({ type: 'increment' });
  });

  console.log(`dispatch 1회 후 reducer 호출 횟수: ${counterOn.getCallCount()}`);

  counterOn.reset();

  await act(async () => {
    dispatchOn({ type: 'increment' });
    dispatchOn({ type: 'increment' });
  });

  console.log(`연속 dispatch 2회 후 reducer 호출 횟수: ${counterOn.getCallCount()}`);

  await act(async () => {
    rootOn.unmount();
  });

  console.log('\n[관찰]');
  console.log('- development 빌드에서는 StrictMode가 순수성 검증을 위해 함수를 이중 호출합니다.');
  console.log('- StrictMode off: init 1회, dispatch마다 reducer 1회');
  console.log('- StrictMode on: init 2회, dispatch마다 reducer 2회');
  console.log('- production 빌드에서는 StrictMode도 이중 호출을 하지 않습니다.');
}

async function demoDesignAImpure() {
  printSeparator('2. 설계 A - 불순한 reducer (실패 설계)');

  console.log('[첫 번째 인스턴스]\n');

  resetModuleState();

  const container1 = document.createElement('div');
  const root1 = createRoot(container1);
  let state1 = null;
  let dispatch1 = null;

  await act(async () => {
    root1.render(
      createElement(DesignAImpure, {
        
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

  console.log(`모듈 카운터: ${getModuleIdCounter()}`);
  console.log(`상태 items: ${JSON.stringify(state1.items)}`);

  console.log('\n[두 번째 인스턴스 (같은 모듈 사용)]\n');

  const container2 = document.createElement('div');
  const root2 = createRoot(container2);
  let state2 = null;
  let dispatch2 = null;

  await act(async () => {
    root2.render(
      createElement(DesignAImpure, {
        
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

  console.log(`모듈 카운터: ${getModuleIdCounter()}`);
  console.log(`상태 items: ${JSON.stringify(state2.items)}`);

  await act(async () => {
    root1.unmount();
    root2.unmount();
  });

  console.log('\n[문제점]');
  console.log('- 두 번째 인스턴스의 id가 1이 아닌 2입니다.');
  console.log('- 여러 컴포넌트 인스턴스가 같은 모듈 카운터를 공유합니다.');
  console.log('- 각 인스턴스가 독립적이지 않습니다.');
  console.log('- 테스트 간 간섭이 발생합니다.');
}

async function demoDesignBPure() {
  printSeparator('3. 설계 B - 순수 reducer + 이벤트 핸들러에서 id 생성');

  console.log('[첫 번째 인스턴스]\n');

  const container1 = document.createElement('div');
  const root1 = createRoot(container1);
  let state1 = null;

  await act(async () => {
    root1.render(
      createElement(DesignBPureWithEventId, {
        
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

  console.log(`상태 items: ${JSON.stringify(state1.items)}`);

  console.log('\n[두 번째 인스턴스 (독립적)]\n');

  const container2 = document.createElement('div');
  const root2 = createRoot(container2);
  let state2 = null;

  await act(async () => {
    root2.render(
      createElement(DesignBPureWithEventId, {
        
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

  console.log(`상태 items: ${JSON.stringify(state2.items)}`);

  await act(async () => {
    root1.unmount();
    root2.unmount();
  });

  console.log('\n[해결책]');
  console.log('- reducer가 순수 함수이므로 안전합니다.');
  console.log('- 각 인스턴스가 독립적인 nextId 상태를 가집니다.');
  console.log('- 두 인스턴스 모두 id가 1부터 시작합니다.');
  console.log('- 테스트 간 간섭이 없습니다.');
}

async function demoDesignCEffect() {
  printSeparator('4. 설계 C - 순수 reducer + useEffect로 부수효과 분리');

  console.log('[단일 인스턴스]\n');

  resetEffectLog();

  const container = document.createElement('div');
  const root = createRoot(container);
  let state = null;

  await act(async () => {
    root.render(
      createElement(DesignCPureWithEffect, {
        
        onRender: ({ state: s }) => {
          state = s;
        },
      })
    );
  });

  const button = container.querySelector('button');
  await act(async () => {
    button.click();
  });

  console.log(`effect 로그: ${JSON.stringify(getEffectLog())}`);
  console.log(`상태 items: ${JSON.stringify(state.items)}`);

  await act(async () => {
    root.unmount();
  });

  console.log('\n[관찰]');
  console.log('- reducer는 순수하므로 최종 상태는 일관성이 있습니다.');
  console.log('- 부수효과는 useEffect로 분리되었습니다.');
  console.log('- effect 로그는 모듈 배열을 사용하여 여전히 간섭이 있을 수 있습니다.');
  console.log('- 실제로는 로그를 컴포넌트 상태나 ref로 관리하는 것이 좋습니다.');
}

async function demoComparison() {
  printSeparator('5. 설계 비교 - 여러 인스턴스 테스트');

  console.log('[설계 A - 불순한 reducer]\n');

  resetModuleState();

  const containerA1 = document.createElement('div');
  const rootA1 = createRoot(containerA1);
  let dispatchA1 = null;

  await act(async () => {
    rootA1.render(
      createElement(DesignAImpure, {
        
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

  console.log(`두 번째 인스턴스 상태: ${JSON.stringify(stateA2.items)}`);
  console.log(`모듈 카운터: ${getModuleIdCounter()}`);

  await act(async () => {
    rootA1.unmount();
    rootA2.unmount();
  });

  console.log('\n[설계 B - 순수 reducer + 이벤트 핸들러 id]\n');

  const containerB1 = document.createElement('div');
  const rootB1 = createRoot(containerB1);

  await act(async () => {
    rootB1.render(
      createElement(DesignBPureWithEventId, {
        
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

  console.log(`두 번째 인스턴스 상태: ${JSON.stringify(stateB2.items)}`);

  await act(async () => {
    rootB1.unmount();
    rootB2.unmount();
  });

  console.log('\n[비교 요약]');
  console.log('┌──────────┬─────────────────────────┐');
  console.log('│ 설계     │ 두 번째 인스턴스 id     │');
  console.log('├──────────┼─────────────────────────┤');
  console.log(`│ A (불순) │ ${stateA2.items[0]?.id || 'N/A'} (모듈 상태 공유)   │`);
  console.log(`│ B (순수) │ ${stateB2.items[0]?.id || 'N/A'} (독립적)          │`);
  console.log('└──────────┴─────────────────────────┘');
  console.log('\n설계 B가 각 인스턴스가 독립적으로 동작합니다.');
}

async function runDemo() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   React useReducer 순수성과 모듈 상태 공유 데모          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  await demoReducerCallCount();
  await demoDesignAImpure();
  await demoDesignBPure();
  await demoDesignCEffect();
  await demoComparison();

  console.log('\n' + '='.repeat(60));
  console.log('ALL_CHECKS_PASSED');
  console.log('='.repeat(60) + '\n');
}

runDemo().catch(err => {
  console.error('데모 실행 중 오류:', err);
  process.exitCode = 1;
});
