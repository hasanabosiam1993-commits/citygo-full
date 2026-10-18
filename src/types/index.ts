export type CaptainStatus = 'pending' | 'active' | 'suspended' | 'inactive';

export interface Captain {
  id: string;
  user_id: string;
  phone: string;
  employee_id: string | null;
  status: CaptainStatus;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  vehicle_type: string | null;
  license_number: string | null;
  license_expiry: string | null;
  id_document_url: string | null;
  license_document_url: string | null;
  vehicle_license_document_url: string | null;
  is_online: boolean;
  is_admin: boolean;
  rating: number;
  total_trips: number;
  wallet_balance: number;
  created_at: string;
  updated_at: string;
}

export type TripStatus = 'active' | 'accepted' | 'reached' | 'completed' | 'cancelled';
export type CapacityType = '1_passenger' | '2_passengers' | '3_passengers' | 'full_car' | 'orders';
export type TimeType = 'urgent' | 'scheduled';

export interface Trip {
  id: string;
  captain_id: string;
  price: number;
  origin_governorate: string;
  origin_area: string;
  destination_governorate: string;
  destination_area: string;
  capacity_type: CapacityType;
  time_type: TimeType;
  scheduled_date: string | null;
  scheduled_time: string | null;
  customer_phone: string;
  location_link: string | null;
  status: TripStatus;
  created_at: string;
  accepted_by: string | null;
  commission_amount: number | null;
  hidden_by: string[] | null;
}

export type AuthScreen = 'login' | 'register' | 'pending' | 'dashboard' | 'loading' | 'admin';

export interface TripWithCreator extends Trip {
  creator_name?: string | null;
  creator_phone?: string | null;
}

export type SupportSenderType = 'captain' | 'admin' | 'bot';

export interface SupportConversation {
  id: string;
  captain_id: string;
  status: 'open' | 'closed';
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_type: SupportSenderType;
  body: string;
  created_at: string;
}

export interface SupportConversationWithDetails extends SupportConversation {
  captain_name?: string | null;
  captain_phone?: string | null;
  last_message_body?: string | null;
  unread_count?: number;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface Withdrawal {
  id: string;
  captain_id: string;
  amount: number;
  status: WithdrawalStatus;
  admin_note: string | null;
  processed_by: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface WithdrawalWithCaptain extends Withdrawal {
  captain_name?: string | null;
  captain_phone?: string | null;
}

export type RechargeStatus = 'pending' | 'approved' | 'rejected';

export interface Recharge {
  id: string;
  captain_id: string;
  amount: number;
  receipt_url: string;
  status: RechargeStatus;
  admin_note: string | null;
  processed_by: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface RechargeWithCaptain extends Recharge {
  captain_name?: string | null;
  captain_phone?: string | null;
}
