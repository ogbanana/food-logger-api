/**
 * Food Logger brand mark: a speech bubble holding a water bottle and an apple —
 * you tell the app what you ate (natural language) and it logs it. `color` draws
 * the bubble. `accent` is the default for the contents; pass `bottle`, `apple`,
 * and `stem` to color them individually (matches the PWA icon's palette).
 */
export default function FoodLoggerLogo({
  size = 28,
  color = "#434141",
  accent = "#1148a1",
  bottle = accent,
  apple = accent,
  stem = accent,
}: {
  size?: number;
  color?: string;
  accent?: string;
  bottle?: string;
  apple?: string;
  stem?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Speech bubble with a tail at the bottom-left */}
      <path
        d="M8 4 H24 Q29 4 29 9 V19 Q29 24 24 24 H14 L8 29 L8 24 Q3 24 3 19 V9 Q3 4 8 4 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Water bottle */}
      <path
        d="M8.2 6.6 H11.6 M8.5 6.6 V8.2 Q7.0 8.8 7.0 10.3 V18.6 Q7.0 19.6 8.1 19.6 H11.7 Q12.8 19.6 12.8 18.6 V10.3 Q12.8 8.8 11.3 8.2 V6.6"
        stroke={bottle}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={bottle}
      />
      {/* Apple body */}
      <path
        d="M19.8 9.8 Q17.0 9.8 17.0 14.2 Q17.0 19.6 19.8 19.6 Q20.7 19.6 21.3 19.0 Q21.9 19.6 22.8 19.6 Q25.6 19.6 25.6 14.2 Q25.6 9.8 22.8 9.8 Q21.8 9.8 21.3 10.4 Q20.8 9.8 19.8 9.8 Z"
        stroke={apple}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={apple}
      />
      {/* Apple stem */}
      <path
        d="M21.3 10 V7.4 Q21.3 6.2 23.0 6.1"
        stroke={stem}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
