import { Suspense } from "react";
import EditProfilePageClient from "./EditProfilePageClient";

export const dynamic = "force-dynamic";

export default function EditProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProfilePageClient />
    </Suspense>
  );
}
