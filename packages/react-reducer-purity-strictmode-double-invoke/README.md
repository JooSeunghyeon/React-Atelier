# React useReducer 순수성과 StrictMode 이중 호출

useReducer의 reducer와 초기화 함수는 렌더 중에 호출되는 순수 함수여야 합니다. 이 패키지는 모듈 변수 카운터로 id를 만들거나 외부 로그에 push하는 불순한 reducer가 development 빌드의 StrictMode 이중 호출에서 어떤 문제를 일으키는지 보여주고, 세 가지 설계를 비교합니다.

## 질문

reducer에서 모듈 변수를 증가시키거나 외부 배열에 push하면 어떤 일이 벌어질까요? StrictMode 이중 호출에서는 어떻게 드러날까요?

## 확인한 내용

jsdom 환경에서 React 19 (react 19.3.1, react-dom 19.3.1, Node.js v22.23.4)로 실행한 결과입니다.

### React 19 development 빌드에서 StrictMode 동작

**중요:** React 19의 development 빌드에서는 StrictMode가 순수성 검증을 위해 reducer와 init 함수를 여전히 이중 호출합니다.

| 빌드 | StrictMode | init 함수 | dispatch 1회당 reducer | effect setup |
|------|-----------|-----------|----------------------|--------------|
| development | off | 1회 | 1회 | 1회 |
| development | on | **2회** | **2회** | **2회** |
| production | off | 1회 | 1회 | 1회 |
| production | on | 1회 | 1회 | 1회 |

development 빌드에서는 StrictMode가 순수하지 않은 함수를 감지하기 위해 함수를 이중 호출합니다. production 빌드에서는 성능을 위해 이중 호출을 하지 않습니다.

**process.env.NODE_ENV가 설정되지 않으면 React는 production 빌드를 로드합니다.** 이 패키지의 모든 스크립트는 development 빌드를 명시적으로 사용합니다.

### reducer 호출 횟수 (development 빌드, StrictMode off)

| 상황 | 호출 횟수 |
|------|-----------|
| init 함수 (컴포넌트 마운트 시) | 1회 |
| dispatch 1회 | reducer 1회 |
| 연속 dispatch 2회 | reducer 2회 |

### bail-out (같은 state 반환)

reducer가 같은 state 객체를 반환하면 React는 재렌더링을 건너뜁니다.

| 동작 | 결과 |
|------|------|
| reducer 호출 | 1회 |
| 재렌더링 | 없음 |

### reducer에서 예외 발생

reducer에서 예외를 던지면 Error Boundary가 잡습니다. 상태는 예외 직전 값으로 유지됩니다.

## 설계 비교

세 가지 설계를 비교합니다.

### 설계 A: 불순한 reducer (실패 설계)

reducer에서 모듈 카운터를 증가시키고 외부 로그 배열에 push합니다.

```javascript
let moduleIdCounter = 0;
const moduleLog = [];

function impureReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const id = ++moduleIdCounter;
      moduleLog.push(`reducer: add id=${id}`);
      return { ...state, items: [...state.items, { id, text: action.text }] };
    }
    default:
      return state;
  }
}
```

**문제점:**

1. **StrictMode 이중 호출**: development 빌드에서 StrictMode는 reducer를 2번 호출하므로 모듈 카운터가 2씩 증가하고 로그가 중복됩니다.
2. **모듈 상태 공유**: 여러 컴포넌트 인스턴스가 같은 모듈 카운터와 로그를 공유하여 id가 엉킵니다.
3. **테스트 간 간섭**: 테스트를 순서대로 실행하면 이전 테스트의 모듈 상태가 남아 있어 결과가 달라집니다.
4. **재렌더링 시 중복**: 부모가 리렌더되어 자식이 다시 마운트되면 같은 액션으로 다른 id가 생성됩니다.
5. **예측 불가능**: 렌더가 버려지거나 중단되어도 모듈 상태는 변경되어 다음 렌더에 영향을 줍니다.

**첫 번째 컴포넌트가 1번 dispatch 후:**
- 상태 items: `[{ id: 1, text: 'first' }]`
- 모듈 카운터: 1

**두 번째 컴포넌트 (같은 모듈 사용)가 1번 dispatch 후:**
- 상태 items: `[{ id: 2, text: 'first' }]`
- 모듈 카운터: 2
- 문제: 첫 번째 컴포넌트 때문에 id가 2부터 시작합니다!

### 설계 B: 순수 reducer + 이벤트 핸들러에서 id 생성

reducer는 순수 함수이고, id는 이벤트 핸들러에서 생성하여 action에 담습니다.

```javascript
function pureReducerWithId(state, action) {
  switch (action.type) {
    case 'add':
      return { ...state, items: [...state.items, { id: action.id, text: action.text }] };
    default:
      return state;
  }
}

function Component() {
  const [state, dispatch] = useReducer(pureReducerWithId, { items: [] });
  const [nextId, setNextId] = useState(1);

  const handleAdd = () => {
    dispatch({ type: 'add', id: nextId, text: 'item' });
    setNextId(nextId + 1);
  };

  return <button onClick={handleAdd}>Add</button>;
}
```

**장점:**
- reducer가 순수 함수이므로 StrictMode 이중 호출에도 안전합니다.
- 각 컴포넌트 인스턴스가 독립적인 nextId 상태를 가집니다.
- id가 항상 순차적입니다 (1, 2, 3, ...).
- 테스트 간 간섭이 없습니다.
- development와 production 빌드에서 동일하게 동작합니다.

**첫 번째 컴포넌트:**
- 상태 items: `[{ id: 1, text: 'item' }]`

**두 번째 컴포넌트 (독립적):**
- 상태 items: `[{ id: 1, text: 'item' }]`
- 각 컴포넌트가 독립적인 id를 가집니다!

### 설계 C: 순수 reducer + useEffect로 부수효과 분리

reducer는 순수 함수이고, 부수효과 (로그)는 useEffect로 분리합니다.

```javascript
function pureReducerWithEffectLog(state, action) {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        items: [...state.items, { id: action.id, text: action.text }],
        lastAction: action,
      };
    default:
      return state;
  }
}

function Component() {
  const [state, dispatch] = useReducer(pureReducerWithEffectLog, { items: [], lastAction: null });
  const [nextId, setNextId] = useState(1);

  useEffect(() => {
    if (state.lastAction) {
      effectLog.push(`effect: add id=${state.lastAction.id}`);
    }
  }, [state.lastAction]);

  const handleAdd = () => {
    dispatch({ type: 'add', id: nextId, text: 'item' });
    setNextId(nextId + 1);
  };

  return <button onClick={handleAdd}>Add</button>;
}
```

**장점:**
- reducer는 순수하므로 StrictMode 이중 호출에도 안전합니다.
- 부수효과는 useEffect로 분리되어 렌더 중 부수효과를 피합니다.
- development와 production 빌드에서 동일하게 동작합니다.

**한계:**
- effect 로그는 여전히 모듈 배열을 사용하므로 테스트 간 간섭이 있습니다.
- 실제 애플리케이션에서는 로그를 컴포넌트 상태나 ref로 관리하는 것이 좋습니다.

## 설계 비교 요약

| 설계 | StrictMode 이중 호출 | 여러 인스턴스 | 테스트 간섭 | 순수성 | 권장 |
|------|---------------------|--------------|------------|--------|------|
| A (불순) | 문제 발생 | id 충돌 | 있음 | 불순 | ✗ |
| B (순수 + event id) | 안전 | 독립적 | 없음 | 순수 | ✓ |
| C (순수 + effect) | 안전 | 독립적 | 로그 간섭 | 순수 | △ |

**권장 사항:**
- reducer는 항상 순수 함수여야 합니다. StrictMode 이중 호출에도 안전합니다.
- id 생성은 reducer 외부 (이벤트 핸들러, useState)에서 수행합니다.
- 부수효과 (로그, API 호출 등)는 useEffect로 분리합니다.
- 설계 B가 가장 간단하고 명확합니다.
- development 빌드에서 테스트하여 StrictMode 이중 호출을 확인하세요.

## 실행 방법

```bash
# 의존성 설치
npm ci

# 테스트 실행 (24개 검증)
npm test

# 데모 실행 (주요 시나리오 로그 출력)
npm run demo
```

## 테스트 결과

3회 반복 실행 결과 모두 통과:
- 총 테스트: 24개
- 실패: 0개

테스트 9번은 development 빌드에서 StrictMode가 init을 2회, dispatch 1회당 reducer를 2회 호출하는 것을 확인합니다.

## 실행 환경

- Node.js: v22.23.4
- npm: 10.9.9
- react: 19.3.1
- react-dom: 19.3.1
- jsdom: 25.0.1
- **모든 스크립트는 development 빌드로 실행됩니다** (파일 첫 줄에서 `process.env.NODE_ENV = 'development'` 설정)

## React 19 StrictMode 동작

**React 19 development 빌드:**
- StrictMode에서 여전히 함수를 이중 호출하여 순수성을 검증합니다.
- init은 2회, dispatch마다 reducer는 2회, effect setup은 2회 실행됩니다.

**React 19 production 빌드:**
- StrictMode에서도 이중 호출을 하지 않습니다.
- 성능을 위해 함수를 1회만 호출합니다.

이 패키지는 development 빌드로 실행하여 StrictMode 이중 호출에서 불순한 reducer의 문제를 보여줍니다.

## 한계

- reducer가 순수하면 여러 번 호출되어도 문제가 없습니다. 같은 입력에 같은 출력을 보장하기 때문입니다.
- 모듈 변수 사용은 테스트와 디버깅을 어렵게 만듭니다.
- development와 production 빌드에서 호출 횟수가 다르므로, development에서 테스트하는 것이 중요합니다.

## 파일 구조

- `src/reducer-components.js`: 세 가지 설계의 컴포넌트 정의
- `src/test-helpers.js`: 테스트 헬퍼 함수 (jsdom 설정, assert 함수, ErrorBoundary)
- `src/reducer-purity.test.js`: 24개 테스트 케이스
- `src/demo.js`: 주요 시나리오의 로그 출력
- `src/check-strictmode.js`: StrictMode 동작 확인 스크립트
