import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CpData = {
  cp: string;
  municipio: string;
  estado: string;
  estado_clave: string;
  lat: number | null;
  lng: number | null;
};

export function useCpLookup(cp: string) {
  return useQuery<CpData | null>({
    queryKey: ["cp_lookup", cp],
    enabled: cp.length === 5,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from("codigos_postales")
        .select("cp, municipio, estado, estado_clave, lat, lng")
        .eq("cp", cp)
        .maybeSingle();
      return (data as CpData | null) ?? null;
    },
  });
}
