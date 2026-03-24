"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Star } from "lucide-react";

interface FollowButtonProps {
  productId: number;
  initialFollowing: boolean;
  variant?: "default" | "compact";
}

export function FollowButton({
  productId,
  initialFollowing,
  variant = "default",
}: FollowButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);

  const toggle = () => {
    startTransition(async () => {
      try {
        const response = await fetch(
          following ? `/api/follows?productId=${productId}` : "/api/follows",
          {
            method: following ? "DELETE" : "POST",
            headers: following
              ? undefined
              : {
                  "Content-Type": "application/json",
                },
            body: following ? undefined : JSON.stringify({ productId }),
          }
        );

        if (response.status === 401) {
          const query = searchParams.toString();
          const currentPath = `${pathname}${query ? `?${query}` : ""}`;
          router.push(
            `/signin?next=${encodeURIComponent(currentPath)}&followProductId=${productId}`
          );
          return;
        }

        if (!response.ok) {
          return;
        }

        setFollowing(!following);
      } catch {
        // noop
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={
        variant === "compact"
          ? "inline-flex items-center justify-center w-7 h-7 rounded border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          : "inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      }
      title={following ? "Unfollow" : "Follow"}
      aria-label={following ? "Unfollow" : "Follow"}
    >
      <Star
        className={
          following
            ? "w-3.5 h-3.5 text-primary fill-primary"
            : "w-3.5 h-3.5 text-muted-foreground"
        }
      />
      {variant === "default" && <span>{following ? "Following" : "Follow"}</span>}
    </button>
  );
}
