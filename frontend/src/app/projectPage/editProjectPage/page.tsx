import { Suspense } from "react";
import EditProjectPageClient from "./EditProjectPageClient";

export const dynamic = "force-dynamic";

export default function EditProjectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProjectPageClient />
    </Suspense>
  );
}
