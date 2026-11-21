import { en } from "@/content/en";
import { icsResponse, placeParams } from "@/lib/icsRoute";

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = placeParams;

export const GET = (_: Request, { params }: { params: Promise<{ place: string }> }) => icsResponse(en, params);
