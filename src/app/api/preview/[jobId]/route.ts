import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const report = getJob(jobId);

  if (!report || !report.previewHtml) {
    return new NextResponse("Preview unavailable or expired.", { status: 404 });
  }

  return new NextResponse(report.previewHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

export async function HEAD(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
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
