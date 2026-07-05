import { StoreCategory, CreditCard } from '../types';

export const COLORS = {
  bg: '#071A0F',
  bgGradientStart: '#071A0F',
  bgGradientEnd: '#0D2918',
  surface: 'rgba(255,255,255,0.06)',
  surfaceBorder: 'rgba(255,255,255,0.1)',
  accent: '#059669',
  accentLight: '#34D399',
  gold: '#F59E0B',
  goldLight: '#FDE68A',
  green: '#10B981',
  red: '#F43F5E',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
};

export const CARD_COLOR_SCHEMES: Record<string, [string, string]> = {
  sapphire: ['#1E3A8A', '#2563EB'],
  purple:   ['#14532D', '#16A34A'],
  emerald:  ['#064E3B', '#059669'],
  gold:     ['#78350F', '#D97706'],
  rose:     ['#881337', '#E11D48'],
  slate:    ['#1E293B', '#334155'],
  indigo:   ['#312E81', '#4F46E5'],
  teal:     ['#134E4A', '#0D9488'],
};

export const NETWORK_LABELS: Record<string, string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
};

export const CATEGORY_META: Record<StoreCategory, { label: string; emoji: string; faIcon: string; description: string }> = {
  dining:        { label: 'Dining',             emoji: '🍽️', faIcon: 'cutlery',       description: 'Restaurants, cafes, fast food' },
  groceries:     { label: 'Groceries',          emoji: '🛒', faIcon: 'shopping-cart',  description: 'Supermarkets, grocery stores' },
  gas:           { label: 'Gas & Fuel',         emoji: '⛽', faIcon: 'tint',           description: 'Gas stations, EV charging' },
  travel:        { label: 'Travel',             emoji: '✈️', faIcon: 'plane',          description: 'Flights, car rentals' },
  hotels:        { label: 'Hotels',             emoji: '🏨', faIcon: 'bed',            description: 'Hotels, vacation rentals' },
  online:        { label: 'Online Shopping',    emoji: '📦', faIcon: 'laptop',         description: 'Amazon, online retail' },
  entertainment: { label: 'Entertainment',      emoji: '🎬', faIcon: 'film',           description: 'Movies, events, concerts' },
  streaming:     { label: 'Streaming',          emoji: '📺', faIcon: 'headphones',     description: 'Netflix, Spotify, streaming services' },
  pharmacy:      { label: 'Pharmacy & Medical', emoji: '💊', faIcon: 'medkit',         description: 'Drugstores, pharmacies, medical expenses' },
  retail:        { label: 'Retail',             emoji: '🛍️', faIcon: 'tag',            description: 'Department stores, clothing' },
  home:          { label: 'Home & Garden',      emoji: '🏠', faIcon: 'home',           description: 'Home Depot, Lowe\'s, furniture' },
  wholesale:     { label: 'Wholesale',          emoji: '🏭', faIcon: 'institution',    description: 'Costco, Sam\'s Club, BJ\'s' },
  other:         { label: 'Other',              emoji: '💳', faIcon: 'credit-card',    description: 'Everything else' },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as StoreCategory[];

export const REWARD_TYPE_LABELS: Record<string, string> = {
  cashback: 'Cash Back',
  points: 'Points',
  miles: 'Miles',
};

export const DEFAULT_CARDS: Omit<CreditCard, 'id' | 'createdAt'>[] = [
  {
    nickname: 'Chase Sapphire Preferred',
    bank: 'Chase',
    lastFour: '1234',
    network: 'visa',
    colorScheme: 'sapphire',
    annualFee: 95,
    baseReward: 1,
    baseRewardType: 'points',
    rewards: [
      { category: 'dining',    rewardRate: 3, rewardType: 'points' },
      { category: 'groceries', rewardRate: 3, rewardType: 'points' },
      { category: 'streaming', rewardRate: 3, rewardType: 'points' },
      { category: 'travel',    rewardRate: 5, rewardType: 'points' },
      { category: 'hotels',    rewardRate: 5, rewardType: 'points' },
    ],
    benefits: [
      { label: '$50 Annual Hotel Credit', value: 50, period: 'annual', notes: 'Via Chase Travel portal' },
    ],
    notes: '5x on Chase Travel, 3x on dining & streaming',
  },
  {
    nickname: 'Amex Gold Card',
    bank: 'American Express',
    lastFour: '5678',
    network: 'amex',
    colorScheme: 'gold',
    annualFee: 325,
    baseReward: 1,
    baseRewardType: 'points',
    rewards: [
      { category: 'dining',    rewardRate: 4, rewardType: 'points' },
      { category: 'groceries', rewardRate: 4, rewardType: 'points', maxSpend: 25000, maxSpendPeriod: 'annual' },
      { category: 'travel',    rewardRate: 3, rewardType: 'points' },
    ],
    benefits: [
      { label: 'Monthly Dining Credit', value: 10, period: 'monthly', notes: 'Grubhub, Cheesecake Factory, Goldbelly, etc.' },
      { label: 'Monthly Uber Cash', value: 10, period: 'monthly', notes: 'For Uber rides and Uber Eats' },
      { label: 'Resy Restaurant Credit', value: 100, period: 'annual', notes: '$50 in Jan–Jun, $50 in Jul–Dec' },
    ],
    notes: '4x dining & US groceries (up to $25K/yr), 3x flights',
  },
  {
    nickname: 'Citi Double Cash',
    bank: 'Citi',
    lastFour: '9012',
    network: 'mastercard',
    colorScheme: 'slate',
    annualFee: 0,
    baseReward: 2,
    baseRewardType: 'cashback',
    rewards: [],
    notes: '2% on everything (1% purchase + 1% payment)',
  },
];
