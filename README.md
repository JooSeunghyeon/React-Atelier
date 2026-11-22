# React Atelier

컴포넌트를 짜 보면서 남긴 코드다. 폴더를 열면 README에 어디부터 보면 되는지 적혀 있다.

## 목록

- [react-counter-basics](packages/react-counter-basics/README.md): 증가, 감소 버튼으로 숫자를 바꾼다.
- [usecallback-memo-child-rerender](packages/usecallback-memo-child-rerender/README.md): useCallback으로 감싼 함수를 React.memo 자식에 넘겼을 때 리렌더링 여부를 console.log로 확인하는 예제
- [react-usereducer-unknown-action-default](packages/react-usereducer-unknown-action-default/README.md): useReducer에 정의되지 않은 액션 타입을 dispatch했을 때 default 분기가 실행되고 상태가 유지되는지 console.log로 확인한다.
- [react-number-input-empty-to-zero](packages/react-number-input-empty-to-zero/README.md): number 입력의 onChange에서 빈 문자열이 Number('')로 변환되어 0이 되는 경계 동작을 console.log로 확인한다.
- [react-context-provider-value-rerender](packages/react-context-provider-value-rerender/README.md): Context Provider의 value 객체를 매 렌더마다 새로 만들면 소비자 컴포넌트가 몇 번 리렌더링되는지 console.log로 확인하는 예제
- [react-use-optimistic-failed-action-rollback](packages/react-use-optimistic-failed-action-rollback/README.md): React 19 useOptimistic에서 비동기 액션이 성공하면 낙관적 값이 확정되고 실패하면 롤백되는지, 연속 액션·리스트 추가 등 6가지 케이스를 jsdom 환경의 실행 가능한 테스트로 확인하는 예제
- [react-use-promise-suspense-cache-retry](packages/react-use-promise-suspense-cache-retry/README.md): React 19 use(promise)와 Suspense에서 Promise 식별성에 따른 캐시 동작, 거부된 Promise의 Error Boundary 처리, key 재설정과 캐시 제거를 통한 재시도 등 7가지 케이스를 jsdom 환경의 실행 가능한 테스트로 확인하는 예제
- [react-callback-ref-cleanup-reattach](packages/react-callback-ref-cleanup-reattach/README.md): React 19 콜백 ref의 cleanup 반환과 식별성에 따른 연결·해제 시점, 구독 누수 메커니즘(null 호출 시에도 subscribe 실행) 등 7가지 케이스를 jsdom 환경의 실행 가능한 테스트로 확인하는 예제
- [react-effect-order-parent-child](packages/react-effect-order-parent-child/README.md): 부모와 자식 간 useLayoutEffect와 useEffect 실행 순서를 관찰하고, 순서에 기대는 설계(실패)와 렌더 중 초기화 또는 effect 기반 등록 패턴(성공)을 비교하는 8가지 테스트 케이스 (104개 검증)
