import type { PropsWithChildren } from 'react';

interface LayoutProps {
  className?: string;
}

export default function SectionLayout({ children, className = '' }: PropsWithChildren<LayoutProps>) {
  return <div className={`mx-auto w-full max-w-6xl px-6 ${className}`}>{children}</div>;
}
