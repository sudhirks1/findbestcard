import { CreditCard, StoreCategory, RewardType } from '../types';

const BASE_URL = 'https://findbestcard-api-production.up.railway.app';

const categoryToColumn: Record<StoreCategory, string | null> = {
  dining: 'diningRate',
  groceries: 'groceriesRate',
  gas: 'gasRate',
  travel: 'travelRate',
  hotels: 'hotelsRate',
  online: 'onlineShoppingRate',
  entertainment: 'entertainmentRate',
  streaming: 'streamingRate',
  pharmacy: 'pharmacyRate',
  retail: 'retailRate',
  home: 'homeGardenRate',
  wholesale: 'wholesaleRate',
  other: null,
};

const columnToCategory: Record<string, StoreCategory> = {
  diningRate: 'dining',
  groceriesRate: 'groceries',
  gasRate: 'gas',
  travelRate: 'travel',
  hotelsRate: 'hotels',
  onlineShoppingRate: 'online',
  entertainmentRate: 'entertainment',
  streamingRate: 'streaming',
  pharmacyRate: 'pharmacy',
  retailRate: 'retail',
  homeGardenRate: 'home',
  wholesaleRate: 'wholesale',
};

async function apiFetch(path: string, options: RequestInit = {}, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const json = JSON.parse(text);
      msg = json.message || text;
    } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Converts server user_card row → local CreditCard
export function serverCardToLocal(s: any): CreditCard {
  const rewardType = (s.rewardType || 'cashback') as RewardType;
  const rewards = Object.entries(columnToCategory)
    .filter(([col]) => s[col] != null && Number(s[col]) > 0)
    .map(([col, category]) => ({
      category,
      rewardRate: Number(s[col]),
      rewardType,
    }));
  return {
    id: s.id,
    nickname: s.nickname,
    bank: s.issuer,
    lastFour: s.lastFour || '',
    network: s.network || 'visa',
    colorScheme: s.colorScheme || 'sapphire',
    rewards,
    baseReward: Number(s.baseRewardRate || 1),
    baseRewardType: rewardType,
    annualFee: Number(s.annualFee || 0),
    notes: s.notes,
    createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
    hasQuarterlyRotatingRewards: s.hasQuarterlyRotatingRewards || false,
    requiresPrimeMembership: s.requiresPrimeMembership || false,
    pausedFromRecommendations: s.pausedFromRecommendations || false,
    rewardsBalance:
      s.rewardsBalance != null
        ? { amount: Number(s.rewardsBalance), updatedAt: Number(s.rewardsBalanceUpdatedAt) }
        : undefined,
    templateId: s.templateId ?? undefined,
    templateUpdatedAt: s.templateUpdatedAt ?? null,
  };
}

// Converts local CreditCard → server DTO
export function localCardToServer(card: CreditCard, sortOrder = 0): object {
  const rateFields: Record<string, number> = {};
  for (const reward of card.rewards) {
    const col = categoryToColumn[reward.category];
    if (col) rateFields[col] = reward.rewardRate;
  }
  return {
    id: card.id,
    nickname: card.nickname,
    issuer: card.bank,
    lastFour: card.lastFour,
    network: card.network,
    colorScheme: card.colorScheme,
    rewardType: card.baseRewardType,
    baseRewardRate: card.baseReward,
    annualFee: card.annualFee,
    notes: card.notes,
    hasQuarterlyRotatingRewards: card.hasQuarterlyRotatingRewards || false,
    requiresPrimeMembership: card.requiresPrimeMembership || false,
    rewardsBalance: card.rewardsBalance?.amount ?? null,
    rewardsBalanceUpdatedAt: card.rewardsBalance?.updatedAt ?? null,
    sortOrder,
    pinnedRates: card.pinnedRates ?? false,
    pausedFromRecommendations: card.pausedFromRecommendations ?? false,
    templateId: card.templateId ?? null,
    ...rateFields,
  };
}

// Auth
export async function login(email: string, password: string) {
  return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function register(email: string, password: string, displayName?: string) {
  return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) });
}

export async function appleAuth(params: {
  identityToken: string;
  appleUserId: string;
  email?: string;
  displayName?: string;
}) {
  return apiFetch('/auth/apple', { method: 'POST', body: JSON.stringify(params) });
}

// Wallet
export async function getWallet(token: string): Promise<any[]> {
  return apiFetch('/wallet', {}, token);
}

export async function addWalletCard(token: string, card: object): Promise<any> {
  return apiFetch('/wallet', { method: 'POST', body: JSON.stringify(card) }, token);
}

export async function updateWalletCard(token: string, id: string, card: object): Promise<any> {
  return apiFetch(`/wallet/${id}`, { method: 'PUT', body: JSON.stringify(card) }, token);
}

export async function deleteWalletCard(token: string, id: string): Promise<void> {
  return apiFetch(`/wallet/${id}`, { method: 'DELETE' }, token);
}

export async function syncWallet(token: string, cards: object[]): Promise<any[]> {
  return apiFetch('/wallet/sync', { method: 'POST', body: JSON.stringify({ cards }) }, token);
}

// Habits
export async function recordHabit(token: string, habit: object): Promise<any> {
  return apiFetch('/habits', { method: 'POST', body: JSON.stringify(habit) }, token);
}

// Subscriptions
export async function getSubscriptions(token: string): Promise<any[]> {
  return apiFetch('/subscriptions', {}, token);
}

export async function addSubscription(token: string, sub: object): Promise<any> {
  return apiFetch('/subscriptions', { method: 'POST', body: JSON.stringify(sub) }, token);
}

export async function updateSubscription(token: string, id: string, sub: object): Promise<any> {
  return apiFetch(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(sub) }, token);
}

export async function deleteSubscription(token: string, id: string): Promise<void> {
  return apiFetch(`/subscriptions/${id}`, { method: 'DELETE' }, token);
}

export async function syncSubscriptions(token: string, subs: object[]): Promise<any[]> {
  return apiFetch('/subscriptions/sync', { method: 'POST', body: JSON.stringify({ subscriptions: subs }) }, token);
}

// Questions
export async function getQuestions(token: string): Promise<any[]> {
  return apiFetch('/questions', {}, token);
}

export async function addQuestion(token: string, text: string): Promise<any> {
  return apiFetch('/questions', { method: 'POST', body: JSON.stringify({ text }) }, token);
}

export async function deleteQuestion(token: string, id: string): Promise<void> {
  return apiFetch(`/questions/${id}`, { method: 'DELETE' }, token);
}

// AI
type ChatMessage = { role: 'user' | 'assistant'; content: string };
export async function askAI(token: string, question: string, history: ChatMessage[] = []): Promise<string> {
  const data = await apiFetch('/ai/ask', { method: 'POST', body: JSON.stringify({ question, history }) }, token);
  return data.answer as string;
}

// Card catalog (public read, admin writes)
export async function getCardTemplates(): Promise<any[]> {
  return apiFetch('/card-templates');
}

export async function createCardTemplate(token: string, template: object): Promise<any> {
  return apiFetch('/card-templates', { method: 'POST', body: JSON.stringify(template) }, token);
}

export async function updateCardTemplate(token: string, id: string, template: object): Promise<any> {
  return apiFetch(`/card-templates/${id}`, { method: 'PUT', body: JSON.stringify(template) }, token);
}

export async function deleteCardTemplate(token: string, id: string): Promise<void> {
  return apiFetch(`/card-templates/${id}`, { method: 'DELETE' }, token);
}

// Device tokens (push notifications)
export async function registerDeviceToken(token: string, deviceToken: string): Promise<void> {
  return apiFetch('/device-tokens', { method: 'POST', body: JSON.stringify({ token: deviceToken }) }, token);
}

// AI benefits fetch (routes through backend, no client API key needed)
export async function fetchCardBenefits(token: string, cardName: string): Promise<any[]> {
  const data = await apiFetch('/ai/benefits', { method: 'POST', body: JSON.stringify({ cardName }) }, token);
  return data.benefits ?? [];
}

// AI card recommendation for a category
type AiPick = { cardId: string; cardName: string; reason: string };
export async function aiRecommend(token: string, category: string): Promise<{ points: AiPick | null; cashback: AiPick | null; advice: string }> {
  return apiFetch('/ai/recommend', { method: 'POST', body: JSON.stringify({ category }) }, token);
}

// Apply the linked template's rates to a wallet card (preserves notes, nickname, etc.)
export async function applyCardTemplate(token: string, cardId: string): Promise<any> {
  return apiFetch(`/wallet/${cardId}/apply-template`, { method: 'POST' }, token);
}

// AI-powered card lookup — returns template (created in DB) or null
export async function aiLookupCard(token: string, cardName: string): Promise<any | null> {
  try {
    const data = await apiFetch('/card-templates/ai-lookup', { method: 'POST', body: JSON.stringify({ name: cardName }) }, token);
    return data ?? null;
  } catch {
    return null;
  }
}

// Convert a backend card_template row into the autofill shape used by add-card
export function serverTemplateToAutofill(t: any) {
  const colToCategory: Record<string, string> = {
    diningRate: 'dining', groceriesRate: 'groceries', travelRate: 'travel',
    gasRate: 'gas', onlineShoppingRate: 'online', entertainmentRate: 'entertainment',
    streamingRate: 'streaming', pharmacyRate: 'pharmacy', retailRate: 'retail',
    hotelsRate: 'hotels', wholesaleRate: 'wholesale', homeGardenRate: 'home',
  };
  const rewards = Object.entries(colToCategory)
    .filter(([col]) => t[col] != null && Number(t[col]) > 0)
    .map(([col, category]) => ({ category, rewardRate: Number(t[col]), rewardType: t.rewardType }));
  return {
    templateId: t.id,
    name: t.name,
    bank: t.issuer,
    colorScheme: t.colorScheme || 'sapphire',
    annualFee: Number(t.annualFee || 0),
    baseReward: Number(t.baseRewardRate || 1),
    baseRewardType: t.rewardType || 'cashback',
    rewards,
    hasQuarterlyRotatingRewards: t.hasQuarterlyRotatingRewards || false,
    requiresPrimeMembership: t.requiresPrimeMembership || false,
  };
}
