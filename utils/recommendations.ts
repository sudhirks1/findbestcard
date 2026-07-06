import { CreditCard, StoreCategory, CardScore, RewardType, HabitEntry } from '../types';

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: StoreCategory }> = [
  { keywords: ['safeway','kroger','whole foods','trader joe','publix','wegmans','aldi','sprouts','heb','meijer','giant','stop & shop','food lion','market','grocery','supermarket','fresh market','vons','ralph','fry\'s','king soopers'], category: 'groceries' },
  { keywords: ['shell','chevron','bp','exxon','mobil','arco','texaco','valero','circle k','speedway','marathon','sunoco','wawa','casey','kwik trip','pilot','loves','76 station','gas station','fuel'], category: 'gas' },
  { keywords: ['mcdonald','burger king','subway','chipotle','pizza','taco bell','wendy','kfc','chick-fil','panera','starbucks','dunkin','restaurant','cafe','diner','bistro','grill','sushi','thai','chinese','mexican','steakhouse','barbeque','bbq','panda express','domino','papa john','little caesar'], category: 'dining' },
  { keywords: ['marriott','hilton','hyatt','sheraton','holiday inn','best western','radisson','hampton inn','courtyard','residence inn','fairfield','doubletree','hotel','resort','inn','suites','motel','lodge'], category: 'hotels' },
  { keywords: ['amazon','ebay','etsy','newegg','wayfair','overstock','chewy','zappos','online','dot com'], category: 'online' },
  { keywords: ['netflix','spotify','hulu','disney+','hbo','apple tv','peacock','paramount','sling','youtube premium','streaming','audible'], category: 'streaming' },
  { keywords: ['cvs','walgreens','rite aid','pharmacy','drug store','duane reade','prescription','clinic','urgent care','hospital','medical','health','doctor','dental'], category: 'pharmacy' },
  { keywords: ['home depot','lowe\'s','lowes','ikea','ace hardware','menards','pottery barn','west elm','williams sonoma','bed bath','crate and barrel','restoration hardware','hardware'], category: 'home' },
  { keywords: ['costco','sam\'s club','bj\'s','pricesmart','wholesale','warehouse club'], category: 'wholesale' },
  { keywords: ['united','delta','american airlines','southwest','jetblue','alaska airlines','spirit','frontier','air','airport','hertz','avis','enterprise','national car','alamo','budget car','rental car','train','amtrak'], category: 'travel' },
  { keywords: ['macy','nordstrom','bloomingdale','tj maxx','marshalls','ross','gap','h&m','zara','forever 21','old navy','banana republic','express','victoria\'s secret','target','walmart','department store','clothing','fashion','apparel','mall'], category: 'retail' },
  { keywords: ['amc','regal','cinemark','cinema','movie','theater','theatre','dave and buster','bowling','arcade','topgolf','concert','ticketmaster','live nation','sports arena','stadium'], category: 'entertainment' },
];

export function guessCategoryFromName(name: string): StoreCategory | null {
  const lower = name.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.category;
    }
  }
  return null;
}

function getCardRateForCategory(card: CreditCard, category: StoreCategory): { rate: number; type: RewardType; baseUsed: boolean } {
  const specific = card.rewards.find((r) => r.category === category);
  if (specific) {
    return { rate: specific.rewardRate, type: specific.rewardType, baseUsed: false };
  }
  return { rate: card.baseReward, type: card.baseRewardType, baseUsed: true };
}

function normalizeRate(rate: number, type: RewardType): number {
  // Normalize to a comparable "effective cash back equivalent"
  // Points/miles are roughly 1.5-2cpp but for ranking we treat 1pt ≈ 1%
  // Cashback is already 1:1. Points/miles get a 1.5x factor for comparison.
  if (type === 'cashback') return rate;
  return rate * 1.5;
}

export function rankCards(
  category: StoreCategory,
  cards: CreditCard[],
  habits: HabitEntry[]
): CardScore[] {
  if (!cards.length) return [];

  const scores = cards.map((card): CardScore => {
    const { rate, type, baseUsed } = getCardRateForCategory(card, category);
    const normalized = normalizeRate(rate, type);

    // Habit boost: if the user has picked this card for this category before,
    // add a small weight so ties break toward their preference.
    const habitEntry = habits.find(
      (h) => h.category === category && h.cardId === card.id
    );
    const habitBoost = !!habitEntry && habitEntry.count > 0;
    // Habit weight: up to 0.3 bonus per habit point (capped at 3 points = 0.9 bonus)
    const habitWeight = habitEntry ? Math.min(habitEntry.count * 0.3, 0.9) : 0;

    return {
      card,
      rewardRate: rate,
      rewardType: type,
      isRecommended: false,
      habitBoost,
      baseUsed,
      _score: normalized + habitWeight,
    } as CardScore & { _score: number };
  });

  // Sort descending by score
  scores.sort((a, b) => ((b as any)._score ?? 0) - ((a as any)._score ?? 0));

  // Mark the top card as recommended
  if (scores.length > 0) {
    scores[0].isRecommended = true;
  }

  // Strip internal _score
  return scores.map(({ card, rewardRate, rewardType, isRecommended, habitBoost, baseUsed }) => ({
    card,
    rewardRate,
    rewardType,
    isRecommended,
    habitBoost,
    baseUsed,
  }));
}

export function getRewardDisplay(rate: number, type: RewardType): string {
  if (type === 'cashback') return `${rate}% back`;
  if (type === 'points') return `${rate}x pts`;
  return `${rate}x miles`;
}
