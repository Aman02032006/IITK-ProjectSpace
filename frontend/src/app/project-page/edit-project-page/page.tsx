import { Suspense } from "react";
import EditProjectPageClient from "./EditProjectPage";

export const dynamic = "force-dynamic";

export default function EditProjectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProjectPageClient />
    </Suspense>
  );
}
