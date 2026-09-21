import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/store";
import { createProjectZip } from "@/lib/zip";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
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
        return new URL(report.sourceUrl).hostname.replace(/^www\./, "").replace(/\./g, "-");
      } catch {
        return "framer-project";
      }
    })();

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${domainName}-nextjs.zip"`,
        "Content-Length": zipBuffer.length.toString(),
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
