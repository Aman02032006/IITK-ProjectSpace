import { Suspense } from "react";
import PostCreationFormClient from "./PostCreationFormClient";

export default function PostCreationFormPage() {
  return (
    <Suspense fallback={<div />}>
      <PostCreationFormClient />
    </Suspense>
  );
}
