import { Suspense } from "react";
import RecruitmentPageClient from "./RecruitmentPageClient";

export const dynamic = "force-dynamic";

export default function RecruitmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecruitmentPageClient />
    </Suspense>
  );
}
