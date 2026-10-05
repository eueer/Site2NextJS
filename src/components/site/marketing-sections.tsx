import { Card } from "@/components/arc/card/card";
import { Badge } from "@/components/arc/badge/badge";
import { Accordion } from "@/components/arc/accordion/accordion";
import type { LandingContent } from "@/lib/landing-content";
export function MarketingSections({ content: t }: { content: LandingContent }) {
  return (
    <>
      <section id="about" className="content-section">
        <div className="section-heading">
          <Badge>{t.aboutBadge}</Badge>
          <h2>{t.aboutHeading}</h2>
        </div>
        <div className="marketing-grid">
          {t.aboutCards.map((c) => (
            <Card
              key={c._key}
              title={c.title}
              description={c.description}
              media={<div className="card-metric">{c.metric}</div>}
            />
          ))}
        </div>
      </section>
      <section id="how-it-works" className="content-section architecture">
        <div className="section-heading">
          <Badge>{t.architectureBadge}</Badge>
          <h2>{t.architectureHeading}</h2>
          <p>{t.architectureSubtitle}</p>
        </div>
        <div className="marketing-grid">
          {t.architectureCards.map((c) => (
            <Card
              key={c._key}
              title={c.title}
              description={c.description}
              media={<div className="step-number">{c.step}</div>}
            />
          ))}
        </div>
      </section>
      <section id="faq" className="content-section faq-section">
        <div className="section-heading">
          <Badge>{t.faqBadge}</Badge>
          <h2>{t.faqHeading}</h2>
          <p>{t.faqSubtitle}</p>
        </div>
        <Accordion
          size="lg"
          defaultOpen={0}
          items={t.faqList.map((f) => ({
            title: f.q,
            content: <p className="faq-answer">{f.a}</p>,
          }))}
        />
      </section>
      <footer className="site-footer">
        <div>
          <a className="brand" href="#converter">
            Site2NextJS
          </a>
          <p>{t.footerTagline}</p>
        </div>
        <p>
          {t.copyrightText} ·{" "}
          <a href={t.authorUrl} target="_blank" rel="noopener noreferrer">
            {t.authorName}
          </a>
        </p>
      </footer>
    </>
  );
}
