# React useOptimistic 비동기 액션 실패 시 낙관적 값 롤백 확인

이 예제는 React 19의 `useOptimistic` 훅에서 비동기 액션이 실패했을 때 낙관적 업데이트가 어떻게 롤백되는지 확인한다.

## 무엇을 확인하는가

1. **성공하는 액션**: 낙관적 값이 실제 상태로 확정된다
2. **실패하는 액션 (catch로 처리)**: 낙관적 값이 롤백되고 에러 상태를 설정할 수 있다
3. **연속 두 액션 중 하나만 실패**: 첫 번째 성공한 액션은 유지되고, 두 번째 실패한 액션만 롤백된다
4. **리스트 추가 액션 성공**: 낙관적 아이템이 실제 아이템으로 확정된다
5. **리스트 추가 액션 실패**: 낙관적 아이템이 제거된다
6. **리스트에 두 액션, 하나 성공 하나 실패**: 성공한 아이템은 유지되고 실패한 아이템만 제거된다

> **참고**: 이 예제는 `try/catch`로 에러를 처리하는 케이스를 다룬다. `catch` 없이 `throw`하면 에러가 트랜지션 밖으로 전파되며, React의 Error Boundary로 처리해야 한다.

## 실행 방법

```bash
cd packages/react-use-optimistic-failed-action-rollback
npm install
npm test
```

## 구현 파일

- `src/optimistic-counter.js`: `useOptimistic`과 `useTransition`을 사용한 컴포넌트
- `src/optimistic-counter.test.js`: jsdom 환경에서 실행되는 테스트

## 테스트 케이스

### 1. test1_successfulAction: 성공하는 액션
- 액션 시작 시 `optimisticCount`가 즉시 1로 증가
- 비동기 작업 완료 후 `count`가 실제로 1로 증가
- `optimisticCount`와 `count`가 최종적으로 모두 1

### 2. test2_failedActionWithCatch: 실패하는 액션 (catch로 처리)
- 액션 시작 시 `optimisticCount`가 즉시 1로 증가
- 비동기 작업이 throw하면 `optimisticCount`가 원래 값 0으로 롤백
- `count`는 0으로 유지되고, `error` 상태에 "Action failed" 메시지 설정

### 3. test3_twoActionsOneFailure: 연속 두 액션 중 두 번째만 실패
- 첫 번째 액션 성공: `count`가 1로 증가
- 두 번째 액션 실패: `count`는 1 유지, `optimisticCount`는 1로 롤백
- 성공한 첫 번째 액션은 유지되고 실패한 두 번째 액션만 취소됨

### 4. test4_listAddSuccess: 리스트 추가 성공
- 액션 시작 시 `optimisticItems`에 `pending: true`인 임시 아이템 추가
- 비동기 작업 완료 후 `items`에 `pending: false`인 실제 아이템 추가
- `items`와 `optimisticItems` 길이가 모두 1

### 5. test5_listAddFailure: 리스트 추가 실패
- 액션 시작 시 `optimisticItems`에 임시 아이템 추가
- 비동기 작업 실패 후 `optimisticItems`가 빈 배열로 롤백
- `items`는 빈 배열 유지, `error` 상태에 "Failed to add item" 메시지 설정

### 6. test6_twoListAddsMixedResults: 리스트에 두 번 추가, 하나 성공 하나 실패
- 첫 번째 추가 성공: `items`에 1개 아이템
- 두 번째 추가 실패: `items`는 1개 유지, `optimisticItems`는 1개로 롤백
- 성공한 아이템은 유지되고 실패한 아이템만 제거됨

## 실행 결과

모든 테스트는 Node.js + jsdom 환경에서 실행되며, 총 45개의 검증(assertion)을 수행한다. 검증이 실패하면 프로세스가 종료 코드 1로 종료된다.

```
총 45개 검증, 0개 실패
✅ 모든 테스트 통과!
```
