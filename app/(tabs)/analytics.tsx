import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCardStore } from '../../store/useCardStore';
import { useHabitStore } from '../../store/useHabitStore';
import GlassContainer from '../../components/GlassContainer';
import { COLORS, CATEGORY_META, CARD_COLOR_SCHEMES } from '../../utils/constants';
import { getLearningInsights } from '../../utils/learning';
import { StoreCategory } from '../../types';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <GlassContainer style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </GlassContainer>
  );
}

export default function AnalyticsScreen() {
  const { cards } = useCardStore();
  const { visits, habits, clearHistory } = useHabitStore();

  const insights = getLearningInsights(habits);
  const totalVisits = visits.length;
  const followedCount = visits.filter((v) => v.followedRecommendation).length;
  const followRate = totalVisits > 0 ? Math.round((followedCount / totalVisits) * 100) : 0;

  // Category usage breakdown
  const catCounts: Record<string, number> = {};
  for (const v of visits) {
    catCounts[v.storeCategory] = (catCounts[v.storeCategory] ?? 0) + 1;
  }
  const topCategories = Object.entries(catCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Card usage counts
  const cardCounts: Record<string, number> = {};
  for (const v of visits) {
    cardCounts[v.usedCardId] = (cardCounts[v.usedCardId] ?? 0) + 1;
  }

  const handleClear = () => {
    Alert.alert(
      'Clear History',
      'This will reset all habit data and usage history. The app will no longer have learned preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearHistory },
      ]
    );
  };

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerSub}>Learning & Stats</Text>
        <Text style={styles.headerTitle}>Insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Overview Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Total Visits" value={String(totalVisits)} />
          <StatCard
            label="Followed Rec."
            value={totalVisits > 0 ? `${followRate}%` : '—'}
            sub={totalVisits > 0 ? `${followedCount} of ${totalVisits}` : undefined}
          />
          <StatCard label="Cards" value={String(cards.length)} />
        </View>

        {/* Learned Preferences */}
        {insights.length > 0 ? (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>🧠 Learned Preferences</Text>
            <Text style={styles.sectionSub}>Based on your actual card usage</Text>
            {insights.map((insight) => {
              const cat = insight.category as StoreCategory;
              const meta = CATEGORY_META[cat];
              const card = cards.find((c) => c.id === insight.topCardId);
              if (!card) return null;
              const colors = CARD_COLOR_SCHEMES[card.colorScheme] ?? CARD_COLOR_SCHEMES.sapphire;
              return (
                <View key={cat} style={styles.insightRow}>
                  <Text style={styles.insightEmoji}>{meta.emoji}</Text>
                  <View style={styles.insightMid}>
                    <Text style={styles.insightCat}>{meta.label}</Text>
                    <Text style={styles.insightCard}>{card.nickname}</Text>
                  </View>
                  <View style={[styles.insightDot, { backgroundColor: colors[1] }]} />
                </View>
              );
            })}
          </GlassContainer>
        ) : (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>🧠 Learned Preferences</Text>
            <View style={styles.emptyInsight}>
              <Text style={styles.emptyInsightText}>
                No habits learned yet.{'\n'}Use the Best Card tab a few times and I'll start learning your preferences.
              </Text>
            </View>
          </GlassContainer>
        )}

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Most Visited Categories</Text>
            {topCategories.map(([cat, count]) => {
              const meta = CATEGORY_META[cat as StoreCategory];
              const pct = Math.round((count / totalVisits) * 100);
              return (
                <View key={cat} style={styles.catRow}>
                  <Text style={styles.catEmoji}>{meta.emoji}</Text>
                  <Text style={styles.catName}>{meta.label}</Text>
                  <View style={styles.catBarTrack}>
                    <View style={[styles.catBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.catCount}>{count}x</Text>
                </View>
              );
            })}
          </GlassContainer>
        )}

        {/* Card Usage */}
        {Object.keys(cardCounts).length > 0 && (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Card Usage</Text>
            {Object.entries(cardCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([cardId, count]) => {
                const card = cards.find((c) => c.id === cardId);
                if (!card) return null;
                const colors = CARD_COLOR_SCHEMES[card.colorScheme] ?? CARD_COLOR_SCHEMES.sapphire;
                const pct = Math.round((count / totalVisits) * 100);
                return (
                  <View key={cardId} style={styles.catRow}>
                    <View style={[styles.cardDot, { backgroundColor: colors[1] }]} />
                    <Text style={styles.catName} numberOfLines={1}>{card.nickname}</Text>
                    <View style={styles.catBarTrack}>
                      <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: colors[1] }]} />
                    </View>
                    <Text style={styles.catCount}>{count}x</Text>
                  </View>
                );
              })}
          </GlassContainer>
        )}

        {/* Recent History */}
        {visits.length > 0 && (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 Recent Activity</Text>
            {visits.slice(0, 8).map((v) => {
              const card = cards.find((c) => c.id === v.usedCardId);
              const meta = CATEGORY_META[v.storeCategory as StoreCategory];
              const date = new Date(v.timestamp);
              return (
                <View key={v.id} style={styles.histRow}>
                  <Text style={styles.histEmoji}>{meta?.emoji ?? '💳'}</Text>
                  <View style={styles.histMid}>
                    <Text style={styles.histStore}>{v.storeName}</Text>
                    <Text style={styles.histCard}>{card?.nickname ?? 'Unknown Card'}</Text>
                  </View>
                  <View style={styles.histRight}>
                    <Text style={styles.histDate}>{date.toLocaleDateString()}</Text>
                    <Text style={[styles.histTag, v.followedRecommendation ? styles.histTagGreen : styles.histTagOrange]}>
                      {v.followedRecommendation ? '✓ Rec' : '✎ Own'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </GlassContainer>
        )}

        {/* Clear Button */}
        {(visits.length > 0 || habits.length > 0) && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
            <Text style={styles.clearBtnText}>Reset All History & Learned Data</Text>
          </TouchableOpacity>
        )}

        {totalVisits === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySub}>
              Start using the Best Card tab to track your spending and let the app learn your habits
            </Text>
          </View>
        )}
      </ScrollView>
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
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.accentLight,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  statSub: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  section: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: -4,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  insightEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  insightMid: { flex: 1 },
  insightCat: { color: COLORS.textSecondary, fontSize: 12 },
  insightCard: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  insightDot: { width: 10, height: 10, borderRadius: 5 },
  emptyInsight: { paddingVertical: 8 },
  emptyInsightText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  catEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
  catName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    width: 110,
  },
  catBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    backgroundColor: COLORS.accentLight,
    borderRadius: 3,
  },
  catCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    width: 28,
    textAlign: 'right',
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  histEmoji: { fontSize: 20, width: 26 },
  histMid: { flex: 1 },
  histStore: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  histCard: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  histRight: { alignItems: 'flex-end', gap: 3 },
  histDate: { color: COLORS.textMuted, fontSize: 11 },
  histTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  histTagGreen: { backgroundColor: COLORS.green + '33', color: COLORS.green },
  histTagOrange: { backgroundColor: COLORS.gold + '33', color: COLORS.gold },
  clearBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.red + '55',
  },
  clearBtnText: { color: COLORS.red, fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 10 },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});
