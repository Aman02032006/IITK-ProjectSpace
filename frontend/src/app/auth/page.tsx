import { Suspense } from "react";
import AuthPageClient from "./AuthPage";

export default function AuthPage() {
  return (
    <Suspense fallback={<div />}>
      <AuthPageClient />
    </Suspense>
  );
}
