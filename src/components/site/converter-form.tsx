"use client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { Textarea } from "@/components/arc/textarea/textarea";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import { Accordion } from "@/components/arc/accordion/accordion";
import { NumberField } from "@/components/arc/number-field/number-field";
import { Alert } from "@/components/arc/alert/alert";
import { Card } from "@/components/arc/card/card";
import { Progress } from "@/components/arc/progress/progress";
import type { ConversionController } from "@/hooks/use-conversion";
export function ConverterForm({ c }: { c: ConversionController }) {
  return (
    <div className="converter-stack">
      <form onSubmit={c.handleConvert} className="converter-form">
        <Textarea
          label="Website URL"
          id="website-url"
          placeholder="https://your-website.com"
          value={c.url}
          onChange={(e) => c.setUrl(e.target.value)}
          rows={2}
          disabled={c.loading}
          required
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Checkbox
          id="authorization"
          checked={c.isAuthorized}
          onCheckedChange={(v) => {
            c.setIsAuthorized(v === true);
            if (v === true) c.setShowAuthWarning(false);
          }}
          disabled={c.loading}
          label="I own this website or have permission to convert it."
        />
        {c.showAuthWarning && (
          <Alert tone="warning" title="Authorization required">
            Please confirm that you own this website or have permission from its
            owner before converting.
          </Alert>
        )}
        <Accordion
          defaultOpen={-1}
          items={[
            {
              title: "Advanced settings",
              content: (
                <div className="settings-grid">
                  <NumberField
                    label="Maximum pages"
                    value={Number(c.maxPages)}
                    min={1}
                    max={40}
                    onValueChange={(v) => c.setMaxPages(String(v))}
                    disabled={c.loading}
                    description="1–40 pages · default 15"
                  />
                  <NumberField
                    label="Image quality"
                    value={Number(c.imageQuality)}
                    min={50}
                    max={100}
                    onValueChange={(v) => c.setImageQuality(String(v))}
                    disabled={c.loading}
                    description="50–100 · default 78"
                  />
                </div>
              ),
            },
          ]}
        />
        <Button
          className="convert-action"
          type="submit"
          size="lg"
          loading={c.loading}
          disabled={!c.url.trim() || c.loading}
        >
          {c.loading ? "Converting website" : "Convert to Next.js"}
          <ArrowRight size={18} />
        </Button>
        <p className="form-hint">
          Free to use. Your animations, assets, and routes come with you.
        </p>
      </form>
      {c.error && (
        <Alert tone="danger" title="Conversion failed">
          {c.error}
        </Alert>
      )}
      {c.loading && (
        <Card title="Building your Next.js project" className="loading-card">
          <div className="stack" role="status" aria-live="polite">
            <Progress indeterminate label="Conversion in progress" />
            <p>{c.stepMessage}</p>
            <p className="muted small">
              Estimated activity. The server does not provide live progress
              updates; larger sites may take a few minutes.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
