import { useState } from 'react';
import { Phone, Lock, Bus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';

interface LoginProps {
  onNavigateRegister: () => void;
}

export function LoginPage({ onNavigateRegister }: LoginProps) {
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          setError('رقم الهاتف أو كلمة المرور غير صحيحة');
        } else {
          setError('تعذر تسجيل الدخول. تحقق من الاتصال بالإنترنت');
        }
      }
    } catch {
      setError('حدث خطأ غير متوقع. حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-cairo flex flex-col" dir="rtl">
      {/* Hero header */}
      <div className="safe-top bg-gradient-to-b from-primary-500 to-primary-600 text-white px-6 pt-12 pb-20 rounded-b-[2.5rem]">
        <div className="flex flex-col items-center text-center animate-slide-up">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <Bus className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold">CityGo</h1>
          <p className="text-sm text-white/70 mt-1">سيتي جو - منصة إدارة الكابتن</p>
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 px-6 -mt-12 pb-8">
        <div className="bg-white rounded-xl3 shadow-card-lg p-6 animate-slide-up">
          <h2 className="text-xl font-bold text-neutral-900 mb-1">تسجيل الدخول</h2>
          <p className="text-sm text-neutral-500 mb-6">أدخل بياناتك للوصول إلى حسابك</p>

          {error && (
            <div className="bg-error-50 border border-error-200 rounded-xl2 p-3 flex items-center gap-2 mb-4 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="رقم الهاتف"
              type="tel"
              placeholder="05xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="w-5 h-5" />}
              required
              inputMode="tel"
            />

            <Input
              label="كلمة المرور"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-5 h-5" />}
              required
            />

            <Button type="submit" loading={loading} fullWidth>
              دخول
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
            <p className="text-sm text-neutral-500">
              ليس لديك حساب؟{' '}
              <button
                onClick={onNavigateRegister}
                className="text-primary-500 font-bold hover:text-primary-600 transition-colors"
              >
                إنشاء حساب جديد
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
