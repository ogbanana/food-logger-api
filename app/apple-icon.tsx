import { ImageResponse } from "next/og";
import { brandIconElement } from "../components/web/brandIcon";

// iOS home-screen icon (Safari rounds the corners itself, so the tile is square).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(brandIconElement(size.width), { ...size });
}
