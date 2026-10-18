import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  Wallet,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Banknote,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import type { Withdrawal } from '@/types';

interface WithdrawalPageProps {
  onBack: () => void;
}

const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function WithdrawalPage({ onBack }: WithdrawalPageProps) {
  const { captain, refreshCaptain } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const today = new Date();
  const dow = today.getDay();
  const isAllowedDay = dow === 1 || dow === 4;
  const todayName = WEEKDAY_NAMES[dow];

  const balance = captain?.wallet_balance ?? 0;
  const maxWithdrawable = Math.max(0, balance - 5.0);

  const fetchWithdrawals = useCallback(async () => {
    if (!captain?.id) return;
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('captain_id', captain.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setWithdrawals(data as Withdrawal[]);
    }
    setLoadingHistory(false);
  }, [captain?.id]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleSubmit = async () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt < 5) {
      setError('الحد الأدنى للسحب هو 5.00 دينار');
      return;
    }
    if (amt > maxWithdrawable) {
      setError(`الحد الأقصى المتاح للسحب هو ${maxWithdrawable.toFixed(2)} دينار (مع الحفاظ على 5 دينار رصيد أساسي)`);
      return;
    }

    setLoading(true);
    const { error: rpcError } = await supabase.rpc('request_withdrawal', { p_amount: amt });

    if (rpcError) {
      let msg = 'تعذر تقديم طلب السحب';
      if (rpcError.message.includes('Mondays and Thursdays')) {
        msg = 'السحب متاح يومي الإثنين والخميس فقط';
      } else if (rpcError.message.includes('Minimum')) {
        msg = 'الحد الأدنى للسحب هو 5.00 دينار';
      } else if (rpcError.message.includes('minimum balance')) {
        msg = 'يجب الحفاظ على رصيد أساسي 5.00 دينار';
      } else if (rpcError.message.includes('pending')) {
        msg = 'لديك طلب سحب قيد المعالجة بالفعل';
      }
      setError(msg);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    refreshCaptain();
    fetchWithdrawals();
    setTimeout(() => {
      setSuccess(false);
      setAmount('');
    }, 2500);
  };

  if (!captain) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 font-cairo flex flex-col items-center justify-center px-6" dir="rtl">
        <div className="bg-white rounded-xl3 shadow-card-lg p-8 w-full max-w-sm text-center animate-scale-in">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success-600" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">تم تقديم الطلب</h3>
          <p className="text-sm text-neutral-500">سيتم مراجعة طلب السحب ومعالجته من قبل الإدارة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-cairo" dir="rtl">
      <div className="safe-top bg-primary-500 text-white px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">سحب الرصيد</h1>
        </div>
      </div>

      <div className="px-5 py-6 space-y-4">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl2 p-5 text-white shadow-card-lg relative overflow-hidden animate-scale-in">
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-white/70">رصيد المحفظة</p>
            </div>
            <span className="text-3xl font-bold tracking-tight">{balance.toFixed(2)}</span>
            <span className="text-sm font-medium text-white/60 mr-2">JOD</span>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[10px] text-white/50">المتاح للسحب: {maxWithdrawable.toFixed(2)} JOD</p>
            </div>
          </div>
        </div>

        {/* Day restriction banner */}
        <div className={`rounded-xl2 p-4 flex items-center gap-3 animate-fade-in ${
          isAllowedDay ? 'bg-success-50 border border-success-200' : 'bg-warning-50 border border-warning-200'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isAllowedDay ? 'bg-success-500 text-white' : 'bg-warning-500 text-white'
          }`}>
            {isAllowedDay ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <p className={`text-sm font-bold ${isAllowedDay ? 'text-success-700' : 'text-warning-700'}`}>
              {isAllowedDay ? `السحب متاح اليوم (${todayName})` : `السحب غير متاح اليوم (${todayName})`}
            </p>
            <p className={`text-xs ${isAllowedDay ? 'text-success-600' : 'text-warning-600'}`}>
              السحب متاح يومي الإثنين والخميس فقط
            </p>
          </div>
        </div>

        {/* Rules info */}
        <div className="bg-white rounded-xl2 shadow-card p-4 space-y-2.5 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="w-4 h-4 text-primary-500" />
            <p className="text-sm font-bold text-neutral-900">شروط السحب</p>
          </div>
          <RuleRow text="الحد الأدنى للسحب: 5.00 دينار" />
          <RuleRow text="يجب الحفاظ على رصيد أساسي 5.00 دينار" />
          <RuleRow text="السحب متاح يومي الإثنين والخميس" />
          <RuleRow text="طلب واحد قيد المعالجة في كل مرة" />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl2 p-3 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
            <p className="text-sm text-error-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl2 shadow-card p-5 space-y-4 animate-fade-in">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-neutral-700">مبلغ السحب</label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!isAllowedDay}
                className="w-full bg-white border-2 border-neutral-200 rounded-xl2 px-4 py-3.5 text-2xl font-bold text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500 transition-colors text-center disabled:opacity-50"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">JOD</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 20].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(String(val))}
                disabled={!isAllowedDay || val > maxWithdrawable}
                className="bg-neutral-50 border-2 border-neutral-200 rounded-xl py-2 text-sm font-bold text-neutral-700 hover:border-primary-300 transition-colors disabled:opacity-40 active:scale-95"
              >
                {val} JOD
              </button>
            ))}
          </div>

          <Button
            fullWidth
            loading={loading}
            disabled={!isAllowedDay || !amount || parseFloat(amount) < 5}
            onClick={handleSubmit}
          >
            {loading ? 'جاري التقديم...' : 'طلب السحب'}
          </Button>
        </div>

        {/* History */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-neutral-700">سجل طلبات السحب</p>
          {loadingHistory ? (
            <div className="bg-white rounded-xl2 shadow-card p-6 text-center">
              <Loader2 className="w-5 h-5 text-neutral-300 animate-spin mx-auto" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="bg-white rounded-xl2 shadow-card p-6 text-center">
              <p className="text-sm text-neutral-400">لا توجد طلبات سحب سابقة</p>
            </div>
          ) : (
            withdrawals.map((w) => (
              <WithdrawalRow key={w.id} withdrawal={w} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RuleRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 bg-primary-50 rounded flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary-500" />
      </div>
      <p className="text-xs text-neutral-600">{text}</p>
    </div>
  );
}

function WithdrawalRow({ withdrawal }: { withdrawal: Withdrawal }) {
  const statusConfig = {
    pending: { label: 'قيد المراجعة', icon: <Clock className="w-4 h-4" />, bg: 'bg-accent-50 text-accent-700' },
    approved: { label: 'تمت الموافقة', icon: <CheckCircle2 className="w-4 h-4" />, bg: 'bg-success-50 text-success-700' },
    rejected: { label: 'مرفوض', icon: <XCircle className="w-4 h-4" />, bg: 'bg-error-50 text-error-700' },
    completed: { label: 'مكتمل', icon: <CheckCircle2 className="w-4 h-4" />, bg: 'bg-success-50 text-success-700' },
  };

  const config = statusConfig[withdrawal.status] || statusConfig.pending;

  return (
    <div className="bg-white rounded-xl2 shadow-card p-4 flex items-center justify-between animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-bold text-neutral-900">{withdrawal.amount.toFixed(2)}</span>
          <span className="text-xs text-neutral-400">JOD</span>
        </div>
        <p className="text-[10px] text-neutral-400">
          {new Date(withdrawal.created_at).toLocaleDateString('ar')}
        </p>
        {withdrawal.admin_note && (
          <p className="text-[10px] text-neutral-500 mt-1">{withdrawal.admin_note}</p>
        )}
      </div>
      <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${config.bg}`}>
        {config.icon}
        {config.label}
      </span>
    </div>
  );
}
