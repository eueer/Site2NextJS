export const LANDING_PAGE_QUERY = `*[_id == "landingPage"][0]{
  title,
  heroHeading,
  heroHeadingHighlight,
  heroSubtitle,
  aboutBadge,
  aboutHeading,
  aboutCards[]{
    _key,
    metric,
    title,
    description
  },
  architectureBadge,
  architectureHeading,
  architectureSubtitle,
  architectureCards[]{
    _key,
    step,
    title,
    description
  },
  faqBadge,
  faqHeading,
  faqSubtitle,
  faqItems[]{
    _key,
    question,
    answer
  },
  footerTagline,
  copyrightText,
  authorName,
  authorUrl
}`

export interface LandingPageData {
  title?: string
  heroHeading?: string
  heroHeadingHighlight?: string
  heroSubtitle?: string
  aboutBadge?: string
  aboutHeading?: string
  aboutCards?: Array<{
    _key: string
    metric: string
    title: string
    description: string
  }>
  architectureBadge?: string
  architectureHeading?: string
  architectureSubtitle?: string
  architectureCards?: Array<{
    _key: string
    step: string
    title: string
    description: string
  }>
  faqBadge?: string
  faqHeading?: string
  faqSubtitle?: string
  faqItems?: Array<{
    _key: string
    question: string
    answer: string
  }>
  footerTagline?: string
  copyrightText?: string
  authorName?: string
  authorUrl?: string
}
