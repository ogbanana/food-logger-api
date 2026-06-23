// Hand-drawn SVG stand-ins for the emoji the app used to render inline, so the
// UI stays crisp and on-theme instead of depending on the platform emoji font.
// Each keeps the rough look of the emoji it replaces.

type IconProps = { size?: number };

/** a steak with marbling and a bone nub. */
export function SteakIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.15em" }}
    >
      <path
        d="M5.5 9.5 Q4.2 5.2 9 5 Q14 4.4 18 6.4 Q22 8.6 19.8 13.2 Q17.6 19 11.6 18.8 Q5 18.6 5.2 13.6 Z"
        fill="#C44E4E"
        stroke="#9B3A38"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M9 10 Q11.5 8.8 14.5 10.8"
        stroke="#E7B0AA"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx="8.4"
        cy="8.6"
        r="1.7"
        fill="#FBF1E8"
        stroke="#D9C4B2"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/** a bowl of leafy greens with a tomato. */
export function SaladIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.15em" }}
    >
      <path
        d="M3 12 H21 Q21 20 12 20 Q3 20 3 12 Z"
        fill="#EEF1F5"
        stroke="#C5CBD4"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="10" r="3.1" fill="#5FAE3A" />
      <circle cx="12.8" cy="8.9" r="3.4" fill="#74C247" />
      <circle cx="16.6" cy="10.8" r="2.7" fill="#4E9A30" />
      <circle cx="10.8" cy="10.8" r="2.2" fill="#88D05B" />
      <circle cx="14.6" cy="11.4" r="1.5" fill="#E2503B" />
    </svg>
  );
}

/** a tear-off calendar with a red header and binding rings. */
export function CalendarIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.15em" }}
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2.5"
        fill="#FFFFFF"
        stroke="#D0D4DA"
        strokeWidth="1"
      />
      <path
        d="M3 9.5 V7.5 Q3 5 5.5 5 H18.5 Q21 5 21 7.5 V9.5 Z"
        fill="#EB5757"
      />
      <rect x="6.8" y="3" width="2" height="4.2" rx="1" fill="#AEB2BA" />
      <rect x="15.2" y="3" width="2" height="4.2" rx="1" fill="#AEB2BA" />
      <g fill="#C7CCD4">
        <rect x="6" y="12.2" width="2.6" height="2.6" rx="0.6" />
        <rect x="10.7" y="12.2" width="2.6" height="2.6" rx="0.6" />
        <rect x="15.4" y="12.2" width="2.6" height="2.6" rx="0.6" />
        <rect x="6" y="16.2" width="2.6" height="2.6" rx="0.6" />
        <rect x="10.7" y="16.2" width="2.6" height="2.6" rx="0.6" />
      </g>
    </svg>
  );
}

/** 👤 — a filled head-and-shoulders bust; inherits text color. */
export function PersonIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.15em" }}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20 Q4 13.5 12 13.5 Q20 13.5 20 20 Z" />
    </svg>
  );
}

/** ⏳ — an hourglass with amber sand; frame inherits text color. */
export function HourglassIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.15em" }}
    >
      <path
        d="M6 3 H18 M6 21 H18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7.2 3 Q7.2 9 12 12 Q16.8 15 16.8 21 M16.8 3 Q16.8 9 12 12 Q7.2 15 7.2 21"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M9.3 18.6 Q12 14.8 14.7 18.6 Z" fill="#E0A030" />
      <path d="M10 4.6 H14 Q13.2 7 12 7.6 Q10.8 7 10 4.6 Z" fill="#E0A030" />
    </svg>
  );
}

/** ✓ — a success check mark. Defaults to a positive green. */
export function CheckIcon({
  size = 16,
  color = "#1FA971",
}: IconProps & { color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.15em" }}
    >
      <path
        d="M5 13 L10 18 L19 6.5"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
