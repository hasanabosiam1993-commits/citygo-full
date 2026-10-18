import { useState, useEffect, useCallback } from 'react';
import {
  Bus,
  LogOut,
  UserCheck,
  Users,
  Wallet,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Loader2,
  BadgeCheck,
  Ban,
  FileText,
  Banknote,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import type { Captain, Trip, RechargeWithCaptain, WithdrawalWithCaptain, SupportConversationWithDetails } from '@/types';

type AdminTab = 'captains' | 'moderation' | 'recharges' | 'withdrawals' | 'support';

export function AdminDashboardPage() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('captains');
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  const fetchPendingCounts = useCallback(async () => {
    const [captainsCount, rechargesCount, withdrawalsCount, supportCount] = await Promise.all([
      supabase.from('captains').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('recharges').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('support_conversations').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);
    setPendingCounts({
      captains: captainsCount.count || 0,
      recharges: rechargesCount.count || 0,
      withdrawals: withdrawalsCount.count || 0,
      support: supportCount.count || 0,
    });
  }, []);

  useEffect(() => {
    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 15000);
    return () => clearInterval(interval);
  }, [fetchPendingCounts]);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'captains', label: 'الكباتن', icon: <Users className="w-4 h-4" />, badge: pendingCounts.captains },
    { id: 'moderation', label: 'الرحلات', icon: <FileText className="w-4 h-4" /> },
    { id: 'recharges', label: 'الشحن', icon: <Wallet className="w-4 h-4" />, badge: pendingCounts.recharges },
    { id: 'withdrawals', label: 'السحب', icon: <Banknote className="w-4 h-4" />, badge: pendingCounts.withdrawals },
    { id: 'support', label: 'الدعم', icon: <MessageSquare className="w-4 h-4" />, badge: pendingCounts.support },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-cairo pb-8" dir="rtl">
      {/* Header */}
      <header className="safe-top bg-gradient-to-b from-neutral-800 to-neutral-900 text-white">
        <div className="px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">CityGo Admin</h1>
                <p className="text-xs text-white/60 leading-tight">لوحة تحكم الإدارة</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="px-5 -mt-2 mb-4">
        <div className="bg-white rounded-xl2 shadow-card p-1.5 flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-accent-100 text-accent-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5">
        {activeTab === 'captains' && <CaptainsSection onAction={fetchPendingCounts} />}
        {activeTab === 'moderation' && <ModerationSection />}
        {activeTab === 'recharges' && <RechargesSection onAction={fetchPendingCounts} />}
        {activeTab === 'withdrawals' && <WithdrawalsSection onAction={fetchPendingCounts} />}
        {activeTab === 'support' && <AdminSupportSection />}
      </div>
    </div>
  );
}

// ============================================
// Captains section
// ============================================
function CaptainsSection({ onAction }: { onAction?: () => void }) {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'active' | 'suspended' | 'all'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [employeeIds, setEmployeeIds] = useState<Record<string, string>>({});

  const fetchCaptains = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('captains').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    const { data, error } = await query;
    if (!error && data) {
      setCaptains(data as Captain[]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchCaptains();
  }, [fetchCaptains]);

  const handleApprove = async (captainId: string) => {
    const empId = employeeIds[captainId]?.trim() || `CG-${Date.now().toString().slice(-6)}`;
    setActionLoading(captainId);
    const { error } = await supabase.rpc('approve_captain', {
      p_captain_id: captainId,
      p_employee_id: empId,
    });
    if (!error) {
      setCaptains((prev) => prev.filter((c) => c.id !== captainId));
      onAction?.();
    }
    setActionLoading(null);
  };

  const handleSuspend = async (captainId: string) => {
    setActionLoading(captainId);
    const { error } = await supabase.rpc('suspend_captain', { p_captain_id: captainId });
    if (!error) {
      setCaptains((prev) => prev.filter((c) => c.id !== captainId));
      onAction?.();
    }
    setActionLoading(null);
  };

  const filters: { id: typeof filter; label: string }[] = [
    { id: 'pending', label: 'قيد المراجعة' },
    { id: 'active', label: 'نشط' },
    { id: 'suspended', label: 'موقوف' },
    { id: 'all', label: 'الكل' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === f.id ? 'bg-primary-500 text-white' : 'bg-white text-neutral-500 border border-neutral-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {captains.length === 0 ? (
        <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
          <Users className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">لا يوجد كباتن في هذه الفئة</p>
        </div>
      ) : (
        captains.map((c) => (
          <CaptainCard
            key={c.id}
            captain={c}
            actionLoading={actionLoading === c.id}
            employeeId={employeeIds[c.id] || ''}
            onEmployeeIdChange={(val) => setEmployeeIds((prev) => ({ ...prev, [c.id]: val }))}
            onApprove={() => handleApprove(c.id)}
            onSuspend={() => handleSuspend(c.id)}
          />
        ))
      )}
    </div>
  );
}

function CaptainCard({
  captain,
  actionLoading,
  employeeId,
  onEmployeeIdChange,
  onApprove,
  onSuspend,
}: {
  captain: Captain;
  actionLoading: boolean;
  employeeId: string;
  onEmployeeIdChange: (val: string) => void;
  onApprove: () => void;
  onSuspend: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    pending: 'bg-accent-50 text-accent-700',
    active: 'bg-success-50 text-success-700',
    suspended: 'bg-error-50 text-error-700',
    inactive: 'bg-neutral-100 text-neutral-600',
  };

  const statusLabels: Record<string, string> = {
    pending: 'قيد المراجعة',
    active: 'نشط',
    suspended: 'موقوف',
    inactive: 'غير نشط',
  };

  return (
    <div className="bg-white rounded-xl2 shadow-card overflow-hidden animate-fade-in">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neutral-900 truncate">{captain.full_name || captain.phone}</p>
            <p className="text-xs text-neutral-400" dir="ltr">{captain.phone}</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[captain.status]}`}>
            {statusLabels[captain.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-neutral-50 rounded-lg p-2">
            <p className="text-neutral-400 text-[10px]">المركبة</p>
            <p className="text-neutral-700 font-semibold truncate">
              {captain.vehicle_make} {captain.vehicle_model}
            </p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-2">
            <p className="text-neutral-400 text-[10px]">اللوحة</p>
            <p className="text-neutral-700 font-semibold">{captain.vehicle_plate || '-'}</p>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 animate-fade-in">
            {captain.employee_id && (
              <div className="flex items-center gap-2 text-xs">
                <BadgeCheck className="w-4 h-4 text-primary-500" />
                <span className="text-neutral-600">الرقم الوظيفي: {captain.employee_id}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {captain.id_document_url && (
                <a href={captain.id_document_url} target="_blank" rel="noopener noreferrer" className="bg-primary-50 rounded-lg p-2 flex flex-col items-center gap-1 text-[10px] font-semibold text-primary-600 hover:bg-primary-100 transition-colors">
                  <FileText className="w-4 h-4" />
                  الهوية
                </a>
              )}
              {captain.license_document_url && (
                <a href={captain.license_document_url} target="_blank" rel="noopener noreferrer" className="bg-primary-50 rounded-lg p-2 flex flex-col items-center gap-1 text-[10px] font-semibold text-primary-600 hover:bg-primary-100 transition-colors">
                  <FileText className="w-4 h-4" />
                  الرخصة
                </a>
              )}
              {captain.vehicle_license_document_url && (
                <a href={captain.vehicle_license_document_url} target="_blank" rel="noopener noreferrer" className="bg-primary-50 rounded-lg p-2 flex flex-col items-center gap-1 text-[10px] font-semibold text-primary-600 hover:bg-primary-100 transition-colors">
                  <FileText className="w-4 h-4" />
                  رخصة المركبة
                </a>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-xs text-neutral-500 font-semibold py-2 mt-2 hover:text-neutral-700 transition-colors"
        >
          {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل والوثائق'}
        </button>

        {captain.status === 'pending' && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100">
            <input
              type="text"
              placeholder="الرقم الوظيفي (اختياري)"
              value={employeeId}
              onChange={(e) => onEmployeeIdChange(e.target.value)}
              className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={onApprove}
              disabled={actionLoading}
              className="flex items-center gap-1.5 bg-success-500 text-white rounded-xl px-3 py-2 text-xs font-bold hover:bg-success-600 transition-colors active:scale-95 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              اعتماد
            </button>
          </div>
        )}

        {captain.status === 'active' && (
          <button
            onClick={onSuspend}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-1.5 bg-error-50 text-error-500 rounded-xl py-2 text-xs font-bold hover:bg-error-100 transition-colors active:scale-95 disabled:opacity-50 mt-2 pt-2 border-t border-neutral-100"
          >
            <Ban className="w-3.5 h-3.5" />
            إيقاف الكابتن
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Moderation section (trips)
// ============================================
function ModerationSection() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'accepted' | 'completed' | 'cancelled'>('active');

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      setTrips(data as Trip[]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const filters: { id: typeof filter; label: string }[] = [
    { id: 'active', label: 'نشطة' },
    { id: 'accepted', label: 'مقبولة' },
    { id: 'completed', label: 'مكتملة' },
    { id: 'cancelled', label: 'ملغاة' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === f.id ? 'bg-primary-500 text-white' : 'bg-white text-neutral-500 border border-neutral-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {trips.length === 0 ? (
        <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
          <FileText className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">لا توجد رحلات</p>
        </div>
      ) : (
        trips.map((trip) => (
          <div key={trip.id} className="bg-white rounded-xl2 shadow-card p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-primary-600">{trip.price.toFixed(2)} <span className="text-xs text-neutral-400">JOD</span></span>
              <span className="text-[10px] text-neutral-400">{new Date(trip.created_at).toLocaleDateString('ar')}</span>
            </div>
            <p className="text-sm text-neutral-700">
              {trip.origin_governorate} - {trip.origin_area}
              <span className="text-neutral-400 mx-1">←</span>
              {trip.destination_governorate} - {trip.destination_area}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                {trip.capacity_type === 'orders' ? 'طلبات' : trip.capacity_type}
              </span>
              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                {trip.time_type === 'urgent' ? 'عاجل' : 'مجدول'}
              </span>
              <span className="text-[10px] text-neutral-400" dir="ltr">{trip.customer_phone}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// Recharges section
// ============================================
function RechargesSection({ onAction }: { onAction?: () => void }) {
  const [recharges, setRecharges] = useState<RechargeWithCaptain[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  const fetchRecharges = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recharges')
      .select(`
        *,
        captain:captains!recharges_captain_id_fkey(full_name, phone)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecharges(data as unknown as RechargeWithCaptain[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecharges();
  }, [fetchRecharges]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.rpc('approve_recharge', { p_recharge_id: id });
    if (!error) {
      setRecharges((prev) => prev.filter((r) => r.id !== id));
      onAction?.();
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.rpc('reject_recharge', { p_recharge_id: id, p_note: 'مرفوض من الإدارة' });
    if (!error) {
      setRecharges((prev) => prev.filter((r) => r.id !== id));
      onAction?.();
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recharges.length === 0 ? (
        <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
          <Wallet className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">لا توجد طلبات شحن قيد المراجعة</p>
        </div>
      ) : (
        recharges.map((r) => (
          <div key={r.id} className="bg-white rounded-xl2 shadow-card p-4 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-neutral-900">{r.captain_name || r.captain_phone}</p>
                <p className="text-xs text-neutral-400" dir="ltr">{r.captain_phone}</p>
              </div>
              <span className="text-lg font-bold text-success-600">{r.amount.toFixed(2)} <span className="text-xs text-neutral-400">JOD</span></span>
            </div>

            <button
              onClick={() => setViewingReceipt(r.receipt_url)}
              className="flex items-center gap-2 bg-primary-50 text-primary-600 rounded-xl px-3 py-2 text-xs font-bold hover:bg-primary-100 transition-colors mb-3"
            >
              <ExternalLink className="w-4 h-4" />
              عرض الإيصال
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(r.id)}
                disabled={actionLoading === r.id}
                className="flex-1 flex items-center justify-center gap-1.5 bg-success-500 text-white rounded-xl2 py-2.5 text-xs font-bold hover:bg-success-600 transition-colors active:scale-95 disabled:opacity-50"
              >
                {actionLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                اعتماد
              </button>
              <button
                onClick={() => handleReject(r.id)}
                disabled={actionLoading === r.id}
                className="flex-1 flex items-center justify-center gap-1.5 bg-error-50 text-error-500 border border-error-200 rounded-xl2 py-2.5 text-xs font-bold hover:bg-error-100 transition-colors active:scale-95 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                رفض
              </button>
            </div>
          </div>
        ))
      )}

      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" dir="rtl" onClick={() => setViewingReceipt(null)}>
          <div className="absolute inset-0 bg-black/70 animate-fade-in" />
          <div className="relative max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <img src={viewingReceipt} alt="إيصال" className="w-full rounded-xl2 shadow-card-lg" />
            <button
              onClick={() => setViewingReceipt(null)}
              className="absolute -top-3 -left-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-card-lg"
            >
              <XCircle className="w-5 h-5 text-neutral-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Withdrawals section
// ============================================
function WithdrawalsSection({ onAction }: { onAction?: () => void }) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithCaptain[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('withdrawals')
      .select(`
        *,
        captain:captains!withdrawals_captain_id_fkey(full_name, phone)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWithdrawals(data as unknown as WithdrawalWithCaptain[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.rpc('approve_withdrawal', { p_withdrawal_id: id });
    if (!error) {
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
      onAction?.();
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.rpc('reject_withdrawal', { p_withdrawal_id: id, p_note: 'مرفوض من الإدارة' });
    if (!error) {
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
      onAction?.();
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {withdrawals.length === 0 ? (
        <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
          <Banknote className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">لا توجد طلبات سحب قيد المراجعة</p>
        </div>
      ) : (
        withdrawals.map((w) => (
          <div key={w.id} className="bg-white rounded-xl2 shadow-card p-4 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-neutral-900">{w.captain_name || w.captain_phone}</p>
                <p className="text-xs text-neutral-400" dir="ltr">{w.captain_phone}</p>
              </div>
              <span className="text-lg font-bold text-primary-600">{w.amount.toFixed(2)} <span className="text-xs text-neutral-400">JOD</span></span>
            </div>
            <p className="text-[10px] text-neutral-400 mb-3">{new Date(w.created_at).toLocaleDateString('ar')}</p>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(w.id)}
                disabled={actionLoading === w.id}
                className="flex-1 flex items-center justify-center gap-1.5 bg-success-500 text-white rounded-xl2 py-2.5 text-xs font-bold hover:bg-success-600 transition-colors active:scale-95 disabled:opacity-50"
              >
                {actionLoading === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                موافقة
              </button>
              <button
                onClick={() => handleReject(w.id)}
                disabled={actionLoading === w.id}
                className="flex-1 flex items-center justify-center gap-1.5 bg-error-50 text-error-500 border border-error-200 rounded-xl2 py-2.5 text-xs font-bold hover:bg-error-100 transition-colors active:scale-95 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                رفض
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// Support section (admin view)
// ============================================
function AdminSupportSection() {
  const [conversations, setConversations] = useState<SupportConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<SupportConversationWithDetails | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_conversations')
      .select(`
        *,
        captain:captains!support_conversations_captain_id_fkey(full_name, phone)
      `)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      const mapped = (data as unknown as Array<SupportConversationWithDetails & { captain: { full_name: string | null; phone: string | null } | null }>).map((c) => ({
        ...c,
        captain_name: c.captain?.full_name ?? null,
        captain_phone: c.captain?.phone ?? null,
      }));
      setConversations(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (selectedConv) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSelectedConv(null)}
          className="flex items-center gap-2 text-sm font-bold text-primary-500"
        >
          رجوع للمحادثات
        </button>
        <AdminChatView conversation={selectedConv} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
          <Inbox className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">لا توجد محادثات دعم</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setSelectedConv(conv)}
            className="w-full bg-white rounded-xl2 shadow-card p-4 flex items-center gap-3 text-right hover:shadow-card-lg transition-all animate-fade-in active:scale-[0.98]"
          >
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-900 truncate">{conv.captain_name || conv.captain_phone}</p>
              <p className="text-xs text-neutral-400" dir="ltr">{conv.captain_phone}</p>
            </div>
            <div className="text-left flex-shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${conv.status === 'open' ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-500'}`}>
                {conv.status === 'open' ? 'مفتوحة' : 'مغلقة'}
              </span>
              <p className="text-[10px] text-neutral-400 mt-1">
                {new Date(conv.last_message_at).toLocaleDateString('ar')}
              </p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

function AdminChatView({ conversation }: { conversation: SupportConversationWithDetails }) {
  const [messages, setMessages] = useState<Array<{ id: string; sender_type: string; body: string; created_at: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useState<HTMLDivElement | null>(null)[0];

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('support_messages')
        .select('id, sender_type, body, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`admin_support:${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as typeof prev[0]]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'admin',
        body: input.trim(),
      })
      .select('id, sender_type, body, created_at')
      .maybeSingle();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
    }
    setInput('');
    setSending(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl2 shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100">
        <p className="text-sm font-bold text-neutral-900">{conversation.captain_name || conversation.captain_phone}</p>
        <p className="text-xs text-neutral-400" dir="ltr">{conversation.captain_phone}</p>
      </div>

      <div ref={scrollRef} className="max-h-[400px] overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">لا توجد رسائل</p>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender_type === 'admin';
            const isBot = msg.sender_type === 'bot';
            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[75%] rounded-xl2 px-3.5 py-2.5 text-sm leading-relaxed ${
                  isBot ? 'bg-primary-50 text-neutral-700 border border-primary-100' :
                  isAdmin ? 'bg-secondary-500 text-white' :
                  'bg-neutral-100 text-neutral-800'
                }`}>
                  {msg.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-neutral-100 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="رد الإدارة..."
            className="flex-1 bg-neutral-50 border-2 border-neutral-200 rounded-xl2 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-primary-500 text-white rounded-xl2 flex items-center justify-center hover:bg-primary-600 transition-colors active:scale-95 disabled:opacity-50 flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
