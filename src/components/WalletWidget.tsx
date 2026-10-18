import { Wallet, TrendingUp } from 'lucide-react';

interface WalletWidgetProps {
  balance: number;
  currency?: string;
}

export function WalletWidget({ balance, currency = 'JOD' }: WalletWidgetProps) {
  return (
    <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl2 p-4 shadow-card-lg text-white overflow-hidden relative animate-scale-in">
      <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
      <div className="absolute -bottom-8 -right-4 w-20 h-20 bg-white/5 rounded-full" />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-white/70">المحفظة</p>
          </div>
          <div className="flex items-center gap-1 text-accent-400">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[10px] font-bold">+5.00 مكافأة</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-tight">{balance.toFixed(2)}</span>
          <span className="text-sm font-medium text-white/60">{currency}</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-white/50">الرصيد المتاح</p>
          <button className="text-[10px] font-bold text-accent-400 hover:text-accent-300 transition-colors">
            سجل المعاملات
          </button>
        </div>
      </div>
    </div>
  );
}
