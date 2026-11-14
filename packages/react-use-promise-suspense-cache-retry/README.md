# React use(promise)와 Suspense에서 Promise 식별성·캐시·거부 재시도 확인

이 예제는 React 19의 `use(promise)`가 Suspense와 함께 동작할 때 Promise 식별성이 어떻게 영향을 미치는지, 캐시가 어떻게 작동하는지, 그리고 거부된 Promise가 Error Boundary 및 재시도와 어떻게 상호작용하는지 확인한다.

## 무엇을 확인하는가

1. **캐시 없이 매 렌더마다 새 Promise 생성**: 컴포넌트가 렌더링마다 `new Promise(...)`를 생성하고 `use(p)`를 호출하면 폴백에서 벗어나지 못한다
2. **캐시된 Promise**: 모듈 레벨 Map 캐시를 키로 조회하여 같은 Promise를 반환하면 fetch는 1회만 실행되고, 폴백이 한 번 표시된 후 콘텐츠가 나타나며, 같은 id로 재렌더링하면 즉시 콘텐츠를 표시한다
3. **거부된 캐시 Promise**: 거부된 Promise는 가장 가까운 class Error Boundary(getDerivedStateFromError)가 에러 메시지를 표시한다
4. **key로만 boundary 재설정**: 캐시 항목을 제거하지 않고 boundary의 `key`만 변경하면 같은 거부된 Promise가 다시 throw되고, 시도 횟수는 그대로 유지된다
5. **캐시 제거 + key 재설정**: 캐시 항목을 제거하고 boundary의 `key`를 변경하면 새로운 시도가 발생하여 성공할 수 있다
6. **서로 다른 id는 별도 캐시 항목**: 서로 다른 id를 사용하면 각각 독립적인 캐시 항목과 fetch가 발생한다
7. **같은 id 공유**: 두 컴포넌트가 같은 id를 사용하면 하나의 fetch를 공유한다

## 실행 방법

```bash
cd packages/react-use-promise-suspense-cache-retry
npm ci
npm test
```

## 구현 파일

- `src/use-promise-suspense.js`: `createResourceCache` 헬퍼 함수, 캐시된/비캐시 컴포넌트, ErrorBoundary 클래스 컴포넌트
- `src/use-promise-suspense.test.js`: jsdom 환경에서 실행되는 테스트

## 테스트 케이스

### 1. test1_uncached_never_leaves_fallback: 캐시 없이 렌더링마다 새 Promise 생성
- 컴포넌트가 렌더링마다 새로운 Promise를 생성함 (팩토리가 생성 횟수 추적)
- Promise 완료 시간을 충분히 기다려도 생성된 Promise 개수는 1개를 초과함
- DOM은 계속 폴백 상태 유지

### 2. test2_cached_single_fetch_shows_content: 캐시된 Promise - fetch 1회
- 캐시를 통해 같은 id로 동일한 Promise 반환
- fetch는 1회만 실행되고, 폴백이 한 번 표시된 후 콘텐츠가 나타남
- 같은 id로 재렌더링하면 폴백 없이 즉시 콘텐츠 표시

### 3. test3_rejected_cached_promise_shows_error: 거부된 캐시 Promise - Error Boundary
- 거부된 Promise는 Error Boundary에 의해 포착됨
- Error Boundary가 `getDerivedStateFromError`를 통해 에러 메시지 표시
- 시도 횟수는 1회로 유지

### 4. test4_reset_boundary_without_evict_rethrows: 캐시 유지 + key 재설정
- 캐시 항목을 제거하지 않고 boundary의 key만 변경
- 같은 거부된 Promise가 다시 throw됨
- 시도 횟수는 증가하지 않음(캐시 재사용)

### 5. test5_evict_cache_and_reset_boundary_succeeds: 캐시 제거 + key 재설정
- 하나의 캐시에서 첫 시도는 실패, 두 번째 시도는 성공하도록 구성
- evict() 호출만으로는 boundary가 여전히 에러 상태이므로 에러 UI 유지
- evict() + boundary key 재설정 조합으로 새로운 fetch 발생
- 두 번째 시도 성공, 콘텐츠 표시, 시도 횟수 2회, fetch 횟수 2회

### 6. test6_different_ids_separate_cache_entries: 다른 id는 별도 캐시 항목
- 서로 다른 id를 가진 두 컴포넌트는 각각 독립적으로 fetch 실행
- 총 2회 fetch 발생하고 각각의 데이터가 표시됨

### 7. test7_same_id_shared_cache_single_fetch: 같은 id 공유
- 같은 id를 사용하는 두 컴포넌트는 하나의 fetch만 실행
- 두 컴포넌트 모두 같은 캐시된 데이터를 표시함

## 실행 결과

모든 테스트는 Node.js + jsdom 환경에서 실행되며, 총 35개의 검증을 수행한다. 검증이 실패하면 프로세스가 종료 코드 1로 종료된다.

```
총 35개 검증, 0개 실패
모든 테스트 통과!
```
