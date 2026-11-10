import { useState, useOptimistic, useTransition } from 'react';

/**
 * useOptimistic을 사용하여 비동기 액션의 성공/실패 시 낙관적 업데이트 동작을 확인하는 컴포넌트
 */
export function OptimisticCounter() {
  const [count, setCount] = useState(0);
  const [optimisticCount, addOptimistic] = useOptimistic(
    count,
    (state, incrementValue) => state + incrementValue
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function incrementSuccess() {
    setError(null);
    startTransition(async () => {
      addOptimistic(1);
      await new Promise(resolve => setTimeout(resolve, 50));
      setCount(c => c + 1);
    });
  }

  function incrementWithErrorCatch() {
    setError(null);
    startTransition(async () => {
      addOptimistic(1);
      try {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Action failed');
      } catch (err) {
        setError(err.message);
      }
    });
  }

  return {
    count,
    optimisticCount,
    isPending,
    error,
    incrementSuccess,
    incrementWithErrorCatch,
  };
}

/**
 * Form action을 사용한 useOptimistic 예제
 */
export function OptimisticList() {
  const [items, setItems] = useState([]);
  const [optimisticItems, addOptimisticItem] = useOptimistic(
    items,
    (state, newItem) => [...state, newItem]
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function addItemSuccess(text) {
    setError(null);
    startTransition(async () => {
      addOptimisticItem({ id: 'temp-' + Date.now(), text, pending: true });
      await new Promise(resolve => setTimeout(resolve, 50));
      setItems(prev => [...prev, { id: 'real-' + Date.now(), text, pending: false }]);
    });
  }

  function addItemWithErrorCatch(text) {
    setError(null);
    startTransition(async () => {
      addOptimisticItem({ id: 'temp-' + Date.now(), text, pending: true });
      try {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Failed to add item');
      } catch (err) {
        setError(err.message);
      }
    });
  }

  return {
    items,
    optimisticItems,
    isPending,
    error,
    addItemSuccess,
    addItemWithErrorCatch,
  };
}
