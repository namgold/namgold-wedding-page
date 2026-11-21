import type { Lang } from "@/content/data";

/** Vietnamese lives at /<slug>, English at /en/<slug>. There is no page at / or /en: no page may link to another place. */
export const pagePath = (lang: Lang, slug: string): string => (lang === "vi" ? `/${slug}` : `/en/${slug}`);

export const otherLangOf = (lang: Lang): Lang => (lang === "vi" ? "en" : "vi");
