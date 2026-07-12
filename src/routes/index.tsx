import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Activity, ShieldCheck, ClipboardList, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      <header className="border-b border-border/20 bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">منصة بصمة ابتكـار</span>
          </div>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            دخول الـمسؤلين
          </Link>
        </div>
      </header>

      <main className="w-full  h-full pt-0 pb-5">
        {/* التعديل: تغيير bg-contain إلى bg-cover لتمتد الصورة بالكامل، وزيادة الارتفاع إلى min-h-[450px] أو ما يناسب أبعاد صورتك الأصلية */}
        <section 
          className="relative flex justify-center items-center w-full h-screen bg-contain bg-no-repeat bg-center shadow-md border-y border-border/15"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        >
          {/* تم ضبط موقع الزرار ليتناسب مع أبعاد الخلفية الممتدة */}
          <div className="absolute inset-x-0 bottom-[40%] flex justify-center items-start">
            <Link
              to="/request"
              className="inline-flex items-center justify-center gap-2 w-[200px] h-[60px] rounded-lg bg-transparent border-none text-foreground font-semibold shadow-lg shadow-primary/15 hover:bg-primary/15 transition transform hover:scale-105"
            >
             
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mt-20 max-w-6xl mx-auto px-6">
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
        © {new Date().getFullYear()} منصة بصمة ابتكار
      </footer>
    </div>
  );
}
