export default function PenIcon({
  size = 12,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Fuller pencil body (wider than a single diagonal stroke). */}
      <path d="M3 21 l1.5 -4.5 L15 6 l4.5 4.5 L9 21 Z" />
      <path d="M13.5 7.5 l3 3" />
    </svg>
  );
}
