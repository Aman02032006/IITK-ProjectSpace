import { Suspense } from "react";
import EditRecruitmentPageClient from "./EditRecruitmentPageClient";

export default function EditRecruitmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditRecruitmentPageClient />
    </Suspense>
  );
}
