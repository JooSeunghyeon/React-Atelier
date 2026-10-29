import { useReducer } from "react";

const initialState = { count: 0, label: "start" };

function counterReducer(state, action) {
  switch (action.type) {
    case "increment":
      console.log("[reducer] increment 분기 실행");
      return { ...state, count: state.count + 1 };
    case "setLabel":
      console.log("[reducer] setLabel 분기 실행");
      return { ...state, label: action.label };
    default:
      console.log("[reducer] default 분기 실행, 받은 타입:", action.type);
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(counterReducer, initialState);

  const handleKnown = () => {
    const before = state;
    dispatch({ type: "increment" });
    console.log("정의된 액션 dispatch 후 호출 전 상태 참조 동일 여부:", before === state);
  };

  const handleUnknown = () => {
    const before = state;
    dispatch({ type: "notDefined" });
    console.log("미정의 액션 dispatch 후 호출 전 상태 참조 동일 여부:", before === state);
  };

  return (
    <div>
      <p>count: {state.count}</p>
      <p>label: {state.label}</p>
      <button onClick={handleKnown}>정의된 액션</button>
      <button onClick={handleUnknown}>미정의 액션</button>
    </div>
  );
}
