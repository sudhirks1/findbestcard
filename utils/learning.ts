import { StoreCategory, HabitEntry } from '../types';

export function updateHabit(
  habits: HabitEntry[],
  category: StoreCategory,
  cardId: string
): HabitEntry[] {
  const existing = habits.find((h) => h.category === category && h.cardId === cardId);
  if (existing) {
    return habits.map((h) =>
      h.category === category && h.cardId === cardId
        ? { ...h, count: h.count + 1 }
        : h
    );
  }
  return [...habits, { category, cardId, count: 1 }];
}

export function getTopCardForCategory(
  habits: HabitEntry[],
  category: StoreCategory
): string | null {
  const entries = habits
    .filter((h) => h.category === category)
    .sort((a, b) => b.count - a.count);
  return entries[0]?.cardId ?? null;
}

export function getLearningInsights(habits: HabitEntry[]): {
  category: StoreCategory;
  topCardId: string;
  overrideCount: number;
}[] {
  const byCategory: Record<string, HabitEntry[]> = {};
  for (const h of habits) {
    if (!byCategory[h.category]) byCategory[h.category] = [];
    byCategory[h.category].push(h);
  }

  return Object.entries(byCategory).map(([cat, entries]) => {
    const sorted = [...entries].sort((a, b) => b.count - a.count);
    const totalOverrides = entries.reduce((sum, e) => sum + e.count, 0);
    return {
      category: cat as StoreCategory,
      topCardId: sorted[0].cardId,
      overrideCount: totalOverrides - sorted[0].count,
    };
  });
}
