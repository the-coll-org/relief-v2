/** The Collective Relief Network brand mark (cedar/triangle), on a white disc
 * so it reads on the navy header. Wordmark is intentionally not used in-app. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-pill bg-white shadow-card ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/crn-mark.png"
        alt="The Collective Relief Network"
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
      />
    </span>
  );
}
