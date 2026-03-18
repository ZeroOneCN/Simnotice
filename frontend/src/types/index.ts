export interface SimCard {
  id: number;
  phone_number: string;
  carrier: string;
  balance: number;
  monthly_fee: number;
  billing_day: number;
  location: string | null;
  data_plan: string | null;
  call_minutes: string | null;
  sms_count: string | null;
  activation_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Carrier {
  id: number;
  name: string;
  created_at: string;
}

export interface Setting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  sim_card_id: number;
  type: 'recharge' | 'billing';
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface SettingsForm {
  notification_type: 'email' | 'wechat' | 'both';
  email_enabled: boolean;
  email_subject: string;
  email_template: string;
  wechat_enabled: boolean;
  wechat_webhook_url: string;
  wechat_template: string;
  balance_threshold: number;
  notification_days_before: number;
}

export interface SimCardFormData {
  phone_number: string;
  carrier: string;
  balance: number;
  monthly_fee: number;
  billing_day: number;
  location?: string;
  data_plan?: string;
  call_minutes?: string;
  sms_count?: string;
  activation_date?: string;
}

export interface RechargeForm {
  amount: number;
  description?: string;
}