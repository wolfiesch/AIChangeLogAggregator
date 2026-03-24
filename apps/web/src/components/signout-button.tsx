"use client";

import { useTransition } from "react";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  const signOut = () => {
    startTransition(async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        window.location.href = "/";
      }
    });
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isPending}
      className="text-sm opacity-90 hover:underline disabled:opacity-50"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
