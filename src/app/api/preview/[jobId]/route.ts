import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/store";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  if (!jobId || !UUID_REGEX.test(jobId)) {
    return new NextResponse("Invalid Job Identifier", { status: 400 });
  }

  const report = getJob(jobId);

  if (!report || !report.previewHtml) {
    return new NextResponse("Preview unavailable or expired.", { status: 404 });
  }

  return new NextResponse(report.previewHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'self'",
    },
  });
}

export async function HEAD(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  if (!jobId || !UUID_REGEX.test(jobId)) {
    return new NextResponse(null, { status: 400 });
  }

  const report = getJob(jobId);

  if (!report) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      "X-Framer-Job": jobId,
    },
  });
}
