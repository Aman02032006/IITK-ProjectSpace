import { Suspense } from "react";
import HomePageClient from "./HomePageClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense fallback={<div />}>
      <HomePageClient />
    </Suspense>
  );
}
