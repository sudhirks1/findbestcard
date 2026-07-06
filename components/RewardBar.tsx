import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardScore } from '../types';
import { getRewardDisplay } from '../utils/recommendations';
import { COLORS } from '../utils/constants';

interface Props {
  scores: CardScore[];
}

export default function RewardBar({ scores }: Props) {
  if (!scores.length) return null;
  const maxRate = Math.max(...scores.map((s) => s.rewardRate));

  return (
    <View style={styles.container}>
      {scores.map((score, i) => {
        const barWidth = maxRate > 0 ? (score.rewardRate / maxRate) * 100 : 0;
        const isTop = score.isRecommended;
        const barColor = isTop ? COLORS.green : COLORS.accentLight + '88';

        return (
          <View key={score.card.id} style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={[styles.cardName, isTop && styles.cardNameTop]} numberOfLines={1}>
                {score.card.nickname}
              </Text>
              <Text style={styles.lastFour}>••{score.card.lastFour}</Text>
            </View>
            <View style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
              </View>
            </View>
            <Text style={[styles.rate, isTop && styles.rateTop]}>
              {getRewardDisplay(score.rewardRate, score.rewardType)}
            </Text>
            {score.habitBoost && <Text style={styles.habitBadge}>★</Text>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  labelCol: {
    width: 120,
  },
  cardName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  cardNameTop: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  lastFour: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  barCol: {
    flex: 1,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  rate: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  rateTop: {
    color: COLORS.green,
    fontWeight: '800',
  },
  habitBadge: {
    color: COLORS.gold,
    fontSize: 12,
  },
});
