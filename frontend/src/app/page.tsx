import { Suspense } from "react";
import HomeClient from "./home";

export default function Home() {
  return (
    <Suspense fallback={<div />}>
      <HomeClient />
    </Suspense>
  );
}
