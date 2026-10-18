import { useState } from 'react';
import { Bus, Phone, Lock, AlertCircle, Loader2, Shield, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';

interface AdminLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function AdminLoginPage({ onSuccess, onBack }: AdminLoginProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const email = `${phone}@citygo.app`;
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('بيانات الدخول غير صحيحة');
        setLoading(false);
        return;
      }

      const adminMeta = data.user?.app_metadata?.is_admin === true;
      if (!adminMeta) {
        const { data: captain } = await supabase
          .from('captains')
          .select('is_admin')
          .eq('user_id', data.user?.id)
          .maybeSingle();

        if (!captain?.is_admin) {
          await supabase.auth.signOut();
          setError('هذا الحساب لا يملك صلاحيات الإدارة');
          setLoading(false);
          return;
        }
      }

      onSuccess();
    } catch {
      setError('حدث خطأ غير متوقع. حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-cairo flex flex-col" dir="rtl">
      {/* Header */}
      <div className="safe-top bg-gradient-to-b from-neutral-800 to-neutral-900 text-white px-6 pt-12 pb-20 rounded-b-[2.5rem]">
        <div className="flex flex-col items-center text-center animate-slide-up">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <Shield className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold">CityGo Admin</h1>
          <p className="text-sm text-white/60 mt-1">لوحة تحكم الإدارة</p>
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 px-6 -mt-12 pb-8">
        <div className="bg-white rounded-xl3 shadow-card-lg p-6 animate-slide-up">
          <h2 className="text-xl font-bold text-neutral-900 mb-1">دخول الإدارة</h2>
          <p className="text-sm text-neutral-500 mb-6">أدخل بيانات حساب الإدارة للمتابعة</p>

          {error && (
            <div className="bg-error-50 border border-error-200 rounded-xl2 p-3 flex items-center gap-2 mb-4 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-neutral-700">رقم الهاتف</label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  className="w-full bg-white border-2 rounded-xl2 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-primary-500 border-neutral-200 pr-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-neutral-700">كلمة المرور</label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border-2 rounded-xl2 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:border-primary-500 border-neutral-200 pr-11"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} fullWidth className="!bg-neutral-800 hover:!bg-neutral-900">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              دخول لوحة الإدارة
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-neutral-500 font-medium hover:text-neutral-700 transition-colors mx-auto"
            >
              <ArrowRight className="w-4 h-4" />
              العودة لصفحة الكابتن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
