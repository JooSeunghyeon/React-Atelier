import { useReducer, useEffect, StrictMode, useState, createElement } from 'react';

// 설계 A: 불순한 reducer (실패 설계)
let moduleIdCounter = 0;
const moduleLog = [];

export function resetModuleState() {
  moduleIdCounter = 0;
  moduleLog.length = 0;
}

export function getModuleLog() {
  return [...moduleLog];
}

export function getModuleIdCounter() {
  return moduleIdCounter;
}

function impureReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const id = ++moduleIdCounter;
      moduleLog.push(`reducer: add id=${id}`);
      return { ...state, items: [...state.items, { id, text: action.text }] };
    }
    case 'clear':
      return { ...state, items: [] };
    default:
      return state;
  }
}

function impureInit(initialItems) {
  moduleLog.push('init called');
  return { items: initialItems };
}

export function DesignAImpure({ onRender }) {
  const [state, dispatch] = useReducer(impureReducer, [], impureInit);

  useEffect(() => {
    if (onRender) {
      onRender({ state, dispatch });
    }
  });

  return createElement(
    'div',
    null,
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'add', text: 'item' }) },
      'Add'
    ),
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'clear' }) },
      'Clear'
    ),
    createElement(
      'ul',
      null,
      state.items.map(item =>
        createElement('li', { key: item.id }, `${item.text} (id: ${item.id})`)
      )
    )
  );
}

// 설계 B: 순수 reducer + 이벤트 핸들러에서 id 생성
const renderLog = [];

export function resetRenderLog() {
  renderLog.length = 0;
}

export function getRenderLog() {
  return [...renderLog];
}

function pureReducerWithId(state, action) {
  switch (action.type) {
    case 'add':
      return { ...state, items: [...state.items, { id: action.id, text: action.text }] };
    case 'clear':
      return { ...state, items: [] };
    default:
      return state;
  }
}

function pureInit(initialItems) {
  renderLog.push('init called');
  return { items: initialItems, nextId: 1 };
}

export function DesignBPureWithEventId({ onRender }) {
  const [state, dispatch] = useReducer(pureReducerWithId, [], pureInit);
  const [nextId, setNextId] = useState(1);

  useEffect(() => {
    if (onRender) {
      onRender({ state, dispatch, nextId });
    }
  });

  const handleAdd = () => {
    dispatch({ type: 'add', id: nextId, text: 'item' });
    setNextId(nextId + 1);
  };

  return createElement(
    'div',
    null,
    createElement('button', { onClick: handleAdd }, 'Add'),
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'clear' }) },
      'Clear'
    ),
    createElement(
      'ul',
      null,
      state.items.map(item =>
        createElement('li', { key: item.id }, `${item.text} (id: ${item.id})`)
      )
    )
  );
}

// 설계 C: 순수 reducer + useEffect로 부수효과 분리
const effectLog = [];

export function resetEffectLog() {
  effectLog.length = 0;
}

export function getEffectLog() {
  return [...effectLog];
}

function pureReducerWithEffectLog(state, action) {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        items: [...state.items, { id: action.id, text: action.text }],
        lastAction: action,
      };
    case 'clear':
      return { ...state, items: [], lastAction: action };
    default:
      return state;
  }
}

function pureInitWithEffectLog(initialItems) {
  return { items: initialItems, nextId: 1, lastAction: null };
}

export function DesignCPureWithEffect({ onRender }) {
  const [state, dispatch] = useReducer(pureReducerWithEffectLog, [], pureInitWithEffectLog);
  const [nextId, setNextId] = useState(1);

  useEffect(() => {
    if (state.lastAction) {
      if (state.lastAction.type === 'add') {
        effectLog.push(`effect: add id=${state.lastAction.id}`);
      } else if (state.lastAction.type === 'clear') {
        effectLog.push('effect: clear');
      }
    }
  }, [state.lastAction]);

  useEffect(() => {
    if (onRender) {
      onRender({ state, dispatch, nextId });
    }
  });

  const handleAdd = () => {
    dispatch({ type: 'add', id: nextId, text: 'item' });
    setNextId(nextId + 1);
  };

  return createElement(
    'div',
    null,
    createElement('button', { onClick: handleAdd }, 'Add'),
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'clear' }) },
      'Clear'
    ),
    createElement(
      'ul',
      null,
      state.items.map(item =>
        createElement('li', { key: item.id }, `${item.text} (id: ${item.id})`)
      )
    )
  );
}

// 테스트용 헬퍼: reducer 호출 횟수 추적
export function createReducerCallCounter() {
  let callCount = 0;

  function countingReducer(state, action) {
    callCount++;
    switch (action.type) {
      case 'increment':
        return { count: state.count + 1 };
      case 'decrement':
        return { count: state.count - 1 };
      default:
        return state;
    }
  }

  function countingInit(initialCount) {
    callCount++;
    return { count: initialCount };
  }

  return {
    reducer: countingReducer,
    init: countingInit,
    getCallCount: () => callCount,
    reset: () => { callCount = 0; },
  };
}

export function CounterWithCallTracking({ counter, onRender }) {
  const [state, dispatch] = useReducer(counter.reducer, 0, counter.init);

  useEffect(() => {
    if (onRender) {
      onRender({ state, dispatch });
    }
  });

  return createElement(
    'div',
    null,
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'increment' }) },
      '+'
    ),
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'decrement' }) },
      '-'
    ),
    createElement('div', null, `Count: ${state.count}`)
  );
}

// bail-out 테스트용: 같은 state 반환
export function createBailOutReducer() {
  let callCount = 0;

  function bailOutReducer(state, action) {
    callCount++;
    if (action.type === 'noop') {
      return state;
    }
    if (action.type === 'update') {
      return { ...state, value: action.value };
    }
    return state;
  }

  return {
    reducer: bailOutReducer,
    getCallCount: () => callCount,
    reset: () => { callCount = 0; },
  };
}

export function BailOutComponent({ bailOut, onRender }) {
  const [state, dispatch] = useReducer(bailOut.reducer, { value: 0 });
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    setRenderCount(c => c + 1);
  }, [state]);

  useEffect(() => {
    if (onRender) {
      onRender({ state, dispatch, renderCount });
    }
  }, [state, renderCount, onRender]);

  return createElement(
    'div',
    null,
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'noop' }) },
      'No-op'
    ),
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'update', value: state.value + 1 }) },
      'Update'
    ),
    createElement('div', null, `Value: ${state.value}`),
    createElement('div', null, `Renders: ${renderCount}`)
  );
}

// Error Boundary 테스트용
export function createThrowingReducer() {
  let callCount = 0;

  function throwingReducer(state, action) {
    callCount++;
    if (action.type === 'throw') {
      throw new Error('Reducer error');
    }
    if (action.type === 'increment') {
      return { count: state.count + 1 };
    }
    return state;
  }

  return {
    reducer: throwingReducer,
    getCallCount: () => callCount,
    reset: () => { callCount = 0; },
  };
}

export function ThrowingComponent({ throwing, onRender }) {
  const [state, dispatch] = useReducer(throwing.reducer, { count: 0 });

  useEffect(() => {
    if (onRender) {
      onRender({ state, dispatch });
    }
  });

  return createElement(
    'div',
    null,
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'increment' }) },
      '+'
    ),
    createElement(
      'button',
      { onClick: () => dispatch({ type: 'throw' }) },
      'Throw'
    ),
    createElement('div', null, `Count: ${state.count}`)
  );
}
