/** The Collective brand mark — an "LB" disc used in the header. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-text-inverse font-heading text-sm font-bold text-primary shadow-card ${className}`}
      aria-hidden="true"
    >
      LB
    </span>
  );
}
