# React useOptimistic 비동기 액션 실패 시 낙관적 값 롤백 확인

이 예제는 React 19의 `useOptimistic` 훅에서 비동기 액션이 실패했을 때 낙관적 업데이트가 어떻게 롤백되는지 확인한다.

## 무엇을 확인하는가

1. **성공하는 액션**: 낙관적 값이 실제 상태로 확정된다
2. **실패하는 액션 (catch 없음)**: 낙관적 값이 원래 상태로 롤백된다
3. **실패하는 액션 (catch로 처리)**: 낙관적 값이 롤백되고 에러 상태를 설정할 수 있다
4. **연속 두 액션 중 하나만 실패**: 첫 번째 성공한 액션은 유지되고, 두 번째 실패한 액션만 롤백된다
5. **Form action 성공**: 낙관적 아이템이 실제 아이템으로 확정된다
6. **Form action 실패**: 낙관적 아이템이 제거된다

## 실행 방법

```bash
cd packages/react-use-optimistic-failed-action-rollback
npm install
npm test
```

## 구현 파일

- `src/optimistic-counter.js`: `useOptimistic`과 `useTransition`을 사용한 컴포넌트
- `src/optimistic-counter.test.js`: jsdom 환경에서 실행되는 테스트

## 실제 관측 결과

테스트를 실행하면 다음을 확인할 수 있다:

### 성공 케이스
- 액션 시작 시 `optimisticCount`가 즉시 증가
- 비동기 작업 완료 후 `count`가 실제로 증가
- `optimisticCount`와 `count`가 최종적으로 같은 값

### 실패 케이스
- 액션 시작 시 `optimisticCount`가 즉시 증가
- 비동기 작업이 throw하면 `optimisticCount`가 원래 `count` 값으로 롤백
- `count`는 변경되지 않음

### 연속 액션 케이스
- 첫 번째 액션 성공: `count`가 1로 증가
- 두 번째 액션 실패: `count`는 1 유지, `optimisticCount`는 1로 롤백
- 실패한 액션만 취소되고 성공한 액션은 유지됨

모든 테스트는 Node.js + jsdom 환경에서 실행되며, 각 검증이 실패하면 프로세스가 종료 코드 1로 종료된다.
