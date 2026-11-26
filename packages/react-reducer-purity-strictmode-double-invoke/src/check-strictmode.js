import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement, useReducer, StrictMode, useEffect } from 'react';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;

let initCallCount = 0;
let reducerCallCount = 0;
let effectCallCount = 0;

function testInit(value) {
  initCallCount++;
  console.log(`init called: ${initCallCount}`);
  return { value };
}

function testReducer(state, action) {
  reducerCallCount++;
  console.log(`reducer called: ${reducerCallCount}`);
  if (action.type === 'increment') {
    return { value: state.value + 1 };
  }
  return state;
}

function TestComponent({ strict }) {
  const [state, dispatch] = useReducer(testReducer, 0, testInit);

  useEffect(() => {
    effectCallCount++;
    console.log(`effect called: ${effectCallCount}`);
  });

  const component = createElement(
    'div',
    null,
    createElement('button', { onClick: () => dispatch({ type: 'increment' }) }, 'Inc'),
    createElement('div', null, `Value: ${state.value}`)
  );

  return strict ? createElement(StrictMode, null, component) : component;
}

async function testStrictModeOff() {
  console.log('\n=== StrictMode OFF ===');
  initCallCount = 0;
  reducerCallCount = 0;
  effectCallCount = 0;

  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(TestComponent, { strict: false }));
  });

  console.log(`Total: init=${initCallCount}, reducer=${reducerCallCount}, effect=${effectCallCount}`);

  reducerCallCount = 0;
  const button = container.querySelector('button');
  
  await act(async () => {
    button.click();
  });

  console.log(`After dispatch: reducer=${reducerCallCount}`);

  await act(async () => {
    root.unmount();
  });
}

async function testStrictModeOn() {
  console.log('\n=== StrictMode ON ===');
  initCallCount = 0;
  reducerCallCount = 0;
  effectCallCount = 0;

  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(TestComponent, { strict: true }));
  });

  console.log(`Total: init=${initCallCount}, reducer=${reducerCallCount}, effect=${effectCallCount}`);

  reducerCallCount = 0;
  const button = container.querySelector('button');
  
  await act(async () => {
    button.click();
  });

  console.log(`After dispatch: reducer=${reducerCallCount}`);

  await act(async () => {
    root.unmount();
  });
}

async function main() {
  console.log('React StrictMode 동작 확인');
  await testStrictModeOff();
  await testStrictModeOn();
  console.log('\n완료');
}

main().catch(err => {
  console.error('Error:', err);
  process.exitCode = 1;
});
