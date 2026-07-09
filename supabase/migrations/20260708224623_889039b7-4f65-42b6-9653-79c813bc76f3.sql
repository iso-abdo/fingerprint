
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users_read_own_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Auto-grant admin to a configured email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('isoemo79@gmai.com', 'isoemo79@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Medical tests catalog
CREATE TABLE public.medical_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  description_ar TEXT,
  min_age INT NOT NULL DEFAULT 0,
  max_age INT NOT NULL DEFAULT 120,
  gender TEXT NOT NULL DEFAULT 'both' CHECK (gender IN ('male','female','both')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.medical_tests TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medical_tests TO authenticated;
GRANT ALL ON public.medical_tests TO service_role;
ALTER TABLE public.medical_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tests_public_read" ON public.medical_tests FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tests_admin_write" ON public.medical_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Requests
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id TEXT NOT NULL,
  birth_date DATE NOT NULL,
  calendar_type TEXT NOT NULL DEFAULT 'gregorian' CHECK (calendar_type IN ('gregorian','hijri')),
  gender TEXT NOT NULL CHECK (gender IN ('male','female')),
  phone TEXT NOT NULL,
  age_years INT NOT NULL,
  selected_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  excluded_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests_public_insert" ON public.requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "requests_admin_read" ON public.requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "requests_admin_update" ON public.requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "requests_admin_delete" ON public.requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Seed default catalog
INSERT INTO public.medical_tests (code, name_ar, name_en, category, description_ar, min_age, max_age, gender) VALUES
('CBC','تعداد الدم الكامل','Complete Blood Count','دم','فحص شامل لخلايا الدم',0,120,'both'),
('FBS','سكر صائم','Fasting Blood Sugar','سكري','قياس مستوى السكر في الدم',18,120,'both'),
('HBA1C','السكر التراكمي','HbA1c','سكري','متوسط السكر لثلاثة أشهر',30,120,'both'),
('LIPID','ملف الدهون','Lipid Profile','قلب','كوليسترول وترايجليسرايد',30,120,'both'),
('BP','ضغط الدم','Blood Pressure','قلب','قياس ضغط الدم',18,120,'both'),
('ECG','تخطيط القلب','Electrocardiogram','قلب','رسم كهربائي للقلب',40,120,'both'),
('TSH','هرمون الغدة الدرقية','TSH','غدد','وظيفة الغدة الدرقية',18,120,'both'),
('VITD','فيتامين د','Vitamin D','فيتامينات','مستوى فيتامين د',10,120,'both'),
('VITB12','فيتامين ب12','Vitamin B12','فيتامينات','مستوى فيتامين ب12',18,120,'both'),
('FERR','مخزون الحديد','Ferritin','دم','مخزون الحديد في الجسم',12,120,'both'),
('LFT','وظائف الكبد','Liver Function Tests','كبد','إنزيمات ووظائف الكبد',18,120,'both'),
('KFT','وظائف الكلى','Kidney Function Tests','كلى','كرياتينين ويوريا',30,120,'both'),
('URIC','حمض اليوريك','Uric Acid','مفاصل','فحص حمض اليوريك',30,120,'both'),
('URINE','تحليل البول','Urinalysis','بول','فحص عام للبول',0,120,'both'),
('PSA','مستضد البروستاتا','PSA','رجال','فحص البروستاتا',45,120,'male'),
('TESTO','هرمون التستوستيرون','Testosterone','رجال','هرمون الذكورة',18,120,'male'),
('MAMMO','الماموغرام','Mammogram','نساء','فحص الثدي بالأشعة',40,120,'female'),
('PAP','فحص عنق الرحم','Pap Smear','نساء','مسحة عنق الرحم',21,65,'female'),
('IRON_W','الحديد للنساء','Iron Panel (Women)','نساء','فحص الحديد للنساء',15,50,'female'),
('BMD','كثافة العظام','Bone Density','عظام','فحص هشاشة العظام',50,120,'both'),
('COLON','تنظير القولون','Colonoscopy Screening','هضمي','فحص سرطان القولون',45,75,'both'),
('EYE','فحص النظر','Eye Exam','عيون','فحص شامل للعين',40,120,'both'),
('DENTAL','فحص الأسنان','Dental Checkup','أسنان','فحص دوري للأسنان',6,120,'both'),
('BMI','مؤشر كتلة الجسم','BMI','عام','قياس الوزن والطول',6,120,'both'),
('HIV','فحص الفيروسات','HIV Screening','عام','فحوصات فيروسية',18,65,'both');
