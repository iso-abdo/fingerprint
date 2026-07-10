import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const RequestSchema = z.object({
  national_id: z.string().min(8).max(15),
  birth_date: z.string(),
  calendar_type: z.enum(["gregorian", "hijri"]),
  gender: z.enum(["male", "female"]),
  phone: z.string().min(8).max(20),
  age_years: z.number().int().min(0).max(120),
  selected_tests: z.array(z.object({ id: z.string(), name_ar: z.string(), code: z.string().nullable().optional() })),
  excluded_tests: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
});

export const submitRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RequestSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("requests")
      .insert({
        national_id: data.national_id,
        birth_date: data.birth_date,
        calendar_type: data.calendar_type,
        gender: data.gender,
        phone: data.phone,
        age_years: data.age_years,
        selected_tests: data.selected_tests,
        excluded_tests: data.excluded_tests,
        notes: data.notes ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, created_at: row.created_at };
  });

export const getPublicTests = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  
  const { data, error } = await supabase
    .from("medical_tests")
    .select("id, code, name_ar, name_en, category, description_ar, min_age, max_age, gender")
    .eq("active", true)
    .order("category", { ascending: true });
    
  if (error) throw new Error(error.message);
  return data;
});
