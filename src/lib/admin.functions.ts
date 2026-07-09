import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const listRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const listAllTests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("medical_tests")
      .select("*")
      .order("category", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

const TestUpsertSchema = z.object({
  tests: z.array(
    z.object({
      code: z.string().min(1),
      name_ar: z.string().min(1),
      name_en: z.string().optional().nullable(),
      category: z.string().optional().nullable(),
      description_ar: z.string().optional().nullable(),
      min_age: z.number().int().min(0).max(120),
      max_age: z.number().int().min(0).max(120),
      gender: z.enum(["male", "female", "both"]),
      active: z.boolean().optional().default(true),
    })
  ),
  replaceAll: z.boolean().optional().default(false),
});

export const uploadTests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => TestUpsertSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.replaceAll) {
      await supabaseAdmin.from("medical_tests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }
    const { error } = await supabaseAdmin.from("medical_tests").upsert(data.tests, { onConflict: "code" });
    if (error) throw new Error(error.message);
    return { inserted: data.tests.length };
  });

export const deleteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });