# React Effect 실행 순서와 설계 패턴

React에서 부모와 자식 간 effect 실행 순서를 관찰하고, 그 순서에 기대는 설계와 기대지 않는 설계를 비교하는 예제입니다.

## 질문

부모가 `useEffect`에서 자원(예: 레지스트리 객체)을 준비하고, 자식이 자신의 `useEffect`에서 그 자원을 사용하려고 하면 어떻게 될까요?

## 관찰한 실제 순서

jsdom 환경에서 React 19 (react 19.3.1, react-dom 19.3.1)로 실행한 결과입니다.

### 마운트 시 effect 실행 순서

```
1. GrandChild1 useLayoutEffect setup
2. Child1 useLayoutEffect setup
3. Child2 useLayoutEffect setup
4. Parent useLayoutEffect setup
5. GrandChild1 useEffect setup
6. Child1 useEffect setup
7. Child2 useEffect setup
8. Parent useEffect setup
```

**핵심 관찰:**
- `useLayoutEffect` setup은 자식이 부모보다 먼저 실행됩니다.
- `useEffect` setup은 자식이 부모보다 먼저 실행됩니다.
- 모든 `useLayoutEffect` setup이 모든 `useEffect` setup보다 먼저 실행됩니다.

### 언마운트 시 cleanup 실행 순서

```
1. Parent useLayoutEffect cleanup
2. Child1 useLayoutEffect cleanup
3. GrandChild1 useLayoutEffect cleanup
4. Child2 useLayoutEffect cleanup
5. Parent useEffect cleanup
6. Child1 useEffect cleanup
7. GrandChild1 useEffect cleanup
8. Child2 useEffect cleanup
```

**핵심 관찰:**
- cleanup은 부모가 자식보다 먼저 실행됩니다 (setup과 반대).
- 모든 `useLayoutEffect` cleanup이 모든 `useEffect` cleanup보다 먼저 실행됩니다.

### 리렌더 시 cleanup과 setup 순서

```
1. Child useLayoutEffect cleanup
2. Parent useLayoutEffect cleanup
3. Child useLayoutEffect setup
4. Parent useLayoutEffect setup
5. Child useEffect cleanup
6. Parent useEffect cleanup
7. Child useEffect setup
8. Parent useEffect setup
```

**핵심 관찰:**
- cleanup은 자식이 먼저, 부모가 나중입니다.
- 같은 종류의 cleanup이 모두 실행된 뒤 setup이 실행됩니다.
- setup은 자식이 먼저, 부모가 나중입니다.

## 설계 비교

| 설계 | 방법 | useLayoutEffect에서 사용 | useEffect에서 사용 | 렌더 중 부수 효과 | 순서 의존 |
|------|------|--------------------------|-------------------|------------------|----------|
| Naive (실패) | 부모 useEffect에서 준비 | ❌ 불가 | ❌ 불가 | ✅ 없음 | ⚠️ 의존 |
| 설계 A (부분) | 부모 useLayoutEffect에서 준비 | ❌ 불가 | ✅ 가능 | ✅ 없음 | ⚠️ 의존 |
| 설계 B (권장) | 렌더 중 초기화 + Context | ✅ 가능 | ✅ 가능 | ✅ 없음 | ✅ 독립 |
| 설계 C (권장) | effect 기반 등록/해제 | ✅ 가능 | ✅ 가능 | ✅ 없음 | ⚠️ 순서 이용* |

\* 설계 C는 자식 effect가 부모 effect보다 먼저 도는 관찰된 순서를 **이용**합니다. 렌더 중 부수 효과를 피하고 effect에서 등록/해제하므로 안정적입니다.

### Naive 설계 (실패 재현)

부모가 `useEffect`에서 registry를 만들고 자식이 `useEffect`에서 사용하려고 하면:
- 자식 `useEffect`가 부모 `useEffect`보다 먼저 실행됩니다.
- 자식 시점에 registry가 `null`이어서 등록이 실패합니다.
- 마운트 후에도 registry.items는 비어 있습니다 (등록 영구 누락).

### 설계 A (부분 해결)

부모가 `useLayoutEffect`에서 registry를 만들면:
- 자식 `useLayoutEffect`는 부모 `useLayoutEffect`보다 먼저 실행되어 여전히 `null`입니다.
- 자식 `useEffect`는 부모 `useLayoutEffect`보다 나중이므로 registry를 사용할 수 있습니다.
- 마운트 후 items는 `['child-effect']`뿐입니다 (useLayoutEffect에서 시도한 등록은 누락).
- 제한적으로만 보장됩니다.

### 설계 B (권장 - 렌더 중 초기화)

부모가 `useState` 초기화 함수에서 registry를 만들고 Context로 전달하면:
- registry가 렌더 중에 생성되어 모든 effect에서 사용 가능합니다.
- 자식 `useLayoutEffect`와 `useEffect` 모두 registry에 접근할 수 있습니다.
- 언마운트 시 부모 `useEffect` cleanup에서 정리됩니다.

**언마운트 경계:**
- 부모 useEffect cleanup (dispose)이 자식 cleanup보다 먼저 실행됩니다.
- dispose 후 자식 useEffect cleanup (unregister)이 도착합니다.
- dispose 후 unregister는 disposed 플래그로 no-op 처리됩니다.

### 설계 C (권장 - effect 기반 등록/해제)

부모가 렌더 중에 안정적인 `register`/`unregister` 함수를 만들고, 자식이 effect에서 등록/해제하면:
- 자식은 `useEffect` setup에서 `register`, cleanup에서 `unregister`를 호출합니다.
- 부모는 `useEffect`에서 모인 등록을 일괄 처리합니다.
- 자식 effect가 부모 effect보다 먼저 도는 관찰된 순서를 이용합니다.
- **렌더 중 부수 효과를 피합니다**: 렌더 본문에서 부모 ref/state를 변경하지 않으므로 StrictMode 이중 렌더나 버려진 동시 렌더에서 안전합니다.
- **memo된 자식이 다시 렌더되지 않아도** effect 기반 등록이므로 등록이 유지됩니다 (렌더 중 등록은 memo된 자식이 미렌더 시 등록 소실).
- 조건부 렌더링으로 자식이 사라져도 올바르게 반영됩니다.
- 중복 등록은 소유자(owner) 비교로 감지하고 명시적으로 오류를 기록합니다.

## 렌더 중 등록을 피해야 하는 이유

렌더 본문에서 부모의 ref나 state를 변경하는 것은 부수 효과입니다:
- **StrictMode 이중 렌더**: 렌더가 두 번 호출되어 같은 id가 두 번 등록되어 중복 오류가 거짓으로 나타납니다.
- **버려진 동시 렌더**: React가 렌더를 버리면 등록이 유효하지 않은 상태로 남을 수 있습니다.
- **memo된 자식 미렌더**: 부모만 리렌더되고 memo된 자식이 다시 렌더되지 않으면 자식의 등록이 사라집니다.

effect 기반 등록/해제는 이 문제를 피합니다.

## 실행 방법

```bash
# 의존성 설치
npm ci

# 테스트 실행 (104개 검증)
npm test

# 데모 실행 (주요 시나리오 로그 출력)
npm run demo
```

## 테스트 결과

3회 반복 실행 결과 모두 통과:
- 총 테스트: 104개
- 실패: 0개
- act 경고: 0개

## 변형 검사

테스트가 실제 실패를 감지하는지 확인한 변형:

1. **설계 B를 렌더 중 초기화 대신 부모 useEffect로 변경**: Test 4 실패 (`registry is null at child useLayoutEffect`)
2. **설계 C의 cleanup unregister 제거**: Test 5 실패 (언마운트 후 unregister 호출 단언 실패)
3. **중복 등록 소유자 비교 제거**: Test 8 실패 (owner mismatch 단언 실패)
4. **설계 B의 dispose 후 no-op 가드 제거**: Test 4 실패 (dispose 후 unregister가 no-op이 아님)
5. **설계 C를 렌더 중 등록 방식으로 변경** (부모 렌더마다 등록 목록 비우고 렌더 중 registerChild로 채우기): Test 7 실패 (memo된 child-1이 등록에서 빠짐)

## 실행 환경

- Node.js: v22.23.4
- npm: 10.9.9
- react: 19.3.1
- react-dom: 19.3.1
- jsdom: 25.0.1

## 파일 구조

- `src/effect-order.js`: 테스트용 컴포넌트 정의
- `src/effect-order.test.js`: 8개 테스트 케이스 (104개 검증)
- `src/demo.js`: 주요 시나리오의 로그 출력
