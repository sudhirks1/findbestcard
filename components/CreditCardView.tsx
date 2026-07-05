import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditCard } from '../types';
import { CARD_COLOR_SCHEMES, NETWORK_LABELS } from '../utils/constants';

const { width } = Dimensions.get('window');
export const CARD_WIDTH = width - 48;
export const CARD_HEIGHT = CARD_WIDTH * 0.585;

interface Props {
  card: CreditCard;
  compact?: boolean;
}

function NetworkIcon({ network }: { network: string }) {
  const label = NETWORK_LABELS[network] ?? network.toUpperCase();
  return (
    <View style={styles.networkContainer}>
      {network === 'mastercard' ? (
        <View style={styles.mcContainer}>
          <View style={[styles.mcCircle, { backgroundColor: '#EB001B', marginRight: -8 }]} />
          <View style={[styles.mcCircle, { backgroundColor: '#F79E1B' }]} />
        </View>
      ) : network === 'amex' ? (
        <Text style={styles.networkText}>AMEX</Text>
      ) : network === 'discover' ? (
        <Text style={[styles.networkText, { color: '#FF6600' }]}>DISCOVER</Text>
      ) : (
        <Text style={[styles.networkText, { fontStyle: 'italic' }]}>VISA</Text>
      )}
    </View>
  );
}

export default function CreditCardView({ card, compact = false }: Props) {
  const colors = CARD_COLOR_SCHEMES[card.colorScheme] ?? CARD_COLOR_SCHEMES.sapphire;
  const h = compact ? CARD_HEIGHT * 0.7 : CARD_HEIGHT;
  const w = compact ? CARD_WIDTH * 0.85 : CARD_WIDTH;

  return (
    <LinearGradient
      colors={[colors[0], colors[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { width: w, height: h, borderRadius: compact ? 14 : 20 }]}
    >
      {/* Decorative circles */}
      <View style={[styles.circle, { width: h * 1.2, height: h * 1.2, top: -h * 0.3, right: -h * 0.3, opacity: 0.15 }]} />
      <View style={[styles.circle, { width: h * 0.8, height: h * 0.8, bottom: -h * 0.2, left: -h * 0.1, opacity: 0.1 }]} />

      <View style={styles.topRow}>
        <View>
          <Text style={[styles.bank, compact && styles.bankCompact]}>{card.bank}</Text>
          <Text style={[styles.nickname, compact && styles.nicknameCompact]} numberOfLines={1}>
            {card.nickname}
          </Text>
        </View>
        <NetworkIcon network={card.network} />
      </View>

      {!compact && (
        <Text style={styles.dots}>•••• •••• •••• {card.lastFour}</Text>
      )}

      <View style={styles.bottomRow}>
        {compact ? (
          <Text style={styles.lastFourCompact}>•••• {card.lastFour}</Text>
        ) : (
          <View>
            <Text style={styles.rewardPreview}>
              {card.baseReward}{card.baseRewardType === 'cashback' ? '%' : 'x'} base
            </Text>
            {card.rewards.length > 0 && (
              <Text style={styles.rewardSub}>
                Up to {Math.max(...card.rewards.map(r => r.rewardRate))}
                {card.rewards[0]?.rewardType === 'cashback' ? '%' : 'x'} on top categories
              </Text>
            )}
          </View>
        )}
        <View style={styles.bottomRight}>
          {card.rewardsBalance && !compact && (
            <Text style={styles.balance}>
              {card.rewardsBalance.amount.toLocaleString()}
              {card.baseRewardType === 'cashback' ? '¢' : card.baseRewardType === 'miles' ? ' mi' : ' pts'}
            </Text>
          )}
          {card.annualFee > 0 && (
            <Text style={styles.fee}>${card.annualFee}/yr</Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bank: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bankCompact: { fontSize: 10 },
  nickname: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: 200,
  },
  nicknameCompact: { fontSize: 13, fontWeight: '600' },
  dots: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '500',
    alignSelf: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rewardPreview: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  rewardSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  lastFourCompact: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    letterSpacing: 1,
  },
  bottomRight: { alignItems: 'flex-end', gap: 2 },
  balance: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fee: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
  },
  networkContainer: {
    alignItems: 'flex-end',
  },
  networkText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mcContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.9,
  },
});
