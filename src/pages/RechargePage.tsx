import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import {
  ArrowRight,
  Wallet,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import type { Recharge } from '@/types';

interface RechargePageProps {
  onBack: () => void;
}

export function RechargePage({ onBack }: RechargePageProps) {
  const { captain, refreshCaptain } = useAuth();
  const [amount, setAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [recharges, setRecharges] = useState<Recharge[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];

  const balance = captain?.wallet_balance ?? 0;

  const fetchRecharges = useCallback(async () => {
    if (!captain?.id) return;
    const { data, error } = await supabase
      .from('recharges')
      .select('*')
      .eq('captain_id', captain.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecharges(data as Recharge[]);
    }
    setLoadingHistory(false);
  }, [captain?.id]);

  useEffect(() => {
    fetchRecharges();
  }, [fetchRecharges]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setReceiptFile(file);
  };

  const handleSubmit = async () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('أدخل مبلغاً صحيحاً');
      return;
    }
    if (!receiptFile) {
      setError('يرجى رفع صورة الإيصال');
      return;
    }

    setLoading(true);

    try {
      setUploading(true);
      const ext = receiptFile.name.split('.').pop() || 'jpg';
      const path = `${captain!.phone}/receipt-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('recharge-receipts')
        .upload(path, receiptFile, { contentType: receiptFile.type });

      if (uploadError) throw uploadError;

      const { data: urlData, error: urlError } = await supabase.storage
        .from('recharge-receipts')
        .createSignedUrl(path, 3600 * 24 * 365);

      if (urlError || !urlData?.signedUrl) throw new Error('Failed to create URL');
      setUploading(false);

      const { error: insertError } = await supabase.from('recharges').insert({
        captain_id: captain!.id,
        amount: amt,
        receipt_url: urlData.signedUrl,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setLoading(false);
      refreshCaptain();
      fetchRecharges();
      setTimeout(() => {
        setSuccess(false);
        setAmount('');
        setReceiptFile(null);
      }, 2500);
    } catch {
      setError('تعذر تقديم طلب الشحن. حاول مرة أخرى');
      setLoading(false);
      setUploading(false);
    }
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
          <p className="text-sm text-neutral-500">سيتم مراجعة إيصال الشحن واعتماده من الإدارة</p>
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
          <h1 className="text-lg font-bold">شحن المحفظة</h1>
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
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-accent-50 border border-accent-200 rounded-xl2 p-4 animate-fade-in">
          <p className="text-xs text-accent-800 font-medium leading-relaxed">
            1. حوّل المبلغ إلى حساب الشركة
            <br />
            2. ارفع صورة الإيصال أدناه
            <br />
            3. سيتم اعتماد الشحن خلال 24 ساعة
          </p>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl2 p-3 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
            <p className="text-sm text-error-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl2 shadow-card p-5 space-y-4 animate-fade-in">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-neutral-700">مبلغ الشحن</label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white border-2 border-neutral-200 rounded-xl2 px-4 py-3.5 text-2xl font-bold text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500 transition-colors text-center"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">JOD</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 20].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(String(val))}
                className="bg-neutral-50 border-2 border-neutral-200 rounded-xl py-2 text-sm font-bold text-neutral-700 hover:border-primary-300 transition-colors active:scale-95"
              >
                {val} JOD
              </button>
            ))}
          </div>

          {/* Receipt upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-neutral-700">صورة الإيصال</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
                input?.click();
              }}
              className={`w-full border-2 border-dashed rounded-xl2 p-4 flex items-center gap-3 transition-all active:scale-[0.98] ${
                receiptFile
                  ? 'border-success-300 bg-success-50'
                  : 'border-neutral-200 bg-neutral-50 hover:border-primary-300'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                receiptFile ? 'bg-success-500 text-white' : 'bg-white text-neutral-400'
              }`}>
                {receiptFile ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className={`text-sm font-bold ${receiptFile ? 'text-success-700' : 'text-neutral-700'}`}>
                  {receiptFile ? 'تم اختيار الإيصال' : 'ارفع صورة الإيصال'}
                </p>
                <p className="text-xs text-neutral-400 truncate mt-0.5">
                  {receiptFile ? receiptFile.name : 'اضغط لالتقاط صورة أو اختيار ملف'}
                </p>
              </div>
            </button>
          </div>

          {uploading && (
            <div className="bg-secondary-50 border border-secondary-200 rounded-xl2 p-3 flex items-center gap-2 animate-fade-in">
              <Loader2 className="w-5 h-5 text-secondary-500 animate-spin flex-shrink-0" />
              <p className="text-sm text-secondary-700">جاري رفع الإيصال...</p>
            </div>
          )}

          <Button
            fullWidth
            loading={loading}
            disabled={!amount || parseFloat(amount) <= 0 || !receiptFile || uploading}
            onClick={handleSubmit}
          >
            {loading ? 'جاري التقديم...' : 'طلب الشحن'}
          </Button>
        </div>

        {/* History */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-neutral-700">سجل طلبات الشحن</p>
          {loadingHistory ? (
            <div className="bg-white rounded-xl2 shadow-card p-6 text-center">
              <Loader2 className="w-5 h-5 text-neutral-300 animate-spin mx-auto" />
            </div>
          ) : recharges.length === 0 ? (
            <div className="bg-white rounded-xl2 shadow-card p-6 text-center">
              <p className="text-sm text-neutral-400">لا توجد طلبات شحن سابقة</p>
            </div>
          ) : (
            recharges.map((r) => (
              <RechargeRow key={r.id} recharge={r} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RechargeRow({ recharge }: { recharge: Recharge }) {
  const statusConfig = {
    pending: { label: 'قيد المراجعة', icon: <Clock className="w-4 h-4" />, bg: 'bg-accent-50 text-accent-700' },
    approved: { label: 'تم الاعتماد', icon: <CheckCircle2 className="w-4 h-4" />, bg: 'bg-success-50 text-success-700' },
    rejected: { label: 'مرفوض', icon: <XCircle className="w-4 h-4" />, bg: 'bg-error-50 text-error-700' },
  };

  const config = statusConfig[recharge.status] || statusConfig.pending;

  return (
    <div className="bg-white rounded-xl2 shadow-card p-4 flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-primary-500" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg font-bold text-neutral-900">{recharge.amount.toFixed(2)}</span>
            <span className="text-xs text-neutral-400">JOD</span>
          </div>
          <p className="text-[10px] text-neutral-400">
            {new Date(recharge.created_at).toLocaleDateString('ar')}
          </p>
        </div>
      </div>
      <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${config.bg}`}>
        {config.icon}
        {config.label}
      </span>
    </div>
  );
}
