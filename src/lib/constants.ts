export const GOVERNORATES: string[] = [
  'عمّان',
  'الزرقاء',
  'إربد',
  'البلقاء',
  'مادبا',
  'الكرك',
  'الطفيلة',
  'معان',
  'العقبة',
  'جرش',
  'عجلون',
  'مأدبا',
];

export const AREAS_BY_GOVERNORATE: Record<string, string[]> = {
  'عمّان': [
    'العبالي',
    'جبل الحسين',
    'جبل عمّان',
    'الخندق',
    'الدوار السابع',
    'الهاشمي الشمالي',
    'النزهة',
    'الياسمين',
    'تلاع العلي',
    'الشميساني',
    'الرياضي',
    'المقابلين',
    'الأشرفية',
    'خريبة السوق',
    'وادي صقرة',
    'العبدلي',
    'الجبيهة',
    'خلدا',
    'صويلح',
    'ماركا',
    'الجويدة',
    'الزرقاء الجديدة',
  ],
  'الزرقاء': [
    'الزرقاء',
    'هاشم',
    'الأمير محمد',
    'الإسكان',
    'الجسر',
    'معصوم',
    'الرميلة',
    'الزرقاء الجديدة',
  ],
  'إربد': [
    'إربد',
    'اليرموك',
    'الحصن',
    'بني عبيد',
    'الكفارة',
    'الطيبة',
    'النزهة',
    'الجامعة',
    'القصبة',
  ],
  'البلقاء': [
    'السلط',
    'عين الباشا',
    'الفحيص',
    'ماحص',
    'دير علا',
    ' الشونة الجنوبية',
  ],
  'مادبا': ['مادبا', 'ذيبان', 'ليبا', 'العريض'],
  'الكرك': ['الكرك', 'القصر', 'الأمير', 'المزار الجنوبي', 'القطرانة'],
  'الطفيلة': ['الطفيلة', 'بصيرا', 'الحسا', 'عين الجين'],
  'معان': ['معان', 'البقعة', 'الشوبك', 'وادي موسى'],
  'العقبة': ['العقبة', 'القويرة', 'الديسة', 'الرحبة'],
  'جرش': ['جرش', 'المفرق', 'سوف', 'برما', 'الكيتة'],
  'عجلون': ['عجلون', 'عين جنا', 'كفرنجة', 'عنجرة'],
  'مأدبا': ['مادبا', 'ذيبان', 'ليبا'],
};

export const CAPACITY_OPTIONS = [
  { value: '1_passenger', label: 'راكب واحد', icon: 'person' },
  { value: '2_passengers', label: 'راكبان', icon: 'people' },
  { value: '3_passengers', label: '3 ركاب', icon: 'people' },
  { value: 'full_car', label: 'سيارة كاملة', icon: 'car' },
  { value: 'orders', label: 'طلبات (توصيل)', icon: 'package' },
] as const;

export const TIME_TYPE_OPTIONS = [
  { value: 'urgent', label: 'عاجل الآن', icon: 'urgent' },
  { value: 'scheduled', label: 'موعد محدد', icon: 'scheduled' },
] as const;

export const CAPACITY_LABELS: Record<string, string> = {
  '1_passenger': 'راكب واحد',
  '2_passengers': 'راكبان',
  '3_passengers': '3 ركاب',
  full_car: 'سيارة كاملة',
  orders: 'طلبات (توصيل)',
};

export const TIME_TYPE_LABELS: Record<string, string> = {
  urgent: 'عاجل',
  scheduled: 'موعد محدد',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'متاح',
  accepted: 'مقبول',
  reached: 'وصلت',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const PASSENGER_COUNT: Record<string, number> = {
  '1_passenger': 1,
  '2_passengers': 2,
  '3_passengers': 3,
  full_car: 4,
  orders: 0,
};

export const COMMISSION_RATE = 0.5;
