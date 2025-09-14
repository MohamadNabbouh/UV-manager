'use client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-purple-900/20 ring-1 ring-purple-500/30 shadow-2xl backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}


export function Button(
  { className, isLoading, ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }
) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold',
        'bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : props.children}
    </button>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between py-6">{children}</div>;
}
