import { Octokit } from "@octokit/rest";
import { ProjectFile } from "./types";

interface PushOptions {
  token: string;
  repoName: string;
  isPrivate?: boolean;
  description?: string;
  files: ProjectFile[];
}

export async function pushToGitHub({
  token,
  repoName,
  isPrivate = false,
  description = "Converted from Framer with Framer2NextJS",
  files,
}: PushOptions): Promise<{ repoUrl: string; owner: string; name: string }> {
  const octokit = new Octokit({ auth: token });

  // Get authenticated user
  const { data: user } = await octokit.users.getAuthenticated();
  const owner = user.login;

  // Create repository if it doesn't exist
  let repoExists = false;
  try {
    await octokit.repos.get({ owner, repo: repoName });
    repoExists = true;
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
      repoExists = false;
    } else {
      throw err;
    }
  }

  if (!repoExists) {
    await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: isPrivate,
      description,
      auto_init: true,
    });
    // Brief pause to allow git repo initialization
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Get default branch reference
  let defaultBranch = "main";
  let parentCommitSha: string | undefined;

  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
    defaultBranch = repoData.default_branch || "main";
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${defaultBranch}`,
    });
    parentCommitSha = refData.object.sha;
  } catch {
    // If empty repo without ref
  }

  // Upload blobs
  const treeItems: Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }> = [];

  for (const file of files) {
    let blobSha: string;
    if (typeof file.content === "string") {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo: repoName,
        content: Buffer.from(file.content).toString("base64"),
        encoding: "base64",
      });
      blobSha = blob.sha;
    } else if (file.binary) {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo: repoName,
        content: file.binary.toString("base64"),
        encoding: "base64",
      });
      blobSha = blob.sha;
    } else {
      continue;
    }

    treeItems.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blobSha,
    });
  }

  // Create tree
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo: repoName,
    base_tree: parentCommitSha,
    tree: treeItems,
  });

  // Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo: repoName,
    message: "Initial export from Framer via Framer2NextJS 🚀",
    tree: tree.sha,
    parents: parentCommitSha ? [parentCommitSha] : [],
  });

  // Update branch reference
  try {
    await octokit.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${defaultBranch}`,
      sha: commit.sha,
      force: true,
    });
  } catch {
    await octokit.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${defaultBranch}`,
      sha: commit.sha,
    });
  }

  return {
    repoUrl: `https://github.com/${owner}/${repoName}`,
    owner,
    name: repoName,
  };
}
