export function Icon({
  name,
  className = '',
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined ${filled ? 'icon-filled' : ''} ${className}`}
    >
      {name}
    </span>
  );
}
