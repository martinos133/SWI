"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { startApplication } from "./actions";

export function StartApplicationButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-10">
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await startApplication();
            if (result.ok) router.push("/student/ziadost");
            else setError(result.error);
          })
        }
      >
        {pending ? "Načítavam údaje z AIS…" : "Začať vypĺňať žiadosť"}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
