import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCardStore } from '../../store/useCardStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import CreditCardView, { CARD_HEIGHT, CARD_WIDTH } from '../../components/CreditCardView';
import { COLORS } from '../../utils/constants';
import { CreditCard } from '../../types';

const CARD_OVERLAP = CARD_HEIGHT * 0.28;

function AnimatedCard({
  card,
  index,
  onPress,
  onLongPress,
}: {
  card: CreditCard;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        delay: index * 90,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        delay: index * 90,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.92}>
        <View>
          <CreditCardView card={card} />
          {card.pausedFromRecommendations && (
            <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#FF6B6B', fontSize: 10, fontWeight: '800' }}>⏸ Paused</Text>
            </View>
          )}
          {card.templateUpdatedAt && (
            <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#000', fontSize: 10, fontWeight: '800' }}>Update available</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function WalletScreen() {
  const router = useRouter();
  const { cards, deleteCard } = useCardStore();
  const { subscriptions, deleteSubscription } = useSubscriptionStore();

  const handleLongPress = (card: CreditCard) => {
    Alert.alert(card.nickname, 'What would you like to do?', [
      { text: 'View Details', onPress: () => router.push(`/card/${card.id}`) },
      {
        text: 'Delete Card',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Card', `Remove ${card.nickname} from your wallet?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteCard(card.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>My Wallet</Text>
          <Text style={styles.headerTitle}>{cards.length} Cards</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-card')} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings' as any)} activeOpacity={0.8}>
            <FontAwesome name="cog" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={index < cards.length - 1 ? { marginBottom: -CARD_OVERLAP } : undefined}>
            <AnimatedCard
              card={item}
              index={index}
              onPress={() => router.push(`/card/${item.id}`)}
              onLongPress={() => handleLongPress(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCards}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyTitle}>No cards yet</Text>
            <Text style={styles.emptySub}>Add your credit cards to start maximising rewards at every store</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-card')} activeOpacity={0.8}>
              <Text style={styles.emptyBtnText}>Add Your First Card</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: cards.length > 0 ? CARD_OVERLAP + 24 : 0 }}>
            {cards.length > 0 && (
              <Text style={[styles.hint, { textAlign: 'center', marginBottom: 24 }]}>Tap a card to view details  •  Hold to manage</Text>
            )}

            {/* Subscriptions — always shown, even when no cards */}
            <View style={styles.subSection}>
              <View style={styles.subHeader}>
                <Text style={styles.subTitle}>Subscriptions & Auto Payments</Text>
                <TouchableOpacity onPress={() => router.push('/add-subscription' as any)} style={styles.subAddBtn}>
                  <Text style={styles.subAddText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {subscriptions.length === 0 ? (
                <TouchableOpacity style={styles.subEmpty} onPress={() => router.push('/add-subscription' as any)} activeOpacity={0.75}>
                  <Text style={styles.subEmptyText}>Track Netflix, Spotify, Amazon Prime, utilities and more — see which cards earn the most on your recurring bills and auto payments.</Text>
                  <Text style={styles.subEmptyLink}>+ Add subscription or payment</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {[...subscriptions].sort((a, b) => {
                    const aYr = a.period === 'monthly' ? a.amount * 12 : a.amount;
                    const bYr = b.period === 'monthly' ? b.amount * 12 : b.amount;
                    return bYr - aYr;
                  }).map((sub) => {
                    const monthly = sub.period === 'annual' ? sub.amount / 12 : sub.amount;
                    const annual = sub.period === 'monthly' ? sub.amount * 12 : sub.amount;
                    const payingCard = cards.find((c) => c.id === sub.cardId);
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        style={styles.subRow}
                        onPress={() => router.push({ pathname: '/add-subscription', params: { subId: sub.id } } as any)}
                        onLongPress={() =>
                          Alert.alert(sub.name, 'What would you like to do?', [
                            { text: 'Edit', onPress: () => router.push({ pathname: '/add-subscription', params: { subId: sub.id } } as any) },
                            { text: 'Remove', style: 'destructive', onPress: () => deleteSubscription(sub.id) },
                            { text: 'Cancel', style: 'cancel' },
                          ])
                        }
                        activeOpacity={0.75}
                      >
                        <View style={styles.subRowLeft}>
                          <Text style={styles.subName}>{sub.name}</Text>
                          {payingCard && <Text style={styles.subCard}>{payingCard.nickname}</Text>}
                        </View>
                        <View style={styles.subRowRight}>
                          <Text style={styles.subAmount}>${monthly.toFixed(2)}/mo</Text>
                          <Text style={styles.subAnnual}>${annual.toFixed(0)}/yr</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={styles.subTotal}>
                    <Text style={styles.subTotalLabel}>Total</Text>
                    <Text style={styles.subTotalAmount}>
                      ${subscriptions.reduce((s, sub) => s + (sub.period === 'monthly' ? sub.amount * 12 : sub.amount), 0).toFixed(0)}/yr
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  hint: { color: COLORS.textMuted, fontSize: 12 },
  subSection: {
    marginHorizontal: 24,
    marginBottom: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    paddingTop: 20,
    gap: 10,
  },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  subAddBtn: { backgroundColor: COLORS.accent + '33', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: COLORS.accentLight + '44' },
  subAddText: { color: COLORS.accentLight, fontSize: 13, fontWeight: '700' },
  subEmpty: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 8,
  },
  subEmptyText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  subEmptyLink: { color: COLORS.accentLight, fontSize: 13, fontWeight: '700' },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  subRowLeft: { gap: 2, flex: 1 },
  subName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  subCard: { color: COLORS.textMuted, fontSize: 11 },
  subRowRight: { alignItems: 'flex-end', gap: 2 },
  subAmount: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  subAnnual: { color: COLORS.textMuted, fontSize: 11 },
  subTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  subTotalLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  subTotalAmount: { color: COLORS.accentLight, fontSize: 13, fontWeight: '700' },
  emptyCards: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyEmoji: { fontSize: 72, marginBottom: 20 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '800', marginBottom: 10 },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 26,
  },
  emptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
