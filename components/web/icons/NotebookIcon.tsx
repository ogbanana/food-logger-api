export default function NotebookIcon({
  size = 16,
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
      {/* Cover */}
      <path d="M5 3 h11 a2 2 0 0 1 2 2 v14 a2 2 0 0 1 -2 2 H5 Z" />
      {/* Spiral binding */}
      <path d="M5 3 v18" />
      {/* Lines */}
      <path d="M9 8 h5" />
      <path d="M9 12 h5" />
      <path d="M9 16 h3" />
    </svg>
  );
}
