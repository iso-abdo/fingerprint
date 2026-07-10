import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicTests, submitRequest } from "@/lib/requests.functions";
import { hijriToGregorian, calculateAge } from "@/lib/hijri";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/request")({
  head: () => ({ meta: [{ title: "طلب فحوصات طبية" }] }),
  component: RequestPage,
});

type PersonalData = {
  national_id: string;
  gender: "male" | "female" | "";
  phone: string;
  calendar_type: "gregorian" | "hijri";
  birth_year: string;
  birth_month: string;
  birth_day: string;
};

function RequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [personal, setPersonal] = useState<PersonalData>({
    national_id: "",
    gender: "",
    phone: "",
    calendar_type: "gregorian",
    birth_year: "",
    birth_month: "",
    birth_day: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);

  const fetchTests = useServerFn(getPublicTests);
  const submit = useServerFn(submitRequest);
  
  const { data: allTests = [] } = useQuery({
    queryKey: ["public-tests"],
    queryFn: () => fetchTests(),
  });

  const birthDate = useMemo(() => {
    const y = parseInt(personal.birth_year);
    const m = parseInt(personal.birth_month);
    const d = parseInt(personal.birth_day);
    if (!y || !m || !d) return null;
    if (personal.calendar_type === "hijri") return hijriToGregorian(y, m, d);
    return new Date(y, m - 1, d);
  }, [personal]);

  const age = useMemo(() => (birthDate ? calculateAge(birthDate) : null), [birthDate]);

  // تم تحسين منطق التصفية هنا لضمان مطابقة أرقام السن وتجنب سقوط قيمة both
  const applicableTests = useMemo(() => {
    if (age == null || !personal.gender) return [];
    return allTests.filter((t) => {
      const min = Number(t.min_age);
      const max = Number(t.max_age);
      const matchesAge = age >= min && age <= max;
      const matchesGender = t.gender === "both" || t.gender === personal.gender;
      return matchesAge && matchesGender;
    });
  }, [allTests, age, personal.gender]);

  // تم تحديث الـ useEffect ليعمل فقط عندما يتم تحميل الفحوصات لأول مرة بنجاح لمنع تصفير اللائحة
  useEffect(() => {
    if (applicableTests.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(applicableTests.map((t) => t.id)));
    }
  }, [applicableTests]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof applicableTests> = {};
    for (const t of applicableTests) {
      const c = t.category || "عام";
      (map[c] = map[c] || []).push(t);
    }
    return map;
  }, [applicableTests]);

  const canProceed1 =
    personal.national_id.length >= 8 &&
    personal.gender &&
    personal.phone.length >= 8 &&
    birthDate &&
    age != null &&
    age >= 0 &&
    age <= 120;

  async function handleSubmit() {
    if (!birthDate || !age || !personal.gender) return;
    setSubmitting(true);
    try {
      const selected = applicableTests.filter((t) => selectedIds.has(t.id));
      const excluded = applicableTests.filter((t) => !selectedIds.has(t.id)).map((t) => t.id);
      const res = await submit({
        data: {
          national_id: personal.national_id,
          birth_date: birthDate.toISOString().slice(0, 10),
          calendar_type: personal.calendar_type,
          gender: personal.gender,
          phone: personal.phone,
          age_years: age,
          selected_tests: selected.map((t) => ({ id: t.id, name_ar: t.name_ar, code: t.code })),
          excluded_tests: excluded,
          notes: notes || null,
        },
      });
      setConfirmationId(res.id);
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "تعذر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  }

  const toggleTest = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold">منصـة بصـمـة ابتكـار</Link>
          <div className="flex items-center gap-2 text-sm">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-8 w-8 rounded-full grid place-items-center font-semibold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {step === 1 && (
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <h1 className="text-2xl font-bold">البيانات الشخصية</h1>
            <p className="text-sm text-muted-foreground mt-1">أدخل معلوماتك بدقة لتحديد الفحوصات المناسبة.</p>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <Field label="رقم الهوية / الإقامة">
                <input
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background"
                  value={personal.national_id}
                  onChange={(e) => setPersonal({ ...personal, national_id: e.target.value.replace(/\D/g, "") })}
                  placeholder="1xxxxxxxxx"
                  inputMode="numeric"
                />
              </Field>
              <Field label="رقم الجوال">
                <input
                  className="w-full rounded-lg border border-border px-3 py-2 bg-background"
                  value={personal.phone}
                  onChange={(e) => setPersonal({ ...personal, phone: e.target.value.replace(/[^\d+]/g, "") })}
                  placeholder="05xxxxxxxx"
                  inputMode="tel"
                />
              </Field>
              <Field label="الجنس">
                <div className="flex gap-2">
                  {[{ v: "male", l: "ذكر" }, { v: "female", l: "أنثى" }].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => setPersonal({ ...personal, gender: g.v as any })}
                      className={`flex-1 rounded-lg border px-4 py-2 font-medium transition ${personal.gender === g.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}
                    >{g.l}</button>
                  ))}
                </div>
              </Field>
              <Field label="نوع التقويم">
                <div className="flex gap-2">
                  {[{ v: "gregorian", l: "ميلادي" }, { v: "hijri", l: "هجري" }].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => setPersonal({ ...personal, calendar_type: g.v as any })}
                      className={`flex-1 rounded-lg border px-4 py-2 font-medium transition ${personal.calendar_type === g.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}
                    >{g.l}</button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <Field label={`تاريخ الميلاد (${personal.calendar_type === "hijri" ? "هجري" : "ميلادي"})`}>
                <div className="grid grid-cols-3 gap-2">
                  <input className="w-full rounded-lg border border-border px-3 py-2 bg-background" placeholder="اليوم" value={personal.birth_day} onChange={(e) => setPersonal({ ...personal, birth_day: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
                  <input className="w-full rounded-lg border border-border px-3 py-2 bg-background" placeholder="الشهر" value={personal.birth_month} onChange={(e) => setPersonal({ ...personal, birth_month: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
                  <input className="w-full rounded-lg border border-border px-3 py-2 bg-background" placeholder="السنة" value={personal.birth_year} onChange={(e) => setPersonal({ ...personal, birth_year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                </div>
                {age != null && age >= 0 && (
                  <p className="text-sm text-muted-foreground mt-2">العمر المحسوب: <b>{age}</b> سنة</p>
                )}
              </Field>
            </div>

            <div className="flex justify-end mt-8">
              <button
                type="button"
                disabled={!canProceed1}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
              >
                التالي <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <h1 className="text-2xl font-bold">الفحوصات الموصى بها</h1>
            <p className="text-sm text-muted-foreground mt-1">بناءً على العمر ({age} سنة) والجنس ({personal.gender === "male" ? "ذكر" : "أنثى"})، تم اختيار الفحوصات التالية تلقائياً.</p>

            {applicableTests.length === 0 ? (

              <p className="text-muted-foreground mt-6">لا توجد فحوصات مطابقة حالياً.</p>
            ) : (
              <div className="mt-6 space-y-6">
                {Object.entries(grouped).map(([cat, tests]) => (
                  <div key={cat}>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">{cat}</h3>
                    <div className="grid md:grid-cols-2 gap-2">
                      {tests.map((t) => {
                        const checked = selectedIds.has(t.id);
                        return (
                          <label key={t.id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${checked ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const s = new Set(selectedIds);
                                if (checked) s.delete(t.id); else s.add(t.id);
                                setSelectedIds(s);
                              }}
                              className="mt-1 h-4 w-4 accent-[oklch(0.52_0.14_195)]"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{t.name_ar}</div>
                              {t.description_ar && <div className="text-xs text-muted-foreground">{t.description_ar}</div>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Field label="ملاحظات (اختياري)">
              <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي معلومات إضافية..." />
            </Field>

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(1)} className="btn-secondary">
                <ArrowRight className="h-4 w-4" /> السابق
              </button>
              <button
                disabled={submitting || selectedIds.size === 0}
                onClick={handleSubmit}
                className="btn-primary"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                إرسال الطلب ({selectedIds.size} فحص)
              </button>
            </div>
          </section>
        )}

        {step === 3 && confirmationId && (
          <section className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-sm text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 grid place-items-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">تم إرسال طلبك بنجاح</h1>
            <p className="text-muted-foreground mt-2">رقم الطلب: <span className="font-mono">{confirmationId.slice(0, 8).toUpperCase()}</span></p>
            <p className="text-sm text-muted-foreground mt-4">
              تم استلام طلبك وسيتم التواصل معك خلال أقرب وقت. تم إشعار المسؤولين تلقائياً بتفاصيل طلبك.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <Link to="/" className="btn-secondary">العودة للرئيسية</Link>
              <button onClick={() => { setStep(1); setConfirmationId(null); setPersonal({ national_id: "", gender: "", phone: "", calendar_type: "gregorian", birth_year: "", birth_month: "", birth_day: "" }); setNotes(""); }} className="btn-primary">طلب جديد</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 mt-4">
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}