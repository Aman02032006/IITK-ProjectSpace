import { Suspense } from "react";
import EditRecruitmentPageClient from "./EditRecruitmentPage";

export default function EditRecruitmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditRecruitmentPageClient />
    </Suspense>
  );
}
