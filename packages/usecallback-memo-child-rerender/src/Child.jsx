import { memo } from "react";

export const Child = memo(function Child({ onClick, label }) {
  console.log(`[Child:${label}] render`);
  return <button onClick={onClick}>자식 버튼 ({label})</button>;
});
