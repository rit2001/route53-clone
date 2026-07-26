import { CircleAlert } from "lucide-react";

type ErrorAlertProps = Readonly<{
  title?: string;
  message: string;
  onRetry?: () => void;
}>;

export function ErrorAlert({
  title = "Unable to complete the request",
  message,
  onRetry,
}: ErrorAlertProps) {
  return (
    <div
      className="flex gap-3 rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--text)]"
      role="alert"
    >
      <CircleAlert
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-[var(--danger)]"
      />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-[var(--muted)]">{message}</p>
        {onRetry ? (
          <button
            className="mt-2 font-semibold text-[var(--link)] hover:underline"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
