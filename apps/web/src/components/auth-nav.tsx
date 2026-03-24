"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SignOutButton } from "@/components/signout-button";

type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; email: string };

export function AuthNav() {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [signInHref, setSignInHref] = useState("/signin");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.authenticated && data?.subscriber?.email) {
          setState({ status: "authed", email: data.subscriber.email });
        } else {
          setState({ status: "anon" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "anon" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Avoid Next navigation hooks here so this component can be used
    // on prerendered pages without requiring a Suspense boundary.
    const currentPath = `${window.location.pathname}${window.location.search}`;
    setSignInHref(`/signin?next=${encodeURIComponent(currentPath)}`);
  }, []);

  if (state.status === "authed") {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-sm opacity-90">
          {state.email}
        </span>
        <SignOutButton />
      </div>
    );
  }

  return (
    <Link href={signInHref} className="text-sm hover:underline">
      Sign in
    </Link>
  );
}
