interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-sm bg-ink px-4 py-2 font-sans text-sm text-paper shadow-lg">
      {message}
    </div>
  );
}
