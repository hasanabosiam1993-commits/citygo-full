import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Zap,
  Calendar,
  Users,
  Car,
  Package,
  EyeOff,
  Check,
  Undo2,
  Clock,
  Phone,
  Link as LinkIcon,
  Wallet,
  AlertCircle,
  Loader2,
  Store,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  CAPACITY_LABELS,
  COMMISSION_RATE,
} from '@/lib/constants';
import type { TripWithCreator } from '@/types';

interface MarketplaceFeedProps {
  captainId: string;
  onAcceptSuccess: () => void;
}

const CAPACITY_ICONS: Record<string, React.ReactNode> = {
  '1_passenger': <Users className="w-3.5 h-3.5" />,
  '2_passengers': <Users className="w-3.5 h-3.5" />,
  '3_passengers': <Users className="w-3.5 h-3.5" />,
  full_car: <Car className="w-3.5 h-3.5" />,
  orders: <Package className="w-3.5 h-3.5" />,
};

type AcceptState = 'idle' | 'confirming' | 'accepted' | 'processing' | 'undoing';

interface TripAcceptState {
  state: AcceptState;
  error?: string;
}

export function MarketplaceFeed({ captainId, onAcceptSuccess }: MarketplaceFeedProps) {
  const [trips, setTrips] = useState<TripWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptStates, setAcceptStates] = useState<Record<string, TripAcceptState>>({});

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        creator:captains!trips_captain_id_fkey(full_name, phone)
      `)
      .eq('status', 'active')
      .neq('captain_id', captainId)
      .gte('created_at', todayISO)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const filtered = (data as unknown as Array<TripWithCreator & { creator: { full_name: string | null; phone: string | null } | null }>).filter(
        (t) => !t.hidden_by?.includes(captainId)
      ).map((t) => ({
        ...t,
        creator_name: t.creator?.full_name ?? null,
        creator_phone: t.creator?.phone ?? null,
      }));
      setTrips(filtered);
    }
    setLoading(false);
  }, [captainId]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const hideTrip = async (tripId: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== tripId));

    const { data: trip } = await supabase
      .from('trips')
      .select('hidden_by')
      .eq('id', tripId)
      .maybeSingle();

    const currentHidden = (trip?.hidden_by as string[]) || [];
    if (!currentHidden.includes(captainId)) {
      await supabase
        .from('trips')
        .update({ hidden_by: [...currentHidden, captainId] })
        .eq('id', tripId);
    }
  };

  const handleAccept = async (tripId: string) => {
    setAcceptStates((prev) => ({ ...prev, [tripId]: { state: 'processing' } }));

    const { data, error } = await supabase.rpc('accept_trip', { p_trip_id: tripId });

    if (error) {
      let msg = 'تعذر قبول الرحلة';
      if (error.message.includes('Insufficient')) {
        msg = `رصيد المحفظة غير كافٍ. العمولة ${COMMISSION_RATE.toFixed(2)} JOD`;
      } else if (error.message.includes('no longer available')) {
        msg = 'الرحلة لم تعد متاحة';
      } else if (error.message.includes('own trip')) {
        msg = 'لا يمكن قبول رحلتك الخاصة';
      }
      setAcceptStates((prev) => ({ ...prev, [tripId]: { state: 'idle', error: msg } }));
      return;
    }

    if (data && (data as { success: boolean }).success) {
      setAcceptStates((prev) => ({ ...prev, [tripId]: { state: 'accepted' } }));
      onAcceptSuccess();
      setTimeout(() => {
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
        setAcceptStates((prev) => {
          const next = { ...prev };
          delete next[tripId];
          return next;
        });
      }, 3000);
    }
  };

  const handleUndo = async (tripId: string) => {
    setAcceptStates((prev) => ({ ...prev, [tripId]: { state: 'undoing' } }));

    const { error } = await supabase.rpc('undo_accept_trip', { p_trip_id: tripId });

    if (error) {
      setAcceptStates((prev) => ({ ...prev, [tripId]: { state: 'accepted', error: 'تعذر التراجع' } }));
      return;
    }

    setAcceptStates((prev) => {
      const next = { ...prev };
      delete next[tripId];
      return next;
    });
    onAcceptSuccess();
    fetchTrips();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto mb-2" />
        <p className="text-sm text-neutral-400">جاري تحميل الطلبات...</p>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Store className="w-7 h-7 text-neutral-300" />
        </div>
        <p className="text-sm font-bold text-neutral-700 mb-1">لا توجد طلبات حالياً</p>
        <p className="text-xs text-neutral-400">تحقق لاحقاً لعرض الطلبات الجديدة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Commission info banner */}
      <div className="bg-accent-50 border border-accent-200 rounded-xl2 p-3 flex items-center gap-2.5 animate-fade-in">
        <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <p className="text-xs text-accent-800 font-medium">
          عمولة قبول الرحلة: {COMMISSION_RATE.toFixed(2)} JOD تخصم من محفظتك وتضاف لصاحب الرحلة
        </p>
      </div>

      {trips.map((trip) => {
        const acceptState = acceptStates[trip.id] || { state: 'idle' as AcceptState };

        return (
          <MarketplaceTripCard
            key={trip.id}
            trip={trip}
            acceptState={acceptState}
            onHide={() => hideTrip(trip.id)}
            onAccept={() => handleAccept(trip.id)}
            onUndo={() => handleUndo(trip.id)}
          />
        );
      })}
    </div>
  );
}

function MarketplaceTripCard({
  trip,
  acceptState,
  onHide,
  onAccept,
  onUndo,
}: {
  trip: TripWithCreator;
  acceptState: TripAcceptState;
  onHide: () => void;
  onAccept: () => void;
  onUndo: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const timeAgo = getTimeAgo(trip.created_at);

  if (acceptState.state === 'accepted') {
    return (
      <div className="bg-success-50 border-2 border-success-300 rounded-xl2 p-4 animate-scale-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-success-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-success-700">تم قبول الرحلة بنجاح!</p>
            <p className="text-xs text-success-600 mt-0.5">تم خصم {COMMISSION_RATE.toFixed(2)} JOD من محفظتك</p>
          </div>
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 bg-white text-error-500 border-2 border-error-200 rounded-xl px-3 py-2 text-xs font-bold hover:bg-error-50 transition-colors active:scale-95"
          >
            <Undo2 className="w-3.5 h-3.5" />
            تراجع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl2 shadow-card overflow-hidden animate-fade-in">
      {/* Header: price + time */}
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
          <span className="flex items-center gap-1 text-neutral-400 text-[10px] font-medium">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Route */}
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

      {/* Capacity + creator */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
          {CAPACITY_ICONS[trip.capacity_type]}
          {CAPACITY_LABELS[trip.capacity_type]}
        </span>
        {trip.creator_name && (
          <span className="text-[10px] text-neutral-400">
            بواسطة: {trip.creator_name}
          </span>
        )}
      </div>

      {/* Error message */}
      {acceptState.error && acceptState.state === 'idle' && (
        <div className="mx-4 mb-3 bg-error-50 border border-error-200 rounded-lg p-2 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-error-500 flex-shrink-0" />
          <p className="text-xs text-error-700">{acceptState.error}</p>
        </div>
      )}

      {/* Expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 border-t border-neutral-100 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
      >
        <span>التفاصيل</span>
        <span className="text-neutral-400">{expanded ? 'إخفاء' : 'عرض'}</span>
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

      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-t border-neutral-100">
        <button
          onClick={onHide}
          disabled={acceptState.state === 'processing'}
          className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-100 text-neutral-500 rounded-xl2 py-2.5 text-sm font-bold hover:bg-neutral-200 transition-colors active:scale-95 disabled:opacity-50"
        >
          <EyeOff className="w-4 h-4" />
          إخفاء
        </button>
        <button
          onClick={onAccept}
          disabled={acceptState.state === 'processing'}
          className="flex-[2] flex items-center justify-center gap-1.5 bg-primary-500 text-white rounded-xl2 py-2.5 text-sm font-bold hover:bg-primary-600 transition-colors active:scale-95 disabled:opacity-50"
        >
          {acceptState.state === 'processing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري القبول...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              قبول الرحلة
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  return `قبل ${Math.floor(hours / 24)} يوم`;
}
