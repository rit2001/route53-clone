import { LoaderCircle } from "lucide-react";

type SpinnerProps = Readonly<{
  className?: string;
  label?: string;
}>;

export function Spinner({
  className = "size-4",
  label = "Loading",
}: SpinnerProps) {
  return (
    <LoaderCircle
      aria-label={label}
      className={`${className} animate-spin motion-reduce:animate-none`}
    />
  );
}
