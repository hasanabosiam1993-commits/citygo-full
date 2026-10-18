import { useEffect, useState } from 'react';
import { Power, Radio } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OnlineToggleProps {
  captainId: string;
  initialOnline: boolean;
}

export function OnlineToggle({ captainId, initialOnline }: OnlineToggleProps) {
  const [isOnline, setIsOnline] = useState(initialOnline);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setIsOnline(initialOnline);
  }, [initialOnline]);

  const toggle = async () => {
    setUpdating(true);
    const newValue = !isOnline;
    setIsOnline(newValue);

    const { error } = await supabase
      .from('captains')
      .update({ is_online: newValue })
      .eq('id', captainId);

    if (error) {
      setIsOnline(!newValue);
    }
    setUpdating(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={updating}
      className={`w-full rounded-xl2 p-4 flex items-center gap-3 transition-all active:scale-[0.98] ${
        isOnline
          ? 'bg-success-500 text-white shadow-card-lg'
          : 'bg-white border-2 border-neutral-200 text-neutral-700'
      }`}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          isOnline ? 'bg-white/20' : 'bg-neutral-100'
        }`}
      >
        <Power className="w-6 h-6" />
      </div>

      <div className="flex-1 text-right">
        <p className={`text-base font-bold ${isOnline ? 'text-white' : 'text-neutral-900'}`}>
          {isOnline ? 'متصل الآن' : 'غير متصل'}
        </p>
        <p className={`text-xs ${isOnline ? 'text-white/80' : 'text-neutral-500'}`}>
          {isOnline ? 'تستقبل الطلبات الفورية' : 'اضغط للاتصال واستقبال الطلبات'}
        </p>
      </div>

      {/* Switch visual */}
      <div
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
          isOnline ? 'bg-white/25' : 'bg-neutral-200'
        }`}
      >
        <div
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${
            isOnline ? 'left-0.5' : 'left-[1.375rem]'
          }`}
        />
      </div>

      {isOnline && (
        <Radio className="w-4 h-4 text-white/70 animate-pulse absolute" style={{ visibility: 'hidden' }} />
      )}
    </button>
  );
}
