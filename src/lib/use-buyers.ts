import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Lightweight buyer list for pickers. */
export function useBuyerOptions() {
  return useQuery({
    queryKey: ["buyers", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("buyers").select("id,name,code,currency").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });
}
