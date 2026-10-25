import { useState, useCallback } from "react";
import { Child } from "./Child";

export default function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");

  const memoizedHandler = useCallback(() => {
    console.log("memoized handler called");
  }, []);

  const plainHandler = () => {
    console.log("plain handler called");
  };

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={() => setCount(count + 1)}>부모 카운터 증가</button>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <h3>useCallback 적용</h3>
      <Child onClick={memoizedHandler} label="memo" />
      <h3>일반 함수 전달</h3>
      <Child onClick={plainHandler} label="plain" />
    </div>
  );
}
