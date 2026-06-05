'use client';

import { useEffect } from 'react';

/** Non-blocking transient message, anchored above the bottom nav. */
export function Toast({
  message,
  onDismiss,
  duration = 4000,
}: {
  message: string | null;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [message, duration, onDismiss]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-28 z-40 flex justify-center px-md"
    >
      <div className="max-w-sm rounded-button bg-text-primary px-md py-2.5 text-sm text-text-inverse shadow-card">
        {message}
      </div>
    </div>
  );
}
