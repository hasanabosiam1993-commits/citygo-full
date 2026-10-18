import { Clock, CheckCircle2, XCircle, LogOut, RefreshCw, Bus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';

export function PendingPage() {
  const { captain, signOut } = useAuth();

  const isPending = captain?.status === 'pending';
  const isSuspended = captain?.status === 'suspended';
  const isInactive = captain?.status === 'inactive';

  const config = isPending
    ? {
        icon: <Clock className="w-12 h-12" />,
        iconBg: 'bg-accent-100 text-accent-600',
        title: 'طلبك قيد المراجعة',
        message: 'تم استلام طلبك بنجاح. يتم مراجعة بياناتك ووثائقك من قبل الإدارة. سيتم إشعارك فور الموافقة على حسابك وتفعيله.',
      }
    : isSuspended
    ? {
        icon: <XCircle className="w-12 h-12" />,
        iconBg: 'bg-error-100 text-error-600',
        title: 'تم إيقاف حسابك',
        message: 'تم إيقاف حسابك مؤقتاً. يرجى التواصل مع الإدارة لمزيد من المعلومات.',
      }
    : {
        icon: <XCircle className="w-12 h-12" />,
        iconBg: 'bg-neutral-200 text-neutral-600',
        title: 'الحساب غير نشط',
        message: 'حسابك غير نشط حالياً. يرجى التواصل مع الإدارة لإعادة التفعيل.',
      };

  return (
    <div className="min-h-screen bg-neutral-50 font-cairo flex flex-col items-center justify-center px-6 py-8" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-slide-up">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mb-3">
            <Bus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-lg font-bold text-neutral-900">CityGo</h1>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-xl3 shadow-card-lg p-6 text-center animate-scale-in">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${config.iconBg}`}
          >
            {config.icon}
          </div>

          <h2 className="text-xl font-bold text-neutral-900 mb-2">{config.title}</h2>
          <p className="text-sm text-neutral-500 leading-relaxed">{config.message}</p>

          {isPending && (
            <div className="mt-5 pt-5 border-t border-neutral-100">
              <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
                <Clock className="w-4 h-4" />
                <span>وقت التقديم: {captain ? new Date(captain.created_at).toLocaleDateString('ar-SA') : ''}</span>
              </div>
            </div>
          )}
        </div>

        {/* Info list */}
        {isPending && (
          <div className="mt-4 space-y-2.5 animate-fade-in">
            <InfoRow text="مراجعة البيانات الشخصية" />
            <InfoRow text="التحقق من الوثائق المرفقة" />
            <InfoRow text="اعتماد الحساب وتعيين الرقم الوظيفي" />
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            variant="outline"
            fullWidth
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
            تحديث الحالة
          </Button>

          <Button
            variant="primary"
            fullWidth
            onClick={signOut}
            className="!bg-error-500 hover:!bg-error-600 active:!bg-error-700"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-400 mt-6">
          CityGo © ٢٠٢٦ - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-xl2 shadow-card p-3 flex items-center gap-3">
      <div className="w-7 h-7 bg-accent-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-accent-500" />
      </div>
      <p className="text-sm text-neutral-600">{text}</p>
    </div>
  );
}
