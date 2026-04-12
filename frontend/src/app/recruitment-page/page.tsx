import { Suspense } from "react";
import RecruitmentPageClient from "./RecruitmentPage";

export const dynamic = "force-dynamic";

export default function RecruitmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecruitmentPageClient />
    </Suspense>
  );
}
