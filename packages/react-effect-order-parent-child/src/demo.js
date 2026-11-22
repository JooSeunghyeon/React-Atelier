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

function printSeparator(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60) + '\n');
}

async function demoMountOrder() {
  printSeparator('1. 마운트 순서: useLayoutEffect와 useEffect');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createMountOrderTest(logger);

  console.log('[실행] Parent 컴포넌트를 마운트합니다.');
  console.log('[구조] Parent → Child1 → GrandChild1');
  console.log('           → Child2\n');

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('[결과] Effect 실행 순서:');
  log.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry}`);
  });

  console.log('\n[관찰]');
  console.log('  - useLayoutEffect setup은 자식이 부모보다 먼저 실행됩니다.');
  console.log('  - useEffect setup은 자식이 부모보다 먼저 실행됩니다.');
  console.log('  - 모든 useLayoutEffect setup이 모든 useEffect setup보다 먼저 실행됩니다.');

  await act(async () => {
    root.unmount();
  });
}

async function demoNaiveFailure() {
  printSeparator('2. 실패 재현: 부모 useEffect에서 준비, 자식 useEffect에서 사용');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const registryHolder = {};
  const Parent = createNaiveFailureTest(logger, registryHolder);

  console.log('[문제 상황]');
  console.log('  부모가 useEffect에서 registry 객체를 ref에 만듭니다.');
  console.log('  자식이 useEffect에서 그 registry를 사용하려고 합니다.\n');

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('[결과] 실행 순서:');
  log.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry}`);
  });

  console.log('\n[관찰]');
  console.log('  - 자식 useEffect가 부모 useEffect보다 먼저 실행됩니다.');
  console.log('  - 자식 시점에 registry가 아직 null이어서 등록이 실패합니다.');
  console.log(`  - 마운트 후에도 registry.items는 비어 있습니다: ${JSON.stringify(registryHolder.registry.items)}`);
  console.log('  - 이 설계는 effect 실행 순서에 의존하므로 작동하지 않습니다.');

  await act(async () => {
    root.unmount();
  });
}

async function demoDesignA() {
  printSeparator('3. 설계 A: 부모 useLayoutEffect로 준비');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const registryHolder = {};
  const Parent = createDesignATest(logger, registryHolder);

  console.log('[해결 시도]');
  console.log('  부모가 useLayoutEffect에서 registry를 만듭니다.');
  console.log('  자식 중 하나는 useLayoutEffect, 다른 하나는 useEffect에서 사용합니다.\n');

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('[결과] 실행 순서:');
  log.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry}`);
  });

  console.log('\n[관찰]');
  console.log('  - 자식 useLayoutEffect는 부모 useLayoutEffect보다 먼저 실행되어 여전히 null입니다.');
  console.log('  - 자식 useEffect는 부모 useLayoutEffect보다 나중이므로 registry를 사용할 수 있습니다.');
  console.log(`  - 마운트 후 items: ${JSON.stringify(registryHolder.registry.items)}`);
  console.log('  - 이 설계는 자식이 useEffect만 쓰면 보장되지만, useLayoutEffect는 보장되지 않습니다.');

  await act(async () => {
    root.unmount();
  });
}

async function demoDesignB() {
  printSeparator('4. 설계 B: 렌더 중 지연 초기화와 Context');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createDesignBTest(logger);

  console.log('[해결책]');
  console.log('  부모가 useState 초기화 함수에서 registry를 만듭니다.');
  console.log('  Context로 자식에게 전달합니다.');
  console.log('  자식은 useLayoutEffect와 useEffect 모두에서 사용할 수 있습니다.\n');

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('[결과] 실행 순서:');
  log.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry}`);
  });

  console.log('\n[관찰]');
  console.log('  - registry가 렌더 중에 생성되어 모든 effect에서 사용 가능합니다.');
  console.log('  - 자식 useLayoutEffect와 useEffect 모두 registry에 접근할 수 있습니다.');
  console.log('  - 언마운트 시 부모 useEffect cleanup에서 정리됩니다.');

  logger.clearLog();

  await act(async () => {
    root.unmount();
  });

  const unmountLog = logger.getLog();
  console.log('\n[언마운트 시 정리]:');
  unmountLog.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry}`);
  });

  console.log('\n[언마운트 경계]');
  console.log('  - 부모 useEffect cleanup (dispose)이 먼저 실행됩니다.');
  console.log('  - 그 뒤 자식 useEffect cleanup (unregister)이 실행됩니다.');
  console.log('  - dispose 후 unregister는 no-op으로 처리됩니다 (disposed 플래그).');
}

async function demoDesignC() {
  printSeparator('5. 설계 C: 자식이 effect에서 등록하고 부모가 처리');

  const container = document.createElement('div');
  const root = createRoot(container);
  const logger = createLog();
  const Parent = createDesignCTest(logger);

  console.log('[해결책]');
  console.log('  부모가 렌더 중에 안정적인 register/unregister 함수를 만듭니다.');
  console.log('  자식은 useEffect setup에서 register, cleanup에서 unregister합니다.');
  console.log('  부모는 useEffect에서 모인 등록을 일괄 처리합니다.');
  console.log('  (자식 effect가 부모 effect보다 먼저 도는 순서를 이용합니다)\n');

  await act(async () => {
    root.render(createElement(Parent));
  });

  const log = logger.getLog();
  console.log('[결과] 실행 순서:');
  log.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry}`);
  });

  console.log('\n[관찰]');
  console.log('  - 자식들이 effect에서 등록합니다.');
  console.log('  - 부모 useEffect 시점에는 모든 자식의 등록이 모여 있습니다.');
  console.log('  - 렌더 중 부수 효과를 피하고 effect 기반 등록으로 안정적입니다.');

  await act(async () => {
    root.unmount();
  });
}

async function runDemo() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   React Effect 실행 순서와 설계 패턴 데모                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  await demoMountOrder();
  await demoNaiveFailure();
  await demoDesignA();
  await demoDesignB();
  await demoDesignC();

  console.log('\n' + '='.repeat(60));
  console.log('데모 완료');
  console.log('='.repeat(60) + '\n');
}

runDemo().catch(err => {
  console.error('데모 실행 중 오류:', err);
  process.exitCode = 1;
});
