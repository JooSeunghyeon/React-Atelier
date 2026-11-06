# React Context Provider value 재생성과 소비자 리렌더링

이 폴더는 Context Provider에 넘기는 value 객체를 매 렌더마다 새로 만들었을 때 useContext 소비자가 얼마나 다시 렌더링되는지 console.count로 확인한다.

두 개의 소비자 컴포넌트가 있다. 하나는 인라인 객체를 value로 받는 Provider 아래에, 다른 하나는 useMemo로 고정한 객체를 받는 Provider 아래에 놓인다. 부모 컴포넌트의 무관한 상태를 바꾸면 두 소비자의 로그 차이가 드러난다.

실행 후 콘솔에서 인라인 쪽 카운트가 부모 렌더마다 올라가는지, 메모이제이션한 쪽은 그대로인지 본다.
