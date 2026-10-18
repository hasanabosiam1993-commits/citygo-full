import { useState, useEffect, useCallback } from 'react';
import {
  Bus,
  Bell,
  LogOut,
  BadgeCheck,
  Plus,
  MapPin,
  Clock,
  Users,
  Car,
  Package,
  Zap,
  Calendar,
  Phone,
  Link as LinkIcon,
  X,
  ChevronLeft,
  TrendingUp,
  Star,
  CircleDot,
  Store,
  ListChecks,
  Inbox,
  Headphones,
  Banknote,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { WalletWidget } from '@/components/WalletWidget';
import { OnlineToggle } from '@/components/OnlineToggle';
import { CreateTripForm } from '@/components/CreateTripForm';
import { MarketplaceFeed } from '@/components/MarketplaceFeed';
import { ActiveRequests } from '@/components/ActiveRequests';
import { WithdrawalPage } from '@/pages/WithdrawalPage';
import { RechargePage } from '@/pages/RechargePage';
import { SupportPage } from '@/pages/SupportPage';
import {
  CAPACITY_LABELS,
  STATUS_LABELS,
} from '@/lib/constants';
import type { Trip } from '@/types';

type Tab = 'marketplace' | 'mytrips' | 'active';
type FullPage = 'withdrawal' | 'recharge' | 'support' | null;

const CAPACITY_ICONS: Record<string, React.ReactNode> = {
  '1_passenger': <Users className="w-3.5 h-3.5" />,
  '2_passengers': <Users className="w-3.5 h-3.5" />,
  '3_passengers': <Users className="w-3.5 h-3.5" />,
  full_car: <Car className="w-3.5 h-3.5" />,
  orders: <Package className="w-3.5 h-3.5" />,
};

export function DashboardPage() {
  const { captain, signOut, refreshCaptain } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('marketplace');
  const [showTripForm, setShowTripForm] = useState(false);
  const [fullPage, setFullPage] = useState<FullPage>(null);
  const [myActiveTrips, setMyActiveTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  const fetchMyTrips = useCallback(async () => {
    if (!captain?.id) return;
    setLoadingTrips(true);
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('captain_id', captain.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyActiveTrips(data as Trip[]);
    }
    setLoadingTrips(false);
  }, [captain?.id]);

  const fetchActiveCount = useCallback(async () => {
    if (!captain?.id) return;
    const { count } = await supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .or(`captain_id.eq.${captain.id},accepted_by.eq.${captain.id}`)
      .in('status', ['accepted', 'reached']);

    setActiveCount(count || 0);
  }, [captain?.id]);

  useEffect(() => {
    fetchMyTrips();
    fetchActiveCount();
  }, [fetchMyTrips, fetchActiveCount]);

  const handleTripCreated = (trip: Trip) => {
    setMyActiveTrips((prev) => [trip, ...prev]);
    setShowTripForm(false);
  };

  const handleCancelTrip = async (tripId: string) => {
    const { error } = await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('id', tripId);

    if (!error) {
      setMyActiveTrips((prev) => prev.filter((t) => t.id !== tripId));
    }
  };

  const handleDataChanged = () => {
    fetchMyTrips();
    fetchActiveCount();
    refreshCaptain();
  };

  if (!captain) return null;

  if (fullPage === 'withdrawal') return <WithdrawalPage onBack={() => setFullPage(null)} />;
  if (fullPage === 'recharge') return <RechargePage onBack={() => setFullPage(null)} />;
  if (fullPage === 'support') return <SupportPage onBack={() => setFullPage(null)} />;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'marketplace', label: 'السوق', icon: <Store className="w-4 h-4" /> },
    { id: 'mytrips', label: 'رحلاتي', icon: <ListChecks className="w-4 h-4" />, badge: myActiveTrips.length || undefined },
    { id: 'active', label: 'الطلبات النشطة', icon: <Inbox className="w-4 h-4" />, badge: activeCount || undefined },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 font-cairo pb-24" dir="rtl">
      {/* Header */}
      <header className="safe-top bg-gradient-to-b from-primary-500 to-primary-600 text-white">
        <div className="px-5 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">CityGo</h1>
                <p className="text-xs text-white/70 leading-tight">سيتي جو</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full" />
              </button>
              <button
                onClick={signOut}
                className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center hover:bg-white/25 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Captain info + wallet */}
          <div className="grid grid-cols-3 gap-3 items-stretch">
            <div className="col-span-2 bg-white/10 rounded-xl2 p-4 backdrop-blur-sm flex flex-col justify-center">
              <p className="text-xs text-white/70 mb-0.5">مرحباً بك</p>
              <p className="text-xl font-bold leading-tight truncate">{captain.full_name || 'كابتن'}</p>
              {captain.employee_id && (
                <div className="flex items-center gap-1.5 mt-2">
                  <BadgeCheck className="w-4 h-4 text-accent-300" />
                  <p className="text-xs text-white/70">الرقم الوظيفي: {captain.employee_id}</p>
                </div>
              )}
            </div>
            <div className="col-span-1">
              <WalletWidget balance={captain.wallet_balance ?? 5.0} />
            </div>
          </div>
        </div>
      </header>

      {/* Online toggle */}
      <div className="px-5 -mt-2 mb-4 animate-slide-up">
        <OnlineToggle captainId={captain.id} initialOnline={captain.is_online} />
      </div>

      {/* Quick actions */}
      <div className="px-5 mb-4 grid grid-cols-3 gap-2 animate-slide-up">
        <QuickAction icon={<Banknote className="w-5 h-5" />} label="سحب رصيد" onClick={() => setFullPage('withdrawal')} />
        <QuickAction icon={<Wallet className="w-5 h-5" />} label="شحن المحفظة" onClick={() => setFullPage('recharge')} />
        <QuickAction icon={<Headphones className="w-5 h-5" />} label="الدعم" onClick={() => setFullPage('support')} />
      </div>

      {/* Tab navigation */}
      <div className="px-5 mb-4">
        <div className="bg-white rounded-xl2 shadow-card p-1.5 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {tab.icon}
              <span className="hidden xs:inline sm:inline">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-primary-100 text-primary-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5 space-y-4">
        {activeTab === 'marketplace' && (
          <MarketplaceFeed captainId={captain.id} onAcceptSuccess={handleDataChanged} />
        )}

        {activeTab === 'mytrips' && (
          <MyTripsSection
            trips={myActiveTrips}
            loading={loadingTrips}
            onCancel={handleCancelTrip}
          />
        )}

        {activeTab === 'active' && (
          <ActiveRequests captainId={captain.id} onStatusChange={handleDataChanged} />
        )}
      </div>

      {/* FAB - Create trip */}
      <button
        onClick={() => setShowTripForm(true)}
        className="fixed bottom-6 right-5 w-14 h-14 bg-primary-500 text-white rounded-full shadow-card-lg flex items-center justify-center hover:bg-primary-600 active:scale-95 transition-all z-40"
        aria-label="إنشاء رحلة"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Trip form bottom sheet */}
      {showTripForm && (
        <CreateTripForm
          captainId={captain.id}
          onClose={() => setShowTripForm(false)}
          onCreated={handleTripCreated}
        />
      )}
    </div>
  );
}

function MyTripsSection({
  trips,
  loading,
  onCancel,
}: {
  trips: Trip[];
  loading: boolean;
  onCancel: (tripId: string) => void;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <p className="text-sm text-neutral-400">جاري التحميل...</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-7 h-7 text-neutral-300" />
        </div>
        <p className="text-sm font-bold text-neutral-700 mb-1">لا توجد رحلات نشطة</p>
        <p className="text-xs text-neutral-400">أنشئ رحلة جديدة لبدء العمل</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trips.map((trip) => (
        <MyTripCard key={trip.id} trip={trip} onCancel={() => onCancel(trip.id)} />
      ))}
    </div>
  );
}

function MyTripCard({ trip, onCancel }: { trip: Trip; onCancel: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl2 shadow-card overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary-600">{trip.price.toFixed(2)}</span>
          <span className="text-xs font-medium text-neutral-400">JOD</span>
        </div>
        <div className="flex items-center gap-1.5">
          {trip.time_type === 'urgent' ? (
            <span className="flex items-center gap-1 bg-error-50 text-error-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3" />
              عاجل
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-secondary-50 text-secondary-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Calendar className="w-3 h-3" />
              {trip.scheduled_date}
            </span>
          )}
          <span className="flex items-center gap-1 bg-success-50 text-success-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <CircleDot className="w-3 h-3" />
            {STATUS_LABELS[trip.status]}
          </span>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center pt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
            <div className="w-px h-6 bg-neutral-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-error-500" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-neutral-400">من</p>
              <p className="text-sm font-semibold text-neutral-900">
                {trip.origin_governorate} - {trip.origin_area}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">إلى</p>
              <p className="text-sm font-semibold text-neutral-900">
                {trip.destination_governorate} - {trip.destination_area}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
          {CAPACITY_ICONS[trip.capacity_type]}
          {CAPACITY_LABELS[trip.capacity_type]}
        </span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 border-t border-neutral-100 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
      >
        <span>تفاصيل العميل</span>
        <ChevronLeft className={`w-4 h-4 transition-transform ${expanded ? '-rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Phone className="w-4 h-4 text-neutral-400" />
            <span dir="ltr">{trip.customer_phone}</span>
          </div>
          {trip.location_link && (
            <a
              href={trip.location_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-secondary-500"
            >
              <LinkIcon className="w-4 h-4" />
              <span>رابط الموقع</span>
            </a>
          )}
          {trip.scheduled_time && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Clock className="w-4 h-4 text-neutral-400" />
              <span>الوقت: {trip.scheduled_time}</span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onCancel}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-neutral-100 text-xs font-bold text-error-500 hover:bg-error-50 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        إلغاء الرحلة
      </button>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl2 shadow-card p-3 flex flex-col items-center gap-1.5 hover:shadow-card-lg transition-all active:scale-[0.98]"
    >
      <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500">
        {icon}
      </div>
      <span className="text-[11px] font-bold text-neutral-700">{label}</span>
    </button>
  );
}
