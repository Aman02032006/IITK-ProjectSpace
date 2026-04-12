import { Suspense } from "react";
import ProjectPageClient from "./ProjectPage";

export const dynamic = "force-dynamic";

export default function ProjectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectPageClient />
    </Suspense>
  );
}
