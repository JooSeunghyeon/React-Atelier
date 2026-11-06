import { createContext, useContext, useMemo, useState } from 'react';

const InlineContext = createContext(null);
const MemoContext = createContext(null);

function InlineConsumer() {
  const { label } = useContext(InlineContext);
  console.count('InlineConsumer render');
  return <p>inline: {label}</p>;
}

function MemoConsumer() {
  const { label } = useContext(MemoContext);
  console.count('MemoConsumer render');
  return <p>memo: {label}</p>;
}

export default function ValueRerender() {
  const [label] = useState('theme-a');
  const [unrelated, setUnrelated] = useState(0);

  const memoValue = useMemo(() => ({ label }), [label]);

  console.log('ValueRerender parent render, unrelated =', unrelated);

  return (
    <div>
      <button onClick={() => setUnrelated((n) => n + 1)}>
        무관한 상태 변경 ({unrelated})
      </button>
      <InlineContext.Provider value={{ label }}>
        <InlineConsumer />
      </InlineContext.Provider>
      <MemoContext.Provider value={memoValue}>
        <MemoConsumer />
      </MemoContext.Provider>
    </div>
  );
}
