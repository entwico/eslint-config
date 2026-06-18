import { type FunctionComponent, useState } from 'react';

import { cn } from '../lib/cn.js';

export type CounterProps = {
  readonly initial?: number | undefined;
  readonly className?: string | undefined;
};

export const Counter: FunctionComponent<CounterProps> = ({ initial = 0, className }) => {
  const [count, setCount] = useState(initial);

  return (
    <button
      type="button"
      onClick={() => setCount((c) => c + 1)}
      className={cn('rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700', className)}
    >
      Count: {count}
    </button>
  );
};
