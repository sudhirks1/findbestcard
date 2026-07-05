import { CreditCard, HabitEntry } from '../types';
import { CATEGORY_META } from './constants';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callClaude(
  apiKey: string,
  messages: ClaudeMessage[],
  systemPrompt: string,
  model = 'claude-haiku-4-5-20251001'
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const msg = (err as any)?.error?.message;
    throw new Error(msg ?? `API error ${res.status}`);
  }

  const data = await res.json() as { content: Array<{ text: string }> };
  return data.content[0]?.text ?? '';
}

export function buildWalletSystemPrompt(cards: CreditCard[], habits: HabitEntry[]): string {
  if (cards.length === 0) {
    return 'You are a credit card rewards expert. The user has no cards in their wallet yet. Encourage them to add cards and explain how the app works.';
  }

  const cardDescriptions = cards.map((card, i) => {
    const feeStr = card.annualFee > 0 ? `$${card.annualFee}/yr` : 'No annual fee';

    const rewardLines = [
      `  Base: ${card.baseReward}${card.baseRewardType === 'cashback' ? '%' : 'x'} ${card.baseRewardType}`,
      ...card.rewards.map((r) => {
        const meta = CATEGORY_META[r.category];
        const cap = r.maxSpend ? ` (up to $${r.maxSpend.toLocaleString()}/${r.maxSpendPeriod ?? 'yr'})` : '';
        return `  ${meta.emoji} ${meta.label}: ${r.rewardRate}${r.rewardType === 'cashback' ? '%' : 'x'} ${r.rewardType}${cap}`;
      }),
    ];

    const benefits = card.benefits ?? [];
    const benefitLines = benefits.map((b) => {
      const annual = b.period === 'monthly' ? b.value * 12 : b.value;
      const periodStr = b.period === 'monthly' ? `$${b.value}/mo = $${annual}/yr` : `$${annual}/yr`;
      return `  ✓ ${b.label}: ${periodStr}`;
    });

    const totalCredits = benefits.reduce(
      (sum, b) => sum + (b.period === 'monthly' ? b.value * 12 : b.value),
      0
    );
    const netCost = card.annualFee - totalCredits;
    const netStr =
      totalCredits > 0
        ? netCost > 0
          ? `  → Net effective cost: $${netCost}/yr`
          : netCost === 0
          ? `  → Net effective cost: $0 (break-even)`
          : `  → Net effective cost: earns $${Math.abs(netCost)}/yr in credits`
        : '';

    return [
      `${i + 1}. ${card.nickname} (${card.bank}, ${card.network.toUpperCase()})`,
      `  Annual fee: ${feeStr}`,
      ...rewardLines,
      ...(benefitLines.length > 0 ? ['  Annual credits/benefits:'] : []),
      ...benefitLines,
      netStr,
      card.notes ? `  Notes: ${card.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  const totalFees = cards.reduce((s, c) => s + c.annualFee, 0);
  const totalCredits = cards.reduce((s, c) => {
    return s + (c.benefits ?? []).reduce((bs, b) => bs + (b.period === 'monthly' ? b.value * 12 : b.value), 0);
  }, 0);

  const habitLines =
    habits.length > 0
      ? habits
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((h) => {
            const meta = CATEGORY_META[h.category];
            const card = cards.find((c) => c.id === h.cardId);
            return `  ${meta.emoji} ${meta.label}: prefers ${card?.nickname ?? 'unknown'} (${h.count}x)`;
          })
      : ['  No spending habits tracked yet.'];

  return `You are a credit card rewards expert helping the user optimize their wallet. Be concise, specific, and reference their actual card names. Give actionable advice.

CURRENT WALLET (${cards.length} card${cards.length !== 1 ? 's' : ''}):
${cardDescriptions.join('\n\n')}

TOTAL ANNUAL FEES: $${totalFees}${totalCredits > 0 ? ` | TOTAL CREDITS: $${totalCredits} | NET COST: $${totalFees - totalCredits}` : ''}

SPENDING HABITS (from app tracking):
${habitLines.join('\n')}`;
}

export const STRATEGY_PROMPT =
  'Analyse my credit card wallet. Tell me: 1) Which cards are earning their keep vs. not worth the fee, 2) Any card I should consider dropping and why, 3) 1-2 cards worth adding to fill gaps. Be direct and specific. Use bullet points.';
