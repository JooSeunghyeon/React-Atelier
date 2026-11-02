import { useState } from 'react';

export default function NumberInput() {
  const [amount, setAmount] = useState(10);

  function handleChange(event) {
    const raw = event.target.value;
    const converted = Number(raw);

    console.log('raw:', JSON.stringify(raw), 'converted:', converted);

    if (raw === '') {
      console.log('빈 입력이 Number()로 0이 되었는지 확인한다:', converted === 0);
    }

    setAmount(converted);
  }

  return (
    <div>
      <input type="number" value={amount} onChange={handleChange} />
      <p>상태 값: {amount}</p>
    </div>
  );
}
