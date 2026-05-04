import type { FunctionComponent, PropsWithChildren } from 'react';

import { cn } from '../lib/cn.js';

export type CardProps = PropsWithChildren<{
  title: string;
  className?: string | undefined;
}>;

export const Card: FunctionComponent<CardProps> = ({ title, className, children }) => {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 shadow-sm', className)}>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
};
