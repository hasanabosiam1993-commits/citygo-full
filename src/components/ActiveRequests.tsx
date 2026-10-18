import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Zap,
  Calendar,
  Users,
  Car,
  Package,
  Clock,
  Phone,
  Link as LinkIcon,
  CheckCircle2,
  MapPinCheck,
  Loader2,
  X,
  ChevronLeft,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  CAPACITY_LABELS,
  STATUS_LABELS,
  PASSENGER_COUNT,
} from '@/lib/constants';
import type { Trip } from '@/types';

interface ActiveRequestsProps {
  captainId: string;
  onStatusChange: () => void;
}

const CAPACITY_ICONS: Record<string, React.ReactNode> = {
  '1_passenger': <Users className="w-3.5 h-3.5" />,
  '2_passengers': <Users className="w-3.5 h-3.5" />,
  '3_passengers': <Users className="w-3.5 h-3.5" />,
  full_car: <Car className="w-3.5 h-3.5" />,
  orders: <Package className="w-3.5 h-3.5" />,
};

export function ActiveRequests({ captainId, onStatusChange }: ActiveRequestsProps) {
  const { refreshCaptain } = useAuth();
  const [acceptedTrips, setAcceptedTrips] = useState<Trip[]>([]);
  const [myCreatedTrips, setMyCreatedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    setLoading(true);

    const [acceptedRes, createdRes] = await Promise.all([
      supabase
        .from('trips')
        .select('*')
        .eq('accepted_by', captainId)
        .in('status', ['accepted', 'reached'])
        .order('created_at', { ascending: false }),
      supabase
        .from('trips')
        .select('*')
        .eq('captain_id', captainId)
        .in('status', ['accepted', 'reached'])
        .order('created_at', { ascending: false }),
    ]);

    const accepted = (acceptedRes.data as Trip[]) || [];
    const created = (createdRes.data as Trip[]) || [];
    setAcceptedTrips(accepted);
    setMyCreatedTrips(created);
    setLoading(false);
  }, [captainId]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const updateTripStatus = async (tripId: string, newStatus: 'reached' | 'completed') => {
    setUpdating(tripId);
    setError(null);

    const { error: updateError } = await supabase
      .from('trips')
      .update({ status: newStatus })
      .eq('id', tripId);

    if (updateError) {
      setError('تعذر تحديث حالة الرحلة');
      setUpdating(null);
      return;
    }

    if (newStatus === 'completed') {
      setAcceptedTrips((prev) => prev.filter((t) => t.id !== tripId));
      setMyCreatedTrips((prev) => prev.filter((t) => t.id !== tripId));
    } else {
      setAcceptedTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, status: 'reached' } : t))
      );
      setMyCreatedTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, status: 'reached' } : t))
      );
    }

    setUpdating(null);
    onStatusChange();
    refreshCaptain();
  };

  const cancelTrip = async (tripId: string) => {
    setUpdating(tripId);
    const { error: cancelError } = await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('id', tripId);

    if (cancelError) {
      setError('تعذر إلغاء الرحلة');
      setUpdating(null);
      return;
    }

    setAcceptedTrips((prev) => prev.filter((t) => t.id !== tripId));
    setMyCreatedTrips((prev) => prev.filter((t) => t.id !== tripId));
    setUpdating(null);
    onStatusChange();
  };

  const allActive = [...acceptedTrips, ...myCreatedTrips].filter(
    (trip, idx, self) => idx === self.findIndex((t) => t.id === trip.id)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <Loader2 className="w-6 h-6 text-neutral-300 animate-spin mx-auto mb-2" />
        <p className="text-sm text-neutral-400">جاري التحميل...</p>
      </div>
    );
  }

  if (allActive.length === 0) {
    return (
      <div className="bg-white rounded-xl2 shadow-card p-8 text-center">
        <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <MapPin className="w-7 h-7 text-neutral-300" />
        </div>
        <p className="text-sm font-bold text-neutral-700 mb-1">لا توجد طلبات نشطة</p>
        <p className="text-xs text-neutral-400">اقبل رحلة من السوق لبدء العمل</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-xl2 p-3 flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
          <p className="text-sm text-error-700">{error}</p>
        </div>
      )}

      {allActive.map((trip) => {
        const isOrder = trip.capacity_type === 'orders';
        const isReached = trip.status === 'reached';
        const isAccepted = trip.status === 'accepted';
        const passengerCount = PASSENGER_COUNT[trip.capacity_type] || 0;

        return (
          <ActiveTripCard
            key={trip.id}
            trip={trip}
            isOrder={isOrder}
            isReached={isReached}
            isAccepted={isAccepted}
            passengerCount={passengerCount}
            updatingId={updating}
            onStatusUpdate={updateTripStatus}
            onCancel={cancelTrip}
          />
        );
      })}
    </div>
  );
}

function ActiveTripCard({
  trip,
  isOrder,
  isReached,
  isAccepted,
  passengerCount,
  updatingId,
  onStatusUpdate,
  onCancel,
}: {
  trip: Trip;
  isOrder: boolean;
  isReached: boolean;
  isAccepted: boolean;
  passengerCount: number;
  updatingId: string | null;
  onStatusUpdate: (tripId: string, status: 'reached' | 'completed') => void;
  onCancel: (tripId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isThisUpdating = updatingId === trip.id;

  return (
    <div className="bg-white rounded-xl2 shadow-card overflow-hidden animate-fade-in">
      {/* Status header */}
      <div className={`px-4 pt-3 pb-2 flex items-center justify-between ${
        isReached ? 'bg-secondary-50' : 'bg-primary-50'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary-600">{trip.price.toFixed(2)}</span>
          <span className="text-xs font-medium text-neutral-400">JOD</span>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isReached
            ? 'bg-secondary-200 text-secondary-700'
            : 'bg-primary-200 text-primary-700'
        }`}>
          {isReached ? <MapPinCheck className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          {STATUS_LABELS[trip.status]}
        </span>
      </div>

      {/* Route */}
      <div className="px-4 py-3">
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

      {/* Capacity + passenger limit info */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
          {CAPACITY_ICONS[trip.capacity_type]}
          {CAPACITY_LABELS[trip.capacity_type]}
        </span>
        {!isOrder && passengerCount > 0 && (
          <span className="text-[10px] text-neutral-400">
            الحد الأقصى: {passengerCount} راكب
          </span>
        )}
        {isOrder && (
          <span className="text-[10px] text-neutral-400">طلبات غير محدودة</span>
        )}
      </div>

      {/* Expand details */}
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

      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-t border-neutral-100">
        {isAccepted && (
          <button
            onClick={() => onStatusUpdate(trip.id, 'reached')}
            disabled={isThisUpdating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-secondary-500 text-white rounded-xl2 py-2.5 text-sm font-bold hover:bg-secondary-600 transition-colors active:scale-95 disabled:opacity-50"
          >
            {isThisUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPinCheck className="w-4 h-4" />
            )}
            {isOrder ? 'تم الاستلام' : 'وصلت'}
          </button>
        )}

        {isReached && (
          <button
            onClick={() => onStatusUpdate(trip.id, 'completed')}
            disabled={isThisUpdating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-success-500 text-white rounded-xl2 py-2.5 text-sm font-bold hover:bg-success-600 transition-colors active:scale-95 disabled:opacity-50"
          >
            {isThisUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isOrder ? (
              <PackageCheck className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {isOrder ? 'تم التوصيل' : 'تم إيصال الراكب'}
          </button>
        )}

        <button
          onClick={() => onCancel(trip.id)}
          disabled={isThisUpdating}
          className="flex items-center justify-center gap-1.5 bg-neutral-100 text-error-500 rounded-xl2 py-2.5 px-4 text-sm font-bold hover:bg-error-50 transition-colors active:scale-95 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          إلغاء
        </button>
      </div>
    </div>
  );
}
