import { sanityFetch } from "@/sanity/lib/client";
import { LANDING_PAGE_QUERY, LandingPageData } from "@/sanity/lib/queries";
import HomePageClient from "@/components/HomePageClient";

export const revalidate = 60;

export default async function Home() {
  const data = await sanityFetch<LandingPageData>({
    query: LANDING_PAGE_QUERY,
    revalidate: 60,
  }).catch(() => null);

  return <HomePageClient initialData={data} />;
}
