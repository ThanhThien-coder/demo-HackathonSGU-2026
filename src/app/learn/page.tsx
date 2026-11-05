import { Suspense } from "react";
import { LearnShell } from "@/components/learn/LearnShell";

export default function LearnPage() {
  return <Suspense fallback={null}><LearnShell /></Suspense>;
}
