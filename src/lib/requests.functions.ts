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

    // Attempt email notification (best-effort; requires email domain setup).
    try {
      const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
      const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "isoemo79@gmai.com";
      if (LOVABLE_API_KEY) {
        const html = `
          <div dir="rtl" style="font-family:Arial,sans-serif;padding:16px">
            <h2>طلب فحوصات طبية جديد</h2>
            <p><b>رقم الهوية:</b> ${data.national_id}</p>
            <p><b>تاريخ الميلاد:</b> ${data.birth_date} (${data.calendar_type === "hijri" ? "هجري" : "ميلادي"})</p>
            <p><b>العمر:</b> ${data.age_years} سنة</p>
            <p><b>الجنس:</b> ${data.gender === "male" ? "ذكر" : "أنثى"}</p>
            <p><b>الجوال:</b> ${data.phone}</p>
            <h3>الفحوصات المطلوبة:</h3>
            <ul>${data.selected_tests.map((t) => `<li>${t.name_ar}</li>`).join("")}</ul>
            ${data.notes ? `<p><b>ملاحظات:</b> ${data.notes}</p>` : ""}
          </div>`;
        await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Preventive Health <onboarding@resend.dev>",
            to: [ADMIN_EMAIL],
            subject: `طلب فحوصات جديد #${row.id.slice(0, 8)}`,
            html,
          }),
        }).catch(() => {});
        await supabaseAdmin.from("requests").update({ email_sent: true }).eq("id", row.id);
      }
    } catch (e) {
      console.warn("Email notification skipped:", e);
    }

    return { id: row.id, created_at: row.created_at };
  });

export const getPublicTests = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
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