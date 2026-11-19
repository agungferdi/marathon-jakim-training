import { useLayoutEffect, useRef, useState } from 'react';

/** Width of an element, kept up to date with a ResizeObserver. */
export function useWidth<T extends HTMLElement>(initial = 720) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
