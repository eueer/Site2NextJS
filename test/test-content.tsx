import assert from "node:assert/strict";
import { getLandingContent } from "../src/lib/landing-content";
import type { LandingPageData } from "../src/sanity/lib/queries";
const fallback = getLandingContent(null);
assert.equal(fallback.heroHeading, "Convert any website to");
assert.equal(fallback.faqList.length, 5);
assert.equal(fallback.architectureCards.length, 3);
const cms = {
  heroHeading: "CMS hero",
  heroHeadingHighlight: "CMS highlight",
  heroSubtitle: "CMS intro",
  aboutCards: [
    {
      _key: "cms-about",
      title: "CMS card",
      metric: "42",
      description: "CMS body",
    },
  ],
  architectureCards: [
    {
      _key: "cms-step",
      step: "07",
      title: "CMS architecture",
      description: "CMS details",
    },
  ],
  faqItems: [{ _key: "cms-faq", question: "CMS FAQ", answer: "CMS answer" }],
  footerTagline: "CMS footer",
  authorName: "CMS author",
  authorUrl: "https://example.com",
} as LandingPageData;
const actual = getLandingContent(cms);
assert.equal(actual.heroHeading, cms.heroHeading);
assert.deepEqual(actual.aboutCards, cms.aboutCards);
assert.deepEqual(actual.architectureCards, cms.architectureCards);
assert.equal(actual.faqList[0].a, "CMS answer");
assert.equal(actual.authorUrl, cms.authorUrl);
assert.equal(
  getLandingContent({ ...cms, aboutCards: [] }).aboutCards.length,
  3,
);
console.log("Sanity content and fallback checks passed");
