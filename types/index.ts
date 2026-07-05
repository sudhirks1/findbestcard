export type UserRole = 'user' | 'admin';

export interface RewardsBalance {
  amount: number;
  updatedAt: number;
}

export interface CardBenefit {
  label: string;
  value: number;
  period: 'monthly' | 'annual';
  notes?: string;
}

export type StoreCategory =
  | 'dining'
  | 'groceries'
  | 'gas'
  | 'travel'
  | 'hotels'
  | 'online'
  | 'entertainment'
  | 'streaming'
  | 'pharmacy'
  | 'retail'
  | 'home'
  | 'wholesale'
  | 'other';

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover';
export type RewardType = 'cashback' | 'points' | 'miles';

export interface CategoryReward {
  category: StoreCategory;
  rewardRate: number;
  rewardType: RewardType;
  maxSpend?: number;
  maxSpendPeriod?: 'monthly' | 'quarterly' | 'annual';
  isRotating?: boolean;     // true for quarterly rotating categories (Discover, Chase Freedom)
  quarterLabel?: string;    // e.g. "Q3 2026 (Jul–Sep)"
}

export interface CreditCard {
  id: string;
  nickname: string;
  bank: string;
  lastFour: string;
  network: CardNetwork;
  colorScheme: string;
  rewards: CategoryReward[];
  baseReward: number;
  baseRewardType: RewardType;
  annualFee: number;
  notes?: string;
  createdAt: number;
  isHSAFSA?: boolean;
  hasQuarterlyRotatingRewards?: boolean;
  requiresPrimeMembership?: boolean;
  hotelRewardRate?: number;
  benefits?: CardBenefit[];
  rewardsBalance?: RewardsBalance;
  pinnedRates?: boolean;
  templateId?: string;         // links to master catalog — enables update tracking
  templateUpdatedAt?: string | null;  // set by server when admin updates the template
}

export interface StoreVisit {
  id: string;
  storeName: string;
  storeCategory: StoreCategory;
  timestamp: number;
  recommendedCardId: string;
  usedCardId: string;
  followedRecommendation: boolean;
  overrideReason?: string;
}

export interface CardScore {
  card: CreditCard;
  rewardRate: number;
  rewardType: RewardType;
  isRecommended: boolean;
  habitBoost: boolean;
  baseUsed: boolean;
  hotelSpecialist: boolean;
}

export interface HabitEntry {
  category: StoreCategory;
  cardId: string;
  count: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  period: 'monthly' | 'annual';
  cardId?: string;
  notes?: string;
  createdAt: number;
}
