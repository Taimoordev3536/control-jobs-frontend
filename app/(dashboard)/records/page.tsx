"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RecordsRedirectPage() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    async function detectRoleAndRedirect() {
      if (!session) return;
      const role = session?.user?.role;
      if (role === "employer") {
        router.replace("/app/(dashboard)/records/employer");
      } else if (role === "client") {
        router.replace("/app/(dashboard)/records/client");
      } else {
        router.replace("/app/(dashboard)/records/worker");
      }
    }
    detectRoleAndRedirect();
  }, [router, session]);

  return <div>Redirecting to your records...</div>;
}
