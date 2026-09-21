import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { convertSite } from "@/lib/converter";
import { saveJob } from "@/lib/store";

export const maxDuration = 60; // Compatible with standard Vercel serverless functions

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, maxPages, maxImages } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Please provide a valid website URL (e.g. https://example.com)." }, { status: 400 });
    }

    const logs: string[] = [];
    const report = await convertSite(
      url,
      {
        maxPages: maxPages ? Math.min(Number(maxPages), 25) : 15,
        maxImages: maxImages ? Math.min(Number(maxImages), 200) : 150,
      },
      (msg) => {
        logs.push(msg);
      }
    );

    const jobId = crypto.randomUUID();
    saveJob(jobId, report);

    return NextResponse.json({
      jobId,
      sourceUrl: report.sourceUrl,
      platform: report.platform,
      pages: report.pages,
      stats: report.stats,
      notes: report.notes,
      logs,
      fileCount: report.files.length,
    });
  } catch (err: unknown) {
    console.error("Conversion error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected conversion error occurred." },
      { status: 500 }
    );
  }
}
