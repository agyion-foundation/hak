import { Suspense } from "react";
import AppShell from "../components/app/AppShell";

export default function AppPage() {
  return (
    <Suspense>
      <AppShell />
    </Suspense>
  );
}
