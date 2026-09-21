import { NextRequest, NextResponse } from "next/server";
import { pushToGitHub } from "@/lib/github";
import { getJob } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const { jobId, token, repoName, isPrivate, description } = await req.json();

    if (!jobId || !token || !repoName) {
      return NextResponse.json(
        { error: "Missing required fields (jobId, token, or repoName)." },
        { status: 400 }
      );
    }

    const report = getJob(jobId);
    if (!report) {
      return NextResponse.json(
        { error: "Job has expired. Please convert your Framer site again." },
        { status: 404 }
      );
    }

    const result = await pushToGitHub({
      token: token.trim(),
      repoName: repoName.trim(),
      isPrivate: Boolean(isPrivate),
      description: description || `Next.js site converted from ${report.sourceUrl} with Framer2NextJS`,
      files: report.files,
    });

    return NextResponse.json({
      success: true,
      repoUrl: result.repoUrl,
      owner: result.owner,
      name: result.name,
    });
  } catch (err: unknown) {
    console.error("GitHub push error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to push repository to GitHub." },
      { status: 500 }
    );
  }
}
