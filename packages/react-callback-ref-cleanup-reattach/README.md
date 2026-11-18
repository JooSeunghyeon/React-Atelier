# React 19 콜백 ref의 cleanup 반환과 연결·해제 시점 확인

이 예제는 React 19의 콜백 ref가 다양한 상황에서 어떻게 연결(attach)되고 해제(detach)되는지 실제 테스트로 확인한다. 특히 cleanup 함수를 반환하는 새로운 기능과 함수 식별성에 따른 동작 차이를 관찰한다.

## 무엇을 확인하는가

1. **인라인 콜백 ref (cleanup 없음)**: 함수 식별성이 매 렌더마다 바뀌면 이전 함수가 null로 호출되고 새 함수가 node로 다시 호출된다.

2. **useCallback으로 고정된 콜백 ref**: 식별성이 고정되면 리렌더 시 재호출이 없고, 언마운트 때만 null이 전달된다.

3. **cleanup 반환 콜백 ref (인라인)**: 함수가 cleanup 함수를 반환하면 해제 시 ref(null) 대신 cleanup이 호출된다. 인라인으로 두면 리렌더마다 cleanup → 새 연결이 반복된다.

4. **cleanup 반환 콜백 ref (useCallback 고정)**: 식별성을 고정하면 리렌더 시 재호출이 없고, 언마운트 때만 cleanup이 호출된다.

5. **구독 누수 vs cleanup 관리**: 
   - null 처리를 빼먹은 구현: 리렌더 후 활성 구독 수가 누적(누수)
   - cleanup 반환 구현: 항상 활성 구독 1개 유지, 언마운트 후 0

6. **조건부 렌더**: 요소가 제거되면 detach 호출, 재등장하면 attach 호출

7. **key 변경**: key가 바뀌면 이전 요소 detach → 새 요소 attach 순서로 호출

## 실행 방법

```bash
cd packages/react-callback-ref-cleanup-reattach
npm ci
npm test
```

## 구현 파일

- `src/callback-ref-cleanup.js`: 테스트에서 사용하는 컴포넌트 팩토리, ref 로그 기록, 구독 카운터 헬퍼
- `src/callback-ref-cleanup.test.js`: jsdom 환경에서 실행되는 테스트

## 테스트 케이스

### 1. test1_inline_ref_without_cleanup: 인라인 콜백 ref (cleanup 없음)
- 초기 마운트 시 ref 호출 1회
- 리렌더 시 null → node 순서로 재호출 (함수 식별성 변경)
- null 호출과 node 호출 각 최소 1회씩 발생

### 2. test2_stable_ref_no_reattach: useCallback 고정 콜백 ref
- 초기 마운트 시 ref 호출 1회
- 리렌더 시 재호출 없음 (식별성 고정)
- 언마운트 시에만 null 호출 1회

### 3. test3_cleanup_return_inline: cleanup 반환 콜백 ref (인라인)
- 초기 마운트 시 attach 호출 1회
- 리렌더 시 cleanup-detach → cleanup-attach 순서로 호출
- 언마운트 시 cleanup-detach 호출 1회

### 4. test4_cleanup_return_stable: cleanup 반환 콜백 ref (useCallback 고정)
- 초기 마운트 시 attach 호출 1회
- 리렌더 시 재호출 없음 (식별성 고정)
- 언마운트 시에만 cleanup-detach 호출 1회

### 5. test5_subscription_leak_vs_cleanup: 구독 누수 vs cleanup 관리
- **null 처리 누락 버전**:
  - 초기 마운트 후 활성 구독 1개
  - 리렌더 후 구독 수가 1개 초과 (누수 발생)
- **cleanup 관리 버전**:
  - 초기 마운트 후 활성 구독 1개
  - 리렌더 후에도 활성 구독 1개 유지
  - 언마운트 후 활성 구독 0개

### 6. test6_conditional_render: 조건부 렌더
- 초기 렌더 시 attach 호출 1회
- 요소 제거 시 detach 호출 1회
- 요소 재등장 시 attach 호출 1회

### 7. test7_key_change: key 변경
- 초기 렌더 시 attach 호출 1회
- key 변경 시 detach → attach 순서로 호출

## 실행 결과

모든 테스트는 Node.js + jsdom 환경에서 실행되며, 총 41개의 검증을 수행한다. 검증이 실패하면 프로세스가 종료 코드 1로 종료된다.

```
총 41개 검증, 0개 실패
모든 테스트 통과!
```

## 실행 환경

- Node.js: v22.x 이상
- react: ^19.0.0
- react-dom: ^19.0.0
- jsdom: ^25.0.1

## 주요 관찰 결과

1. **함수 식별성이 핵심**: 인라인으로 작성한 콜백 ref는 매 렌더마다 새 함수이므로 React는 이를 다른 ref로 인식하여 재연결한다.

2. **cleanup 반환은 ref(null) 대신 호출됨**: cleanup 함수를 반환하면 해제 시 ref(null)이 아닌 cleanup() 형태로 호출된다.

3. **useCallback으로 최적화 가능**: cleanup을 반환하더라도 useCallback으로 식별성을 고정하면 불필요한 재연결을 방지할 수 있다.

4. **null 처리 없이 부수 효과를 실행하면 누수 발생**: ref 콜백에서 node를 체크하지 않고 구독을 추가하면 리렌더마다 누적된다. cleanup을 반환하면 이를 자동으로 정리할 수 있다.

5. **조건부 렌더와 key 변경은 언마운트/마운트로 처리**: 요소가 DOM에서 제거되거나 key가 변경되면 cleanup이 호출되고, 재등장하면 새로 연결된다.
