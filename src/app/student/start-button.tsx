"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { startApplication } from "./actions";

export function StartApplicationButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-6 flex flex-col items-start gap-4 border-t border-line pt-5">
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
        <Alert tone="bad" role="alert" className="w-full">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
