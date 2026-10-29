# useReducer 미정의 액션 dispatch 시 default 분기 확인

이 예제는 reducer의 switch 문에 없는 액션 타입을 dispatch했을 때 default 분기가 실행되는지, 그리고 기존 상태가 그대로 유지되는지를 콘솔 로그로 확인한다.

버튼을 누르면 정의된 액션과 정의되지 않은 액션을 각각 dispatch한다. 콘솔에서 reducer 호출 순서와 반환된 상태 객체의 참조가 바뀌었는지 비교한다.

참조 비교 결과는 실행 환경과 React 버전에 따라 로그 출력 순서가 달라질 수 있으므로 직접 실행해서 확인해야 한다.
