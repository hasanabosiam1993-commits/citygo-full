import { useState, type ChangeEvent } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Phone,
  Link as LinkIcon,
  Calendar,
  Clock,
  Users,
  Car,
  Package,
  DollarSign,
  Zap,
  ChevronLeft,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import {
  GOVERNORATES,
  AREAS_BY_GOVERNORATE,
  CAPACITY_OPTIONS,
  TIME_TYPE_OPTIONS,
} from '@/lib/constants';
import type { CapacityType, TimeType, Trip } from '@/types';

interface CreateTripFormProps {
  captainId: string;
  onClose: () => void;
  onCreated: (trip: Trip) => void;
}

interface FormState {
  price: string;
  origin_governorate: string;
  origin_area: string;
  destination_governorate: string;
  destination_area: string;
  capacity_type: CapacityType;
  time_type: TimeType;
  scheduled_date: string;
  scheduled_time: string;
  customer_phone: string;
  location_link: string;
}

const CAPACITY_ICONS: Record<string, React.ReactNode> = {
  '1_passenger': <Users className="w-5 h-5" />,
  '2_passengers': <Users className="w-5 h-5" />,
  '3_passengers': <Users className="w-5 h-5" />,
  full_car: <Car className="w-5 h-5" />,
  orders: <Package className="w-5 h-5" />,
};

export function CreateTripForm({ captainId, onClose, onCreated }: CreateTripFormProps) {
  const [form, setForm] = useState<FormState>({
    price: '',
    origin_governorate: '',
    origin_area: '',
    destination_governorate: '',
    destination_area: '',
    capacity_type: '1_passenger',
    time_type: 'urgent',
    scheduled_date: '',
    scheduled_time: '',
    customer_phone: '',
    location_link: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const originAreas = form.origin_governorate
    ? AREAS_BY_GOVERNORATE[form.origin_governorate] || []
    : [];
  const destAreas = form.destination_governorate
    ? AREAS_BY_GOVERNORATE[form.destination_governorate] || []
    : [];

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canSubmit =
    form.price.trim() &&
    parseFloat(form.price) > 0 &&
    form.origin_governorate &&
    form.origin_area &&
    form.destination_governorate &&
    form.destination_area &&
    form.customer_phone.trim() &&
    (form.time_type === 'urgent' || (form.scheduled_date && form.scheduled_time));

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: insertError } = await supabase
        .from('trips')
        .insert({
          captain_id: captainId,
          price: parseFloat(form.price),
          origin_governorate: form.origin_governorate,
          origin_area: form.origin_area,
          destination_governorate: form.destination_governorate,
          destination_area: form.destination_area,
          capacity_type: form.capacity_type,
          time_type: form.time_type,
          scheduled_date: form.time_type === 'scheduled' ? form.scheduled_date : null,
          scheduled_time: form.time_type === 'scheduled' ? form.scheduled_time : null,
          customer_phone: form.customer_phone,
          location_link: form.location_link || null,
          status: 'active',
        })
        .select()
        .maybeSingle();

      if (insertError) {
        setError('تعذر إنشاء الرحلة. حاول مرة أخرى');
        setLoading(false);
        return;
      }

      if (data) {
        setSuccess(true);
        setTimeout(() => {
          onCreated(data as Trip);
        }, 1200);
      }
    } catch {
      setError('حدث خطأ غير متوقع');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6" dir="rtl">
        <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
        <div className="relative bg-white rounded-xl3 p-8 w-full max-w-sm text-center animate-scale-in">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-success-600" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">تم إنشاء الرحلة</h3>
          <p className="text-sm text-neutral-500">تم نشر الرحلة بنجاح وهي متاحة الآن</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="relative mt-auto bg-neutral-50 rounded-t-[1.75rem] max-h-[92vh] overflow-y-auto scrollbar-none animate-slide-up shadow-card-lg">
        {/* Drag handle */}
        <div className="sticky top-0 bg-neutral-50 pt-3 pb-2 z-10">
          <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mb-2" />
          <div className="flex items-center justify-between px-5">
            <h2 className="text-lg font-bold text-neutral-900">إنشاء رحلة / طلب</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center hover:bg-neutral-300 transition-colors"
            >
              <X className="w-4 h-4 text-neutral-600" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-8 space-y-4">
          {error && (
            <div className="bg-error-50 border border-error-200 rounded-xl2 p-3 flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0" />
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          {/* Price */}
          <FormSection icon={<DollarSign className="w-5 h-5" />} title="السعر">
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className="w-full bg-white border-2 border-neutral-200 rounded-xl2 px-4 py-3.5 text-2xl font-bold text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500 transition-colors text-center"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">
                JOD
              </span>
            </div>
          </FormSection>

          {/* Route */}
          <FormSection icon={<Navigation className="w-5 h-5" />} title="المسار">
            <div className="space-y-3">
              <RoutePicker
                label="من"
                icon={<MapPin className="w-4 h-4 text-primary-500" />}
                governorate={form.origin_governorate}
                area={form.origin_area}
                areas={originAreas}
                onGovernorateChange={(v) => {
                  setForm((p) => ({ ...p, origin_governorate: v, origin_area: '' }));
                }}
                onAreaChange={(v) => update('origin_area', v)}
              />

              <div className="flex items-center justify-center">
                <div className="w-px h-4 bg-neutral-300" />
              </div>

              <RoutePicker
                label="إلى"
                icon={<Navigation className="w-4 h-4 text-error-500" />}
                governorate={form.destination_governorate}
                area={form.destination_area}
                areas={destAreas}
                onGovernorateChange={(v) => {
                  setForm((p) => ({ ...p, destination_governorate: v, destination_area: '' }));
                }}
                onAreaChange={(v) => update('destination_area', v)}
              />
            </div>
          </FormSection>

          {/* Capacity */}
          <FormSection icon={<Users className="w-5 h-5" />} title="السعة">
            <div className="grid grid-cols-3 gap-2">
              {CAPACITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('capacity_type', opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl2 p-3 transition-all active:scale-95 ${
                    form.capacity_type === opt.value
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-white border-2 border-neutral-200 text-neutral-600 hover:border-primary-300'
                  }`}
                >
                  {CAPACITY_ICONS[opt.value]}
                  <span className="text-[11px] font-semibold leading-tight text-center">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </FormSection>

          {/* Time */}
          <FormSection icon={<Clock className="w-5 h-5" />} title="الوقت">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {TIME_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update('time_type', opt.value)}
                  className={`flex items-center justify-center gap-2 rounded-xl2 p-3.5 transition-all active:scale-95 ${
                    form.time_type === opt.value
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-white border-2 border-neutral-200 text-neutral-600 hover:border-primary-300'
                  }`}
                >
                  {opt.value === 'urgent' ? (
                    <Zap className="w-5 h-5" />
                  ) : (
                    <Calendar className="w-5 h-5" />
                  )}
                  <span className="text-sm font-bold">{opt.label}</span>
                </button>
              ))}
            </div>

            {form.time_type === 'scheduled' && (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-600">التاريخ</label>
                  <input
                    type="date"
                    value={form.scheduled_date}
                    onChange={(e) => update('scheduled_date', e.target.value)}
                    className="w-full bg-white border-2 border-neutral-200 rounded-xl2 px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-600">الوقت</label>
                  <input
                    type="time"
                    value={form.scheduled_time}
                    onChange={(e) => update('scheduled_time', e.target.value)}
                    className="w-full bg-white border-2 border-neutral-200 rounded-xl2 px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            )}
          </FormSection>

          {/* Customer info */}
          <FormSection icon={<Phone className="w-5 h-5" />} title="بيانات العميل">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-neutral-700">رقم هاتف العميل</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    placeholder="07xxxxxxxx"
                    value={form.customer_phone}
                    onChange={(e) => update('customer_phone', e.target.value)}
                    inputMode="tel"
                    className="w-full bg-white border-2 border-neutral-200 rounded-xl2 pr-11 px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-neutral-700">رابط الموقع (اختياري)</label>
                <div className="relative">
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={form.location_link}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => update('location_link', e.target.value)}
                    className="w-full bg-white border-2 border-neutral-200 rounded-xl2 pr-11 px-4 py-3 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          </FormSection>

          {/* Submit */}
          <div className="pt-2">
            <Button
              fullWidth
              loading={loading}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإنشاء
                </>
              ) : (
                'نشر الرحلة'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl2 shadow-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center text-primary-500">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-neutral-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function RoutePicker({
  label,
  icon,
  governorate,
  area,
  areas,
  onGovernorateChange,
  onAreaChange,
}: {
  label: string;
  icon: React.ReactNode;
  governorate: string;
  area: string;
  areas: string[];
  onGovernorateChange: (v: string) => void;
  onAreaChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold text-neutral-600">{label}</span>
      </div>
      <select
        value={governorate}
        onChange={(e) => onGovernorateChange(e.target.value)}
        className="w-full bg-white border-2 border-neutral-200 rounded-xl2 px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 appearance-none"
      >
        <option value="">اختر المحافظة</option>
        {GOVERNORATES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <select
        value={area}
        onChange={(e) => onAreaChange(e.target.value)}
        disabled={!governorate}
        className="w-full bg-white border-2 border-neutral-200 rounded-xl2 px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 appearance-none disabled:opacity-50"
      >
        <option value="">اختر المنطقة</option>
        {areas.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
