export default function DashboardIcon({
  color,
  size = 24,
  // Per-bar fill, left to right. Defaults to "none" so the icon reads as a
  // clean outline when inactive; pass colors to fill the bars when active.
  barFills = ["none", "none", "none"],
}: {
  color: string;
  size?: number;
  barFills?: [string, string, string];
}) {
  // A filled bar gets its own color as the stroke too, so it reads as one solid
  // shape rather than a tinted box inside a mismatched outline.
  const barStroke = (i: number) => (barFills[i] === "none" ? color : barFills[i]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="14"
        width="5"
        height="8"
        rx="1.5"
        fill={barFills[0]}
        stroke={barStroke(0)}
        strokeWidth="2"
      />
      <rect
        x="9.5"
        y="9"
        width="5"
        height="13"
        rx="1.5"
        fill={barFills[1]}
        stroke={barStroke(1)}
        strokeWidth="2"
      />
      <rect
        x="17"
        y="4"
        width="5"
        height="18"
        rx="1.5"
        fill={barFills[2]}
        stroke={barStroke(2)}
        strokeWidth="2"
      />
      <line
        x1="1"
        y1="22"
        x2="23"
        y2="22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
