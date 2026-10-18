import { useState, useRef, type ChangeEvent } from 'react';
import {
  Phone,
  Lock,
  User,
  Car,
  Calendar,
  Palette,
  Bus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button, Input, Select } from '@/components/ui';

type DocKey = 'id' | 'license' | 'vehicle_license';

interface FormState {
  full_name: string;
  phone: string;
  password: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_plate: string;
  vehicle_color: string;
  vehicle_type: string;
}

interface RegisterPageProps {
  onNavigateLogin: () => void;
}

const DOC_LABELS: Record<DocKey, string> = {
  id: 'صورة الهوية',
  license: 'صورة رخصة القيادة',
  vehicle_license: 'صورة رخصة المركبة',
};

export function RegisterPage({ onNavigateLogin }: RegisterPageProps) {
  const { navigate } = useAuth();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: '',
    phone: '',
    password: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
    vehicle_color: '',
    vehicle_type: 'sedan',
  });
  const [docs, setDocs] = useState<Record<DocKey, File | null>>({
    id: null,
    license: null,
    vehicle_license: null,
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDocChange = (key: DocKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocs((prev) => ({ ...prev, [key]: file }));
    }
  };

  const canProceedStep1 =
    form.full_name.trim() && form.phone.trim() && form.password.length >= 6;
  const canProceedStep2 =
    form.vehicle_make.trim() &&
    form.vehicle_model.trim() &&
    form.vehicle_year.trim() &&
    form.vehicle_plate.trim() &&
    form.vehicle_color.trim();
  const canSubmit = docs.id && docs.license && docs.vehicle_license;

  const uploadDoc = async (userId: string, key: DocKey, file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${key}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('captain-documents')
      .upload(path, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data, error: urlError } = await supabase.storage
      .from('captain-documents')
      .createSignedUrl(path, 3600 * 24 * 365);
    if (urlError || !data?.signedUrl) throw new Error('Failed to create document URL');
    return data.signedUrl;
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const email = `${form.phone}@citygo.app`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: form.password,
      });

      if (authError) {
        if (authError.message.includes('already')) {
          setError('رقم الهاتف مسجل بالفعل. سجل دخول بدلاً من ذلك');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setError('تعذر إنشاء الحساب');
        setLoading(false);
        return;
      }

      setUploading(true);
      const [idUrl, licenseUrl, vehicleLicenseUrl] = await Promise.all([
        uploadDoc(userId, 'id', docs.id!),
        uploadDoc(userId, 'license', docs.license!),
        uploadDoc(userId, 'vehicle_license', docs.vehicle_license!),
      ]);
      setUploading(false);

      const { error: insertError } = await supabase.from('captains').insert({
        user_id: userId,
        phone: form.phone,
        full_name: form.full_name,
        vehicle_make: form.vehicle_make,
        vehicle_model: form.vehicle_model,
        vehicle_year: parseInt(form.vehicle_year, 10) || null,
        vehicle_plate: form.vehicle_plate,
        vehicle_color: form.vehicle_color,
        vehicle_type: form.vehicle_type,
        id_document_url: idUrl,
        license_document_url: licenseUrl,
        vehicle_license_document_url: vehicleLicenseUrl,
        status: 'pending',
      });

      if (insertError) {
        setError('تم إنشاء الحساب ولكن تعذر حفظ البيانات. حاول تسجيل الدخول');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        navigate('pending');
      }, 2000);
    } catch {
      setError('حدث خطأ أثناء التسجيل. حاول مرة أخرى');
      setLoading(false);
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 font-cairo flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="bg-white rounded-xl3 shadow-card-lg p-8 w-full max-w-sm text-center animate-scale-in">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success-600" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">تم تقديم الطلب بنجاح</h3>
          <p className="text-sm text-neutral-500">يتم مراجعة بياناتك ووثائقك. سيتم إشعارك فور تفعيل حسابك.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-cairo" dir="rtl">
      {/* Header */}
      <div className="safe-top bg-primary-500 text-white px-5 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg font-bold">إنشاء حساب جديد</h1>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                s <= step ? 'bg-white' : 'bg-white/25'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-white/70 mt-2">الخطوة {step} من 3</p>
      </div>

      <div className="px-5 py-6 pb-8">
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl2 p-3 flex items-center gap-2 mb-4 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
            <p className="text-sm text-error-700">{error}</p>
          </div>
        )}

        {/* Step 1: Personal info */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-xl2 shadow-card p-5 space-y-4">
              <SectionTitle icon={<User className="w-5 h-5" />} title="البيانات الشخصية" />

              <Input
                label="الاسم الكامل"
                placeholder="الاسم الثلاثي"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                icon={<User className="w-5 h-5" />}
              />

              <Input
                label="رقم الهاتف"
                type="tel"
                placeholder="05xxxxxxxx"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                icon={<Phone className="w-5 h-5" />}
                inputMode="tel"
              />

              <Input
                label="كلمة المرور"
                type="password"
                placeholder="6 أحرف على الأقل"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                icon={<Lock className="w-5 h-5" />}
              />
            </div>

            <Button
              fullWidth
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
            >
              التالي
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Vehicle details */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-xl2 shadow-card p-5 space-y-4">
              <SectionTitle icon={<Car className="w-5 h-5" />} title="بيانات المركبة" />

              <Input
                label="الماركة"
                placeholder="تويوتا، هيونداي..."
                value={form.vehicle_make}
                onChange={(e) => update('vehicle_make', e.target.value)}
                icon={<Car className="w-5 h-5" />}
              />

              <Input
                label="الموديل"
                placeholder="كامري، إلنترا..."
                value={form.vehicle_model}
                onChange={(e) => update('vehicle_model', e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="سنة الصنع"
                  type="number"
                  placeholder="2020"
                  value={form.vehicle_year}
                  onChange={(e) => update('vehicle_year', e.target.value)}
                  icon={<Calendar className="w-5 h-5" />}
                />

                <Input
                  label="اللون"
                  placeholder="أبيض"
                  value={form.vehicle_color}
                  onChange={(e) => update('vehicle_color', e.target.value)}
                  icon={<Palette className="w-5 h-5" />}
                />
              </div>

              <Input
                label="رقم اللوحة"
                placeholder="أ ب ج 1234"
                value={form.vehicle_plate}
                onChange={(e) => update('vehicle_plate', e.target.value)}
              />

              <Select
                label="نوع المركبة"
                value={form.vehicle_type}
                onChange={(e) => update('vehicle_type', e.target.value)}
                options={[
                  { value: 'sedan', label: 'سيدان' },
                  { value: 'van', label: 'فان' },
                  { value: 'suv', label: 'دفع رباعي' },
                  { value: 'bus', label: 'حافلة' },
                ]}
              />
            </div>

            <Button
              fullWidth
              disabled={!canProceedStep2}
              onClick={() => setStep(3)}
            >
              التالي
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Step 3: Document uploads */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-xl2 shadow-card p-5 space-y-4">
              <SectionTitle icon={<FileText className="w-5 h-5" />} title="رفع الوثائق" />
              <p className="text-xs text-neutral-500 -mt-2">
                صور واضحة لجميع الوثائق المطلوبة
              </p>

              <DocUpload
                label={DOC_LABELS.id}
                file={docs.id}
                onChange={handleDocChange('id')}
              />
              <DocUpload
                label={DOC_LABELS.license}
                file={docs.license}
                onChange={handleDocChange('license')}
              />
              <DocUpload
                label={DOC_LABELS.vehicle_license}
                file={docs.vehicle_license}
                onChange={handleDocChange('vehicle_license')}
              />
            </div>

            {uploading && (
              <div className="bg-secondary-50 border border-secondary-200 rounded-xl2 p-3 flex items-center gap-2 animate-fade-in">
                <Loader2 className="w-5 h-5 text-secondary-500 animate-spin flex-shrink-0" />
                <p className="text-sm text-secondary-700">جاري رفع الوثائق...</p>
              </div>
            )}

            <Button
              fullWidth
              loading={loading}
              disabled={!canSubmit || uploading}
              onClick={handleSubmit}
            >
              {loading ? 'جاري إنشاء الحساب' : 'تقديم الطلب'}
            </Button>

            <button
              onClick={onNavigateLogin}
              className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700 transition-colors py-2"
            >
              لديك حساب؟ تسجيل الدخول
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-500">
        {icon}
      </div>
      <h3 className="text-base font-bold text-neutral-900">{title}</h3>
    </div>
  );
}

function DocUpload({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl2 p-4 flex items-center gap-3 transition-all active:scale-[0.98] ${
          file
            ? 'border-success-300 bg-success-50'
            : 'border-neutral-200 bg-neutral-50 hover:border-primary-300'
        }`}
      >
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            file ? 'bg-success-500 text-white' : 'bg-white text-neutral-400'
          }`}
        >
          {file ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-5 h-5" />}
        </div>
        <div className="flex-1 text-right min-w-0">
          <p className={`text-sm font-bold ${file ? 'text-success-700' : 'text-neutral-700'}`}>
            {label}
          </p>
          <p className="text-xs text-neutral-400 truncate mt-0.5">
            {file ? file.name : 'اضغط لالتقاط صورة أو اختيار ملف'}
          </p>
        </div>
      </button>
    </div>
  );
}
