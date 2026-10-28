"use client";

import { useEffect, useState } from "react";

/**
 * Whether an element is on screen. Returns a callback ref to put on the element, and the flag.
 * The ref is stable, so it can sit in a memo's dependencies.
 */
export function useInView<T extends Element>(options: IntersectionObserverInit = {}): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(false);
  const { root, rootMargin, threshold } = options;

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { root, rootMargin, threshold });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, root, rootMargin, threshold]);

  return [setNode, inView];
}
