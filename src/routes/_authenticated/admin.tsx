import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { listRequests, listAllTests, uploadTests, deleteRequest } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Download, Upload, LogOut, Search, Trash2, RefreshCw, FileSpreadsheet, Plus, Edit2, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "لوحة إدارة الطلبات" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"requests" | "tests">("requests");
  const [search, setSearch] = useState("");
  const [testSearch, setTestSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [testForm, setTestForm] = useState({
    code: "", name_ar: "", name_en: "", category: "", description_ar: "", min_age: 0, max_age: 120, gender: "both", active: true
  });

  const fileRef = useRef<HTMLInputElement>(null);

  const fnListReq = useServerFn(listRequests);
  const fnListTests = useServerFn(listAllTests);
  const fnUpload = useServerFn(uploadTests);
  const fnDelete = useServerFn(deleteRequest);

  const requests = useQuery({ queryKey: ["admin-requests"], queryFn: () => fnListReq() });
  const tests = useQuery({ queryKey: ["admin-tests"], queryFn: () => fnListTests(), enabled: tab === "tests" });

  const filtered = useMemo(() => {
    const list = requests.data || [];
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter((r: any) =>
      r.national_id?.includes(s) || r.phone?.includes(s) || r.id?.toLowerCase().includes(s)
    );
  }, [requests.data, search]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function exportRequests() {
    const rows = (requests.data || []).map((r: any) => ({
      "رقم الطلب": r.id,
      "تاريخ الإرسال": new Date(r.created_at).toLocaleString("ar-SA"),
      "رقم الهوية": r.national_id,
      "تاريخ الميلاد": r.birth_date,
      "التقويم": r.calendar_type === "hijri" ? "هجري" : "ميلادي",
      "العمر": r.age_years,
      "الجنس": r.gender === "male" ? "ذكر" : "أنثى",
      "الجوال": r.phone,
      "عدد الفحوصات": (r.selected_tests || []).length,
      "الفحوصات": (r.selected_tests || []).map((t: any) => t.name_ar).join(" | "),
      "ملاحظات": r.notes || "",
      "الحالة": r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الطلبات");
    XLSX.writeFile(wb, `requests-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportTestsTemplate() {
    const sample = [
      { code: "CBC", name_ar: "تعداد الدم الكامل", name_en: "CBC", category: "دم", description_ar: "", min_age: 0, max_age: 120, gender: "both", active: true },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "medical_tests");
    XLSX.writeFile(wb, "tests-template.xlsx");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      const cleaned = rows
        .filter((r) => r.code && r.name_ar)
        .map((r) => ({
          code: String(r.code).trim(),
          name_ar: String(r.name_ar).trim(),
          name_en: r.name_en ? String(r.name_en) : null,
          category: r.category ? String(r.category) : null,
          description_ar: r.description_ar ? String(r.description_ar) : null,
          min_age: Number(r.min_age) || 0,
          max_age: Number(r.max_age) || 120,
          gender: (["male", "female", "both"].includes(String(r.gender)) ? r.gender : "both") as "male" | "female" | "both",
          active: r.active === false ? false : true,
        }));
      if (cleaned.length === 0) {
        toast.error("الملف فارغ أو لا يحتوي على أعمدة صحيحة");
        return;
      }
      const res = await fnUpload({ data: { tests: cleaned, replaceAll: false } });
      toast.success(`تم تحديث/إضافة ${res.inserted} فحص`);
      qc.invalidateQueries({ queryKey: ["admin-tests"] });
      qc.invalidateQueries({ queryKey: ["public-tests"] });
    } catch (err: any) {
      toast.error(err.message || "فشل قراءة الملف");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
    await fnDelete({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
  }
    const openEditModal = (test: any) => {
    setEditingTest(test);
    setTestForm({ ...test, name_en: test.name_en || "", category: test.category || "", description_ar: test.description_ar || "" });
    setIsModalOpen(true);
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const payload = { ...testForm, min_age: Number(testForm.min_age), max_age: Number(testForm.max_age) };
    const { error } = editingTest?.id 
      ? await supabase.from("medical_tests").update(payload).eq("id", editingTest.id)
      : await supabase.from("medical_tests").insert(payload);
    
    if (error) toast.error(error.message);
    else { toast.success("تم حفظ الفحص بنجاح"); setIsModalOpen(false); qc.invalidateQueries({ queryKey: ["admin-tests"] }); }
    setActionLoading(false);
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm("هل تود حذف هذا الفحص نهائياً؟")) return;
    const { error } = await supabase.from("medical_tests").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم الحذف بنجاح"); qc.invalidateQueries({ queryKey: ["admin-tests"] }); }
  };


  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div>
            <Link to="/" className="text-xs text-muted-foreground">← الموقع العام</Link>
            <h1 className="text-xl font-bold">لوحة إدارة الطلبات</h1>
          </div>
          <button onClick={signOut} className="btn-secondary text-sm"><LogOut className="h-4 w-4" /> خروج</button>
        </div>
        <div className="mx-auto max-w-7xl px-6 flex gap-1 border-t border-border">
          {[{ v: "requests", l: "الطلبات" }, { v: "tests", l: "قائمة الفحوصات" }].map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t.v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >{t.l}</button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {tab === "requests" && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="input pr-10"
                  placeholder="بحث برقم الهوية أو الجوال أو رقم الطلب..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button onClick={() => requests.refetch()} className="btn-secondary text-sm"><RefreshCw className="h-4 w-4" /> تحديث</button>
              <button onClick={exportRequests} className="btn-primary text-sm"><Download className="h-4 w-4" /> تصدير Excel</button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="text-right p-3">رقم الطلب</th>
                      <th className="text-right p-3">التاريخ</th>
                      <th className="text-right p-3">الهوية</th>
                      <th className="text-right p-3">الجنس</th>
                      <th className="text-right p-3">العمر</th>
                      <th className="text-right p-3">الجوال</th>
                      <th className="text-right p-3">الفحوصات</th>
                      <th className="text-right p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.isLoading && (
                      <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">جاري التحميل...</td></tr>
                    )}
                    {!requests.isLoading && filtered.length === 0 && (
                      <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد طلبات</td></tr>
                    )}
                    {filtered.map((r: any) => (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                        <td className="p-3">{new Date(r.created_at).toLocaleString("ar-SA")}</td>
                        <td className="p-3">{r.national_id}</td>
                        <td className="p-3">{r.gender === "male" ? "ذكر" : "أنثى"}</td>
                        <td className="p-3">{r.age_years}</td>
                        <td className="p-3" dir="ltr">{r.phone}</td>
                        <td className="p-3">
                          <details>
                            <summary className="cursor-pointer text-primary">{(r.selected_tests || []).length} فحص</summary>
                            <ul className="mt-2 space-y-1 text-xs">
                              {(r.selected_tests || []).map((t: any, i: number) => (
                                <li key={i}>• {t.name_ar}</li>
                              ))}
                            </ul>
                          </details>
                        </td>
                        <td className="p-3">
                          <button onClick={() => onDelete(r.id)} className="text-destructive hover:opacity-70">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tests.data?.filter((t: any) => t.name_ar.includes(testSearch) || t.code.includes(testSearch)).map((t: any) => (
    <tr key={t.id} className="border-t border-border hover:bg-muted/30">
      <td className="p-3 font-mono text-xs">{t.code}</td>
      <td className="p-3">{t.name_ar}</td>
      <td className="p-3 text-xs">{t.category || "عام"}</td>
      <td className="p-3 text-xs">{t.min_age} - {t.max_age} سنة</td>
      <td className="p-3 text-xs">{t.gender === "both" ? "الكل" : t.gender === "male" ? "ذكر" : "أنثى"}</td>
      <td className="p-3 text-center flex justify-center gap-2">
        <button onClick={() => openEditModal(t)} className="text-blue-600 p-1 hover:bg-blue-50 rounded">
        <Edit2 className="h-4 w-4" /></button>
        <button onClick={() => handleDeleteTest(t.id)} className="text-destructive p-1 hover:bg-destructive/5 rounded"><Trash2 className="h-4 w-4" /></button>
      </td>
    </tr>
  ))}
 && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button onClick={exportTestsTemplate} className="btn-secondary text-sm">
                <FileSpreadsheet className="h-4 w-4" /> تحميل قالب Excel
              </button>
              <button onClick={() => fileRef.current?.click()} className="btn-primary text-sm">
                <Upload className="h-4 w-4" /> رفع ملف Excel
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
              <p className="text-xs text-muted-foreground">الأعمدة المطلوبة: code, name_ar, category, min_age, max_age, gender</p>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="text-right p-3">الكود</th>
                      <th className="text-right p-3">الاسم</th>
                      <th className="text-right p-3">الفئة</th>
                      <th className="text-right p-3">العمر</th>
                      <th className="text-right p-3">الجنس</th>
                      <th className="text-right p-3">نشط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tests.data || []).map((t: any) => (
                      <tr key={t.id} className="border-t border-border">
                        <td className="p-3 font-mono text-xs">{t.code}</td>
                        <td className="p-3">{t.name_ar}</td>
                        <td className="p-3">{t.category}</td>
                        <td className="p-3">{t.min_age} - {t.max_age}</td>
                        <td className="p-3">{t.gender === "both" ? "الكل" : t.gender === "male" ? "ذكر" : "أنثى"}</td>
                        <td className="p-3">{t.active ? "✓" : "✗"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      </main>
    </div>
  );
}