"use client";
import { useRef } from "react";
import { Github } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from "@/components/arc/dialog/dialog";
import { PasswordField } from "@/components/arc/password-field/password-field";
import { Input } from "@/components/arc/input/input";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import { Alert } from "@/components/arc/alert/alert";
import type { ConversionController } from "@/hooks/use-conversion";
export function GithubExportDialog({ c }: { c: ConversionController }) {
  const tokenInput = useRef<HTMLInputElement>(null);
  return (
    <Dialog open={c.showGitModal} onOpenChange={c.setShowGitModal}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Github size={18} />
          Push to GitHub
        </Button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          tokenInput.current?.focus();
        }}
        title="Push to GitHub"
        description="Create a repository with your converted Next.js project."
      >
        <form onSubmit={c.handlePushToGithub} className="stack">
          <PasswordField
            ref={tokenInput}
            label="GitHub personal access token"
            value={c.githubToken}
            onChange={(e) => c.setGithubToken(e.target.value)}
            autoComplete="off"
            required
            disabled={c.gitPushing}
            description="Requires repo scope. Kept in memory only; never saved to your browser."
          />
          <div className="align-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={c.gitPushing || !c.githubToken}
              onClick={() => c.setGithubToken("")}
            >
              Clear Token
            </Button>
          </div>
          <Input
            label="Repository name"
            value={c.repoName}
            onChange={(e) => c.setRepoName(e.target.value)}
            required
            disabled={c.gitPushing}
            pattern="[a-zA-Z0-9._-]+"
          />
          <Checkbox
            label="Private repository"
            checked={c.isPrivate}
            onCheckedChange={(v) => c.setIsPrivate(v === true)}
            disabled={c.gitPushing}
          />
          {c.gitError && (
            <Alert tone="danger" title="Export failed">
              {c.gitError}
            </Alert>
          )}
          {c.gitSuccessUrl && (
            <Alert tone="success" title="Repository created">
              <a
                href={c.gitSuccessUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open your repository ↗
              </a>
            </Alert>
          )}
          <Button
            type="submit"
            loading={c.gitPushing}
            disabled={
              !c.githubToken.trim() || !c.repoName.trim() || c.gitPushing
            }
          >
            {c.gitPushing ? "Pushing project" : "Create repository & push"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
