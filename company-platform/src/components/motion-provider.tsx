'use client';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

/** Makes every motion component honour the visitor's prefers-reduced-motion setting. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
