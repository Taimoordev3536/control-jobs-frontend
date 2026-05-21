"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function RecordsRedirectPage() {
  const router = useRouter();
  const { getUserRole, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const role = getUserRole();
    if (!role) return;
    if (role === "employer") {
      router.replace("/records/employer");
    } else if (role === "client") {
      router.replace("/records/client");
    } else {
      router.replace("/records/worker");
    }
  }, [router, isLoading, getUserRole]);

  return <div>Redirecting to your records...</div>;
}
