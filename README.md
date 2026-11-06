# React Atelier

컴포넌트를 짜 보면서 남긴 코드다. 폴더를 열면 README에 어디부터 보면 되는지 적혀 있다.

## 목록

- [react-counter-basics](packages/react-counter-basics/README.md): 증가, 감소 버튼으로 숫자를 바꾼다.
- [usecallback-memo-child-rerender](packages/usecallback-memo-child-rerender/README.md): useCallback으로 감싼 함수를 React.memo 자식에 넘겼을 때 리렌더링 여부를 console.log로 확인하는 예제
- [react-usereducer-unknown-action-default](packages/react-usereducer-unknown-action-default/README.md): useReducer에 정의되지 않은 액션 타입을 dispatch했을 때 default 분기가 실행되고 상태가 유지되는지 console.log로 확인한다.
- [react-number-input-empty-to-zero](packages/react-number-input-empty-to-zero/README.md): number 입력의 onChange에서 빈 문자열이 Number('')로 변환되어 0이 되는 경계 동작을 console.log로 확인한다.
- [react-context-provider-value-rerender](packages/react-context-provider-value-rerender/README.md): Context Provider의 value 객체를 매 렌더마다 새로 만들면 소비자 컴포넌트가 몇 번 리렌더링되는지 console.log로 확인하는 예제
