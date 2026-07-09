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
            <span className="font-bold text-lg">منصة الفحوصات الوقائية</span>
          </div>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            دخول المسؤولين
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-6">
            <ShieldCheck className="h-3.5 w-3.5" /> خدمة صحية إلكترونية
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            اعرف فحوصاتك الطبية الموصى بها في دقائق
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            بوابة ذكية تعرض قائمة التحاليل والفحوصات المناسبة لك بناءً على عمرك وجنسك،
            مع إمكانية استثناء ما لا تحتاجه وإرسال الطلب فوراً للمختصين.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/request"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition"
            >
              ابدأ الطلب الآن
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
        © {new Date().getFullYear()} منصة الفحوصات الطبية الوقائية
      </footer>
    </div>
  );
}
