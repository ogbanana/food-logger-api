// Shared artwork for the app's generated PWA icons (favicon, apple-touch, and
// the manifest 192/512 PNGs). Rendered through `next/og`'s ImageResponse, which
// uses a flexbox-only renderer — so the logo is embedded as an <img> data URI on
// a full-bleed gradient tile (full-bleed keeps it safe for maskable icons).

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
<path d="M8 4 H24 Q29 4 29 9 V19 Q29 24 24 24 H14 L8 29 L8 24 Q3 24 3 19 V9 Q3 4 8 4 Z" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
<path d="M8.2 6.6 H11.6 M8.5 6.6 V8.2 Q7 8.8 7 10.3 V18.6 Q7 19.6 8.1 19.6 H11.7 Q12.8 19.6 12.8 18.6 V10.3 Q12.8 8.8 11.3 8.2 V6.6" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M19.8 9.8 Q17 9.8 17 14.2 Q17 19.6 19.8 19.6 Q20.7 19.6 21.3 19 Q21.9 19.6 22.8 19.6 Q25.6 19.6 25.6 14.2 Q25.6 9.8 22.8 9.8 Q21.8 9.8 21.3 10.4 Q20.8 9.8 19.8 9.8 Z M21.3 10 V7.4 Q21.3 6.2 23 6.1" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function brandIconElement(size: number) {
  const logoSize = Math.round(size * 0.6);
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #232633 0%, #0D0E12 100%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img width={logoSize} height={logoSize} src={src} alt="" />
    </div>
  );
}
