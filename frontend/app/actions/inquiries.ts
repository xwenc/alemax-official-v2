"use server";
import { headers } from "next/headers";
import { processInquiry, type SubmissionResult } from "@/lib/inquiry-mail";
export async function sendInquiry(input: unknown): Promise<SubmissionResult> {
  const h = await headers();
  return processInquiry(input, {
    origin: h.get("origin"),
    host: h.get("host"),
    fetchSite: h.get("sec-fetch-site"),
  });
}
