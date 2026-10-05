"use client";
import { Download, Check, RotateCcw } from "lucide-react";
import { Card } from "@/components/arc/card/card";
import { Button } from "@/components/arc/button/button";
import { Badge } from "@/components/arc/badge/badge";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { ScrollArea } from "@/components/arc/scroll-area/scroll-area";
import { CodeBlock } from "@/components/arc/code-block/code-block";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import { Accordion } from "@/components/arc/accordion/accordion";
import { GithubExportDialog } from "./github-export-dialog";
import type { ConversionController } from "@/hooks/use-conversion";
function bytes(n: number) {
  return n >= 1048576
    ? `${(n / 1048576).toFixed(1)} MB`
    : n >= 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${n} B`;
}
export function ConversionResults({ c }: { c: ConversionController }) {
  const d = c.conversionData;
  if (!d) return null;
  return (
    <div className="results-stack">
      <Card
        title="Your Next.js project is ready"
        description={d.sourceUrl}
        className="result-card"
        action={
          <Badge tone="success" icon={<Check size={14} />}>
            Complete
          </Badge>
        }
      >
        <div className="stack result-body">
          <div className="action-row">
            <Button onClick={c.handleDownload}>
              <Download size={18} />
              Download ZIP
            </Button>
            <GithubExportDialog c={c} />
            <Button variant="ghost" onClick={c.handleReset}>
              <RotateCcw size={16} />
              Convert another
            </Button>
          </div>
          <div className="stats-grid">
            <div>
              <strong>{d.pages.length}</strong>
              <span>Pages converted</span>
            </div>
            <div>
              <strong>{d.fileCount}</strong>
              <span>Project files</span>
            </div>
            {d.stats.map((s) => (
              <div key={s.label}>
                <strong>
                  {s.unit === "bytes"
                    ? bytes(s.after)
                    : `${s.after}${s.unit === "ms" ? " ms" : ""}`}
                </strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          {d.notes.length > 0 && (
            <ul className="notes">
              {d.notes.map((n, i) => (
                <li key={i}>
                  <Check size={16} aria-hidden="true" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      <Card
        title="Live preview"
        className="preview-card"
        action={
          <SegmentedControl
            label="Preview size"
            value={c.previewDevice}
            onValueChange={(v) =>
              c.setPreviewDevice(v as typeof c.previewDevice)
            }
            options={[
              { value: "desktop", label: "Desktop" },
              { value: "tablet", label: "Tablet" },
              { value: "mobile", label: "Mobile" },
            ]}
          />
        }
      >
        <div className="preview-stage">
          <iframe
            title="Converted website preview"
            sandbox="allow-scripts"
            src={d.previewHtml ? undefined : `/api/preview/${d.jobId}`}
            srcDoc={d.previewHtml || undefined}
            style={{
              width:
                c.previewDevice === "desktop"
                  ? "100%"
                  : c.previewDevice === "tablet"
                    ? 768
                    : 375,
            }}
          />
        </div>
      </Card>
      <div className="result-details">
        <Card title="Converted routes">
          <ScrollArea label="Converted routes" maxHeight={240}>
            <ul className="routes">
              {d.pages.map((p) => (
                <li key={p.route}>
                  <code>{p.route}</code>
                  <span title={p.url}>{p.url}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Card>
        <Card title="Run locally">
          <div className="stack">
            <p className="muted">
              Unzip the project, open its folder, and run:
            </p>
            <CodeBlock
              filename="Terminal"
              language="bash"
              code={"npm install\nnpm run dev"}
            />
            <CopyButton
              className="command-copy"
              value="npm install && npm run dev"
              label="Copy commands"
            />
          </div>
        </Card>
      </div>
      {d.logs?.length > 0 && (
        <Accordion
          defaultOpen={-1}
          items={[
            {
              title: "Conversion logs",
              content: (
                <CodeBlock
                  filename="Conversion log"
                  language="text"
                  code={d.logs.join("\n")}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
