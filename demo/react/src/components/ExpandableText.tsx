import { type FunctionComponent, type PropsWithChildren, useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/lib/cn.js';

export type ExpandableTextProps = PropsWithChildren<{
  readonly maxLines: number;
  readonly className?: string | undefined;
}>;

export const ExpandableText: FunctionComponent<ExpandableTextProps> = ({ maxLines, children, className }) => {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setOverflowing(el.clientHeight < el.scrollHeight - 5);
    };

    measure();
    window.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      <input type="checkbox" id={id} className="peer hidden" />
      <div ref={ref} className="overflow-hidden peer-checked:max-h-none" style={{ WebkitLineClamp: maxLines }}>
        {children}
      </div>
      {overflowing && (
        <label htmlFor={id} className="cursor-pointer text-sm text-blue-600 underline peer-checked:hidden">
          Read more
        </label>
      )}
    </div>
  );
};
