import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/roles";

export function useMe() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  return useQuery({
    queryKey: ["me", user.id],
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      return {
        id: user.id,
        name: profile?.full_name ?? user.email ?? "User",
        email: profile?.email ?? user.email ?? "",
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
  });
}
