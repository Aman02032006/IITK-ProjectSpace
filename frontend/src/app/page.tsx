import { Suspense } from "react";
import HomeClient from "./HomeClient";

export default function Home() {
  return (
    <Suspense fallback={<div />}>
      <HomeClient />
    </Suspense>
  );
}
