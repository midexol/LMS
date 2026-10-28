import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isValidInstructorKey } from "@/lib/instructorLink";
import { InstructorJoinForm } from "./InstructorJoinForm";

// A private page: kept out of search results, and it does not exist for anyone without the key
export const metadata: Metadata = {
  title: "Instructor sign-up - Academia",
  robots: { index: false, follow: false },
};

export default function InstructorJoinPage({ searchParams }: { searchParams: { key?: string | string[] } }) {
  const key = Array.isArray(searchParams.key) ? searchParams.key[0] : searchParams.key;
  if (!isValidInstructorKey(key)) notFound();
  return <InstructorJoinForm accessKey={key as string} />;
}
