import { Suspense } from "react";
import EditProfilePageClient from "./EditProfilePage";

export const dynamic = "force-dynamic";

export default function EditProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditProfilePageClient />
    </Suspense>
  );
}
