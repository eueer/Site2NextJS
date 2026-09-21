import { NextRequest, NextResponse } from "next/server";
import { pushToGitHub } from "@/lib/github";
import { getJob } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const { jobId, token, repoName, isPrivate, description, files: incomingFiles, sourceUrl } = await req.json();

    if ((!jobId && !incomingFiles) || !token || !repoName) {
      return NextResponse.json(
        { error: "Missing required fields (token, repoName, or project data)." },
        { status: 400 }
      );
    }

    const report = jobId ? getJob(jobId) : null;
    let files = report?.files;

    if (!files && incomingFiles && Array.isArray(incomingFiles)) {
      files = incomingFiles.map((f: any) => ({
        path: f.path,
        content: f.content,
        binary: f.binaryBase64 ? Buffer.from(f.binaryBase64, "base64") : undefined,
      }));
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Job session has expired. Please reconvert your site below to refresh files and push." },
        { status: 404 }
      );
    }

    const siteSource = report?.sourceUrl || sourceUrl || "site";
    const result = await pushToGitHub({
      token: token.trim(),
      repoName: repoName.trim(),
      isPrivate: Boolean(isPrivate),
      description: description || `Next.js site converted from ${siteSource} with Site2NextJS`,
      files,
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
