import { Suspense } from "react";
import PostCreationFormClient from "./PostCreationForm";

export default function PostCreationFormPage() {
  return (
    <Suspense fallback={<div />}>
      <PostCreationFormClient />
    </Suspense>
  );
}
