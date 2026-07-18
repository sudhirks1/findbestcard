import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCardStore } from '../../store/useCardStore';
import { useHabitStore } from '../../store/useHabitStore';
import { useAuthStore } from '../../store/useAuthStore';
import CategorySelector from '../../components/CategorySelector';
import RewardBar from '../../components/RewardBar';
import GlassContainer from '../../components/GlassContainer';
import CreditCardView from '../../components/CreditCardView';
import { COLORS, CATEGORY_META, CARD_COLOR_SCHEMES } from '../../utils/constants';
import { rankCards, getRewardDisplay } from '../../utils/recommendations';
import { aiRecommend } from '../../utils/api';
import { StoreCategory, CardScore } from '../../types';

type Step = 'category' | 'result';

export default function RecommendScreen() {
  const { cards } = useCardStore();
  const { habits, recordVisit } = useHabitStore();
  const token = useAuthStore((s) => s.token);

  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
  const [scores, setScores] = useState<CardScore[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    points: { cardId: string; cardName: string; reason: string } | null;
    cashback: { cardId: string; cardName: string; reason: string } | null;
    advice: string;
  } | null>(null);
  const [pendingOverrideCardId, setPendingOverrideCardId] = useState<string | null>(null);

  const handleFind = async (cat: StoreCategory) => {
    if (cards.length === 0) {
      Alert.alert('No Cards', 'Add credit cards to your wallet first.');
      return;
    }
    // Issue 2: clear previous results immediately before computing new ones
    setAiResult(null);
    setAiLoading(false);
    setSelectedCategory(cat);
    const ranked = rankCards(cat, cards.filter((c) => !c.pausedFromRecommendations), habits);
    setScores(ranked);
    setStep('result');

    // Fetch AI advice text in background (card picks come from local ranking)
    if (token) {
      setAiLoading(true);
      try {
        const result = await aiRecommend(token, cat);
        setAiResult(result);
      } catch {
        // AI unavailable — local ranking still shown
      } finally {
        setAiLoading(false);
      }
    }
  };

  const OVERRIDE_REASONS = [
    'Accumulating rewards on this card',
    'Planning to cancel the other card',
    'Better sign-up bonus on this card',
    'Prefer this card for this merchant',
  ];

  const finishRecord = (cardId: string, overrideReason?: string) => {
    if (!selectedCategory) return;
    const recommendedCardId = scores.find((s) => s.isRecommended)?.card.id ?? '';
    recordVisit({
      storeName: CATEGORY_META[selectedCategory].label,
      storeCategory: selectedCategory,
      recommendedCardId,
      usedCardId: cardId,
      overrideReason,
    });
    Alert.alert('Recorded!', "I've learned from your choice and will factor this in next time.", [
      { text: 'Great!', onPress: reset },
    ]);
  };

  const handleUsedCard = (cardId: string) => {
    if (!selectedCategory) return;
    const topIds = [localCashbackTop?.card.id, localPointsTop?.card.id].filter(Boolean) as string[];
    if (topIds.length > 0 && !topIds.includes(cardId)) {
      setPendingOverrideCardId(cardId);
    } else {
      finishRecord(cardId);
    }
  };

  const reset = () => {
    setStep('category');
    setSelectedCategory(null);
    setScores([]);
    setAiResult(null);
  };

  // Issue 1: always use local ranking for which card to display — AI only provides advice text
  const localTop = scores.find((s) => s.isRecommended);
  const localCashbackTop = scores.find((s) => s.rewardType === 'cashback');
  const localPointsTop = scores.find((s) => s.rewardType !== 'cashback');

  // Determine user's preferred reward type from habit history
  const pointsUsageCount = habits.filter((h) => {
    const card = cards.find((c) => c.id === h.cardId);
    return card && (card.baseRewardType === 'points' || card.baseRewardType === 'miles');
  }).reduce((sum, h) => sum + h.count, 0);
  const cashbackUsageCount = habits.filter((h) => {
    const card = cards.find((c) => c.id === h.cardId);
    return card && card.baseRewardType === 'cashback';
  }).reduce((sum, h) => sum + h.count, 0);
  const prefersPoints = pointsUsageCount >= cashbackUsageCount;

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerSub}>Smart Rewards</Text>
        <Text style={styles.headerTitle}>Best Card</Text>
      </View>

      {step === 'category' ? (
        <View style={styles.categoryScreen}>
          <Text style={styles.sectionLabel}>What kind of store?</Text>
          <CategorySelector selected={selectedCategory} onSelect={handleFind} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Category badge */}
          <View style={styles.catBadge}>
            <Text style={styles.catEmoji}>{selectedCategory ? CATEGORY_META[selectedCategory].emoji : ''}</Text>
            <Text style={styles.catLabel}>{selectedCategory ? CATEGORY_META[selectedCategory].label : ''}</Text>
          </View>

          {/* AI Advice Panel */}
          <View style={styles.aiPanel}>
            <View style={styles.aiPanelHeader}>
              <FontAwesome name="magic" size={14} color={COLORS.accentLight} />
              <Text style={styles.aiPanelTitle}>AI Recommendations</Text>
              {aiLoading && <ActivityIndicator size="small" color={COLORS.accentLight} style={{ marginLeft: 8 }} />}
            </View>
            {aiLoading && !aiResult && (
              <Text style={styles.aiLoading}>Analysing your wallet and habits…</Text>
            )}
            {aiResult && (
              <>
                {(() => {
                  const hasBoth = !!(aiResult.points && aiResult.cashback);
                  const first = prefersPoints ? aiResult.points : aiResult.cashback;
                  const second = prefersPoints ? aiResult.cashback : aiResult.points;
                  const firstLabel = prefersPoints ? '⭐ Best Points / Miles' : '💵 Best Cash Back';
                  const secondLabel = prefersPoints ? '💵 Best Cash Back' : '⭐ Best Points / Miles';
                  return (
                    <>
                      {first && (
                        <View style={styles.aiPick}>
                          <Text style={styles.aiPickLabel}>{firstLabel}</Text>
                          <Text style={styles.aiPickName}>{first.cardName}</Text>
                          <Text style={styles.aiPickReason}>{first.reason}</Text>
                        </View>
                      )}
                      {second && (
                        <View style={[styles.aiPick, hasBoth && styles.aiPickBorderTop]}>
                          <Text style={styles.aiPickLabel}>{secondLabel}</Text>
                          <Text style={styles.aiPickName}>{second.cardName}</Text>
                          <Text style={styles.aiPickReason}>{second.reason}</Text>
                        </View>
                      )}
                    </>
                  );
                })()}
                <View style={styles.adviceBorder} />
                <Text style={styles.adviceLabel}>What you should do</Text>
                <Text style={styles.adviceText}>{aiResult.advice}</Text>
              </>
            )}
            {!aiLoading && !aiResult && (
              <Text style={styles.aiLoading}>Using local ranking (AI unavailable)</Text>
            )}
          </View>

          {/* Points & Cashback picks from local ranking — preferred type shown first */}
          {(() => {
            const catLabel = selectedCategory ? CATEGORY_META[selectedCategory].label : '';

            const pointsBlock = localPointsTop ? (
              <View key="points" style={styles.recommendedSection}>
                <View style={styles.recLabel}>
                  <Text style={styles.recStar}>⭐</Text>
                  <Text style={styles.recText}>Best Points / Miles Card</Text>
                </View>
                <CreditCardView card={localPointsTop.card} />
                <GlassContainer style={styles.recDetails}>
                  <Text style={styles.recRate}>{getRewardDisplay(localPointsTop.rewardRate, localPointsTop.rewardType)}</Text>
                  <Text style={styles.recRateLabel}>at {catLabel}</Text>
                  {localPointsTop.habitBoost && <Text style={styles.habitNote}>★ Matches your spending habits</Text>}
                </GlassContainer>
              </View>
            ) : null;

            const cashbackBlock = localCashbackTop ? (
              <View key="cashback" style={styles.recommendedSection}>
                <View style={styles.recLabel}>
                  <Text style={styles.recStar}>💵</Text>
                  <Text style={styles.recText}>Best Cash Back Card</Text>
                </View>
                <CreditCardView card={localCashbackTop.card} />
                <GlassContainer style={styles.recDetails}>
                  <Text style={styles.recRate}>{getRewardDisplay(localCashbackTop.rewardRate, localCashbackTop.rewardType)}</Text>
                  <Text style={styles.recRateLabel}>at {catLabel}</Text>
                  {localCashbackTop.habitBoost && <Text style={styles.habitNote}>★ Matches your spending habits</Text>}
                </GlassContainer>
              </View>
            ) : null;

            return prefersPoints
              ? <>{pointsBlock}{cashbackBlock}</>
              : <>{cashbackBlock}{pointsBlock}</>;
          })()}

          {/* Comparison */}
          {scores.length > 1 && (
            <GlassContainer style={styles.compSection}>
              <Text style={styles.compTitle}>All Cards Compared</Text>
              <RewardBar scores={scores} />
            </GlassContainer>
          )}

          {/* Which card did you use? */}
          <GlassContainer style={styles.usedSection}>
            <Text style={styles.usedTitle}>Which card did you use?</Text>
            <Text style={styles.usedSub}>Help me learn your preferences</Text>
            <View style={styles.usedCards}>
              {scores.map((s) => {
                const colors = CARD_COLOR_SCHEMES[s.card.colorScheme] ?? CARD_COLOR_SCHEMES.sapphire;
                const isTopPick = s.card.id === localCashbackTop?.card.id || s.card.id === localPointsTop?.card.id;
                return (
                  <TouchableOpacity
                    key={s.card.id}
                    onPress={() => handleUsedCard(s.card.id)}
                    activeOpacity={0.8}
                    style={styles.usedCardBtn}
                  >
                    <LinearGradient
                      colors={[colors[0], colors[1]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.usedCardGrad, isTopPick && styles.usedCardAiPick]}
                    >
                      <Text style={styles.usedCardName} numberOfLines={1}>
                        {s.card.nickname}
                      </Text>
                      <Text style={styles.usedCardRate}>
                        {getRewardDisplay(s.rewardRate, s.rewardType)}
                        {isTopPick ? ' ⭐' : ''}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassContainer>

          <TouchableOpacity style={styles.backBtn} onPress={reset} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>← New Search</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Override reason modal */}
      <Modal
        visible={pendingOverrideCardId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingOverrideCardId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Why this card instead?</Text>
            <Text style={styles.modalSub}>
              I'll remember this for future recommendations.
            </Text>
            {OVERRIDE_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonChip}
                onPress={() => {
                  const id = pendingOverrideCardId!;
                  setPendingOverrideCardId(null);
                  finishRecord(id, reason);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.reasonChipText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.reasonSkip}
              onPress={() => {
                const id = pendingOverrideCardId!;
                setPendingOverrideCardId(null);
                finishRecord(id);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.reasonSkipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 2,
  },
  categoryScreen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 16,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignSelf: 'flex-start',
  },
  catEmoji: { fontSize: 18, marginRight: 8 },
  catLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  aiPanel: {
    backgroundColor: 'rgba(5,150,105,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
    gap: 8,
  },
  aiPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiPanelTitle: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  aiLoading: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  aiPick: {
    gap: 3,
    paddingVertical: 6,
  },
  aiPickBorderTop: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    marginTop: 4,
    paddingTop: 10,
  },
  aiPickLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  aiPickName: {
    color: COLORS.accentLight,
    fontSize: 15,
    fontWeight: '800',
  },
  aiPickReason: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  aiReason: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  adviceBorder: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
  },
  adviceLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  adviceText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  recommendedSection: { gap: 12 },
  recLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recStar: { fontSize: 18 },
  recText: { color: COLORS.gold, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  recDetails: {
    padding: 16,
    alignItems: 'center',
  },
  recRate: {
    color: COLORS.green,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  recRateLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  habitNote: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  compSection: { padding: 16, gap: 12 },
  compTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  usedSection: { padding: 16 },
  usedTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  usedSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 14 },
  usedCards: { gap: 10 },
  usedCardBtn: { borderRadius: 14, overflow: 'hidden' },
  usedCardGrad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  usedCardAiPick: {
    borderWidth: 2,
    borderColor: COLORS.accentLight,
  },
  usedCardName: { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1 },
  usedCardRate: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  backBtnText: { color: COLORS.accentLight, fontSize: 15, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1A1F2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    gap: 12,
    borderTopWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  reasonChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  reasonChipText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  reasonSkip: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  reasonSkipText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
