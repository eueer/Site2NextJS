"use client";
import type { LandingPageData } from "@/sanity/lib/queries";
import { useConversion } from "@/hooks/use-conversion";
import { getLandingContent } from "@/lib/landing-content";
import { Navigation } from "./site/navigation";
import { ConverterForm } from "./site/converter-form";
import { ConversionResults } from "./site/conversion-results";
import { MarketingSections } from "./site/marketing-sections";
import { HeroBackground } from "./HeroBackground";
export default function HomePageClient({
  initialData,
}: {
  initialData?: LandingPageData | null;
}) {
  const c = useConversion();
  const t = getLandingContent(initialData);
  return (
    <>
      <a className="skip-link" href="#converter">
        Skip to converter
      </a>
      <Navigation />
      <main>
        <section className="hero-section" id="converter">
          <HeroBackground />
          <div className="hero-content">
            <div className="hero-heading">
              <span className="eyebrow">
                <span className="brand-dot" /> From website to codebase
              </span>
              <h1>
                {t.heroHeading}
                <br />
                <span>{t.heroHeadingHighlight}</span>
              </h1>
              <p>{t.heroSubtitle}</p>
            </div>
            {c.conversionData ? (
              <ConversionResults c={c} />
            ) : (
              <ConverterForm c={c} />
            )}
          </div>
        </section>
        <MarketingSections content={t} />
      </main>
    </>
  );
}
