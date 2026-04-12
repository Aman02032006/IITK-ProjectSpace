import { Suspense } from "react";
import ProfilePageClient from "./ProfilePage";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading profile data...</div>}>
      <ProfilePageClient />
    </Suspense>
  );
}
