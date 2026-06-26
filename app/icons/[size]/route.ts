import { ImageResponse } from "next/og";
import { brandIconElement } from "../../../components/web/brandIcon";

const ALLOWED = new Set([192, 512]);

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const n = Number(size);
  if (!ALLOWED.has(n)) {
    return new Response("Not found", { status: 404 });
  }
  return new ImageResponse(brandIconElement(n), { width: n, height: n });
}
