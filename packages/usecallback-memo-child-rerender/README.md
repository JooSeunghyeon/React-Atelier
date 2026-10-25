# useCallback과 React.memo로 자식 리렌더링 확인하기

부모 컴포넌트의 카운터 상태가 바뀔 때마다 자식 컴포넌트가 다시 렌더링되는지 console.log로 확인한다.

- `useCallback`으로 감싼 함수를 `React.memo` 자식에 넘긴다.
- 같은 자식에 일반 함수를 넘기는 경우와 비교한다.
- 콘솔에 찍히는 `[Child] render` 로그 횟수를 본다.

실행 결과는 브라우저 콘솔에서 직접 확인한다.
