import { Suspense } from "react";
import SearchPageClient from "./SearchPage";

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageClient />
    </Suspense>
  );
}
