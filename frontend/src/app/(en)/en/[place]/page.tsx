import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Invitation } from "@/components/Invitation";
import { placeBySlug, places } from "@/content/places";
import { en } from "@/content/en";
import { pagePath } from "@/lib/routes";

type Props = { params: Promise<{ place: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => places.map((p) => ({ place: p.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { place } = await params;
  return { alternates: { languages: { vi: pagePath("vi", place), en: pagePath("en", place) } } };
}

export default async function Page({ params }: Props) {
  const place = placeBySlug((await params).place);
  if (!place) notFound();
  return <Invitation t={en} place={place} />;
}
