import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Activity, ShieldCheck, ClipboardList, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">منصة بصمة ابتكـار</span>
          </div>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            دخول الـمسؤولين
          </Link>
        </div>
      </header>

            {/* 1. قمنا بإلغاء الهوامش الجانبية والحد الأقصى للعرض من حاوية الـ main */}
      <main className="w-full py-20">
        
        {/* 2. التعديل: تحويل الصندوق ليكون بكامل عرض الصفحة w-full وإزالة الحواف الدائرية الكبيرة لتلتصق بالشاشة */}
        <section 
          className="relative flex flex-col justify-end items-center w-full min-h-[600px] bg-contain bg-no-repeat bg-center shadow-md border-y border-border/15 pb-12"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        >
          
          {/* المحتوى الداخلي (الزر مستقر أسفل المنتصف تماماً) */}
          <div className="relative z-10 w-full flex items-center justify-center">
            <Link
              to="/request"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:bg-primary/90 transition transform hover:scale-105"
            >
              ابــدأ الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </section>

        




        <section className="grid md:grid-cols-3 gap-6 mt-20">
          {[
            { icon: ClipboardList, title: "أدخل بياناتك", desc: "رقم الهوية، تاريخ الميلاد، الجنس ورقم الجوال" },
            { icon: Activity, title: "اختر فحوصاتك", desc: "قائمة ذكية تُبنى تلقائياً حسب فئتك العمرية" },
            { icon: ShieldCheck, title: "أرسل الطلب", desc: "يصل الطلب فورياً للمختصين للمتابعة" },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-accent grid place-items-center mb-4">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 mt-16 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()}  منصة بصمة ابتكار
      </footer>
    </div>
  );
}