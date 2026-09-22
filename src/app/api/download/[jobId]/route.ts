import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/store";
import { createProjectZip } from "@/lib/zip";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  if (!jobId || !UUID_REGEX.test(jobId)) {
    return NextResponse.json(
      { error: "Invalid job identifier." },
      { status: 400 }
    );
  }

  const report = getJob(jobId);

  if (!report) {
    return NextResponse.json(
      { error: "Conversion job not found or has expired. Please convert again." },
      { status: 404 }
    );
  }

  try {
    const zipBuffer = await createProjectZip(report.files);
    const domainName = (() => {
      try {
        return new URL(report.sourceUrl).hostname.replace(/^www\./, "").replace(/[^a-zA-Z0-9-]/g, "-");
      } catch {
        return "project";
      }
    })();

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${domainName}-nextjs.zip"`,
        "Content-Length": zipBuffer.length.toString(),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("ZIP Generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate ZIP archive." },
      { status: 500 }
    );
  }
}
