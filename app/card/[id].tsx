import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Keyboard,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCardStore } from '../../store/useCardStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useHabitStore } from '../../store/useHabitStore';
import GlassContainer from '../../components/GlassContainer';
import CreditCardView from '../../components/CreditCardView';
import { COLORS, CATEGORY_META, CARD_COLOR_SCHEMES } from '../../utils/constants';
import { getRewardDisplay } from '../../utils/recommendations';
import { StoreCategory, CategoryReward } from '../../types';
import { applyCardTemplate, serverCardToLocal } from '../../utils/api';

function getCurrentQuarter(): { label: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const s = (q - 1) * 3;
  return { label: `Q${q} ${now.getFullYear()} (${months[s]}–${months[s + 2]})` };
}

const ROTATING_RATE = 5;
const ROTATING_MAX_SPEND = 1500;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { cards, deleteCard, updateCard } = useCardStore();
  const token = useAuthStore((s) => s.token);
  const { visits, habits } = useHabitStore();
  const [applyingUpdate, setApplyingUpdate] = useState(false);

  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [rotatingModalVisible, setRotatingModalVisible] = useState(false);
  const [rotatingSelected, setRotatingSelected] = useState<StoreCategory[]>([]);

  const card = cards.find((c) => c.id === id);

  if (!card) {
    return (
      <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Card not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn2}>
            <Text style={styles.backBtn2Text}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const cardVisits = visits.filter((v) => v.usedCardId === id);
  const cardHabits = habits.filter((h) => h.cardId === id);

  const topCategories = [...card.rewards].sort((a, b) => b.rewardRate - a.rewardRate);
  const colors = CARD_COLOR_SCHEMES[card.colorScheme] ?? CARD_COLOR_SCHEMES.sapphire;

  const handleSaveBalance = () => {
    const amount = parseFloat(balanceDraft.replace(/,/g, ''));
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid amount', 'Enter a positive number.');
      return;
    }
    updateCard(card!.id, { rewardsBalance: { amount, updatedAt: Date.now() } });
    setEditingBalance(false);
    setBalanceDraft('');
    Keyboard.dismiss();
  };

  const handleDelete = () => {
    Alert.alert('Delete Card', `Remove ${card.nickname} from your wallet? This will also remove associated habit data.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteCard(card.id);
          router.back();
        },
      },
    ]);
  };

  const handleApplyUpdate = () => {
    Alert.alert(
      'Apply Card Update',
      `Apply the latest reward rates from the master catalog to ${card.nickname}?\n\nYour notes and personal settings will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            if (!token) return;
            setApplyingUpdate(true);
            try {
              const updated = await applyCardTemplate(token, card.id);
              updateCard(card.id, serverCardToLocal(updated));
              Alert.alert('Updated', 'Reward rates have been updated from the latest catalog.');
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not apply update.');
            } finally {
              setApplyingUpdate(false);
            }
          },
        },
      ],
    );
  };

  const totalTimesUsed = cardVisits.length;
  const followedRec = cardVisits.filter((v) => v.followedRecommendation).length;

  const currentQuarter = getCurrentQuarter();
  const currentRotating = card.rewards.filter((r) => r.isRotating);

  const openRotatingModal = () => {
    setRotatingSelected(currentRotating.map((r) => r.category));
    setRotatingModalVisible(true);
  };

  const toggleRotatingCat = (cat: StoreCategory) => {
    setRotatingSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const saveRotatingCategories = () => {
    const nonRotating = card.rewards.filter((r) => !r.isRotating);
    const newRotating: CategoryReward[] = rotatingSelected.map((cat) => ({
      category: cat,
      rewardRate: ROTATING_RATE,
      rewardType: card.baseRewardType,
      maxSpend: ROTATING_MAX_SPEND,
      maxSpendPeriod: 'quarterly',
      isRotating: true,
      quarterLabel: currentQuarter.label,
    }));
    updateCard(card.id, { rewards: [...nonRotating, ...newRotating] });
    setRotatingModalVisible(false);
  };

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push({ pathname: '/add-card', params: { cardId: card.id } })} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Card Visual */}
        <View style={styles.cardWrapper}>
          <CreditCardView card={card} />
        </View>

        {/* Template update banner */}
        {card.templateUpdatedAt && (
          <TouchableOpacity
            style={styles.updateBanner}
            onPress={handleApplyUpdate}
            activeOpacity={0.85}
            disabled={applyingUpdate}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.updateBannerTitle}>Reward rates updated</Text>
              <Text style={styles.updateBannerSub}>
                The master catalog has new rates for this card. Tap to apply — your notes won't change.
              </Text>
            </View>
            {applyingUpdate
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={styles.updateBannerArrow}>Apply →</Text>
            }
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <GlassContainer style={styles.statBox}>
            <Text style={styles.statVal}>{totalTimesUsed}</Text>
            <Text style={styles.statLbl}>Times Used</Text>
          </GlassContainer>
          <GlassContainer style={styles.statBox}>
            <Text style={styles.statVal}>
              {card.baseReward}{card.baseRewardType === 'cashback' ? '%' : 'x'}
            </Text>
            <Text style={styles.statLbl}>Base Reward</Text>
          </GlassContainer>
          <GlassContainer style={styles.statBox}>
            <Text style={styles.statVal}>
              {card.annualFee > 0 ? `$${card.annualFee}` : 'Free'}
            </Text>
            <Text style={styles.statLbl}>Annual Fee</Text>
          </GlassContainer>
        </View>

        {/* Reward Categories */}
        <GlassContainer style={styles.section}>
          <Text style={styles.sectionTitle}>Reward Rates</Text>

          {/* Base */}
          <View style={styles.rewardRow}>
            <View style={[styles.rewardDot, { backgroundColor: colors[1] + '88' }]} />
            <Text style={styles.rewardCat}>All other purchases</Text>
            <Text style={styles.rewardRate}>
              {getRewardDisplay(card.baseReward, card.baseRewardType)}
            </Text>
          </View>

          {topCategories.map((r) => {
            const meta = CATEGORY_META[r.category as StoreCategory];
            const isHigh = r.rewardRate >= 3;
            return (
              <View key={r.category} style={styles.rewardRow}>
                <Text style={styles.rewardEmoji}>{meta.emoji}</Text>
                <View style={styles.rewardMid}>
                  <Text style={styles.rewardCat}>{meta.label}</Text>
                  {r.maxSpend && (
                    <Text style={styles.rewardCap}>
                      Up to ${r.maxSpend.toLocaleString()}/{r.maxSpendPeriod ?? 'yr'}
                    </Text>
                  )}
                </View>
                <Text style={[styles.rewardRate, isHigh && styles.rewardRateHigh]}>
                  {getRewardDisplay(r.rewardRate, r.rewardType)}
                </Text>
              </View>
            );
          })}
        </GlassContainer>

        {/* Rotating Rewards */}
        <GlassContainer style={styles.section}>
          <View style={styles.rotatingHeader}>
            <View>
              <Text style={styles.sectionTitle}>🔄 Quarterly Rotating Rewards</Text>
              <Text style={styles.rotatingQtr}>{currentQuarter.label}</Text>
            </View>
            <TouchableOpacity style={styles.rotatingUpdateBtn} onPress={openRotatingModal}>
              <Text style={styles.rotatingUpdateText}>Update</Text>
            </TouchableOpacity>
          </View>
          {currentRotating.length === 0 ? (
            <Text style={styles.rotatingEmpty}>
              No rotating categories set for this quarter.{'\n'}Tap Update if this card has bonus categories (e.g. Discover it, Chase Freedom).
            </Text>
          ) : (
            currentRotating.map((r) => {
              const meta = CATEGORY_META[r.category as StoreCategory];
              return (
                <View key={r.category} style={styles.rewardRow}>
                  <Text style={styles.rewardEmoji}>{meta.emoji}</Text>
                  <View style={styles.rewardMid}>
                    <Text style={styles.rewardCat}>{meta.label}</Text>
                    <Text style={styles.rewardCap}>Up to ${ROTATING_MAX_SPEND}/qtr · {r.quarterLabel}</Text>
                  </View>
                  <Text style={[styles.rewardRate, styles.rewardRateHigh]}>
                    {getRewardDisplay(r.rewardRate, r.rewardType)}
                  </Text>
                </View>
              );
            })
          )}
        </GlassContainer>

        {/* Admin Rates Lock */}
        <GlassContainer style={styles.section}>
          <View style={styles.pinnedRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Lock My Rates</Text>
              <Text style={styles.pinnedSub}>
                {card.pinnedRates
                  ? 'Admin card updates won\'t overwrite your custom rates.'
                  : 'Admin updates will auto-sync to keep your card rates current.'}
              </Text>
            </View>
            <Switch
              value={!!card.pinnedRates}
              onValueChange={(v) => updateCard(card.id, { pinnedRates: v })}
              trackColor={{ false: COLORS.surfaceBorder, true: COLORS.accent }}
              thumbColor={card.pinnedRates ? COLORS.accentLight : '#888'}
            />
          </View>
        </GlassContainer>

        {/* Hotel Reward */}
        {card.hotelRewardRate ? (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>🏨 Hotel Reward Priority</Text>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>🏨</Text>
              <Text style={styles.rewardCat}>Hotel Reward Rate</Text>
              <Text style={[styles.rewardRate, styles.rewardRateHigh]}>
                {getRewardDisplay(card.hotelRewardRate, 'points')}
              </Text>
            </View>
            <Text style={styles.rewardCap}>Used as secondary priority when two cards tie on a category</Text>
          </GlassContainer>
        ) : null}

        {/* Rewards Balance */}
        <GlassContainer style={styles.section}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.sectionTitle}>Rewards Balance</Text>
              {card.rewardsBalance && (
                <Text style={styles.balanceDate}>
                  Updated {new Date(card.rewardsBalance.updatedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
            {!editingBalance && (
              <TouchableOpacity
                style={styles.balanceEditBtn}
                onPress={() => {
                  setBalanceDraft(card.rewardsBalance ? String(card.rewardsBalance.amount) : '');
                  setEditingBalance(true);
                }}
              >
                <Text style={styles.balanceEditBtnText}>{card.rewardsBalance ? 'Update' : '+ Add'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingBalance ? (
            <View style={styles.balanceInputRow}>
              <TextInput
                style={styles.balanceInput}
                value={balanceDraft}
                onChangeText={setBalanceDraft}
                placeholder="e.g. 23450"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                autoFocus
              />
              <Text style={styles.balanceUnit}>
                {card.baseRewardType === 'cashback' ? 'cents' : card.baseRewardType === 'miles' ? 'miles' : 'pts'}
              </Text>
              <TouchableOpacity style={styles.balanceSaveBtn} onPress={handleSaveBalance} activeOpacity={0.85}>
                <Text style={styles.balanceSaveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingBalance(false)} style={{ paddingHorizontal: 6 }}>
                <Text style={styles.balanceCancelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : card.rewardsBalance ? (
            <View style={styles.balanceDisplay}>
              <Text style={styles.balanceAmount}>
                {card.rewardsBalance.amount.toLocaleString()}
              </Text>
              <Text style={styles.balanceAmountUnit}>
                {card.baseRewardType === 'cashback' ? ' cents' : card.baseRewardType === 'miles' ? ' miles' : ' points'}
              </Text>
            </View>
          ) : (
            <Text style={styles.balanceEmpty}>
              No balance recorded yet — tap "+ Add" to track your current points or cash back balance.
            </Text>
          )}
        </GlassContainer>

        {/* Benefits */}
        {card.benefits && card.benefits.length > 0 ? (
          <GlassContainer style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Card Benefits & Credits</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/add-card', params: { cardId: card.id, startStep: 'benefits' } })}
                style={styles.editBenefitsBtn}
              >
                <Text style={styles.editBenefitsBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
            {card.benefits.map((b, i) => {
              const annual = b.period === 'monthly' ? b.value * 12 : b.value;
              return (
                <View key={i} style={styles.benefitRow}>
                  <View style={styles.benefitDot} />
                  <View style={styles.benefitMid}>
                    <Text style={styles.benefitLabel}>{b.label}</Text>
                    {b.notes ? <Text style={styles.benefitNotes}>{b.notes}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.benefitValue}>
                      {b.period === 'monthly' ? `$${b.value}/mo` : `$${annual}/yr`}
                    </Text>
                    {b.period === 'monthly' && (
                      <Text style={styles.benefitValueAnnual}>${annual}/yr</Text>
                    )}
                  </View>
                </View>
              );
            })}
            {(() => {
              const totalCredits = card.benefits!.reduce(
                (s, b) => s + (b.period === 'monthly' ? b.value * 12 : b.value), 0
              );
              const net = card.annualFee - totalCredits;
              return (
                <View style={styles.netCostRow}>
                  <Text style={styles.netCostLabel}>
                    ${card.annualFee} fee − ${totalCredits} credits
                  </Text>
                  <Text style={[styles.netCostValue, net <= 0 && styles.netCostGreen]}>
                    {net <= 0 ? `Earns $${Math.abs(net)}/yr` : `Net $${net}/yr`}
                  </Text>
                </View>
              );
            })()}
          </GlassContainer>
        ) : (
          <TouchableOpacity
            style={styles.addBenefitsPrompt}
            onPress={() => router.push({ pathname: '/add-card', params: { cardId: card.id, startStep: 'benefits' } })}
            activeOpacity={0.8}
          >
            <Text style={styles.addBenefitsIcon}>✦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.addBenefitsTitle}>Add Card Benefits & Credits</Text>
              <Text style={styles.addBenefitsSub}>Track Uber Cash, travel credits, free nights and more to see your card's true net cost</Text>
            </View>
            <Text style={styles.addBenefitsChevron}>→</Text>
          </TouchableOpacity>
        )}

        {/* Notes */}
        {card.notes && (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{card.notes}</Text>
          </GlassContainer>
        )}

        {/* Habit Data */}
        {cardHabits.length > 0 && (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>🧠 Your Usage Patterns</Text>
            {cardHabits
              .sort((a, b) => b.count - a.count)
              .map((h) => {
                const meta = CATEGORY_META[h.category as StoreCategory];
                return (
                  <View key={h.category} style={styles.habitRow}>
                    <Text style={styles.habitEmoji}>{meta.emoji}</Text>
                    <Text style={styles.habitCat}>{meta.label}</Text>
                    <Text style={styles.habitCount}>{h.count}x chosen</Text>
                  </View>
                );
              })}
          </GlassContainer>
        )}

        {/* Recent uses */}
        {cardVisits.length > 0 && (
          <GlassContainer style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Uses</Text>
            {cardVisits.slice(0, 6).map((v) => {
              const meta = CATEGORY_META[v.storeCategory as StoreCategory];
              const date = new Date(v.timestamp);
              return (
                <View key={v.id} style={styles.visitRow}>
                  <Text style={styles.visitEmoji}>{meta.emoji}</Text>
                  <View style={styles.visitMid}>
                    <Text style={styles.visitStore}>{v.storeName}</Text>
                    <Text style={styles.visitDate}>{date.toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.visitTag, v.followedRecommendation ? styles.tagGreen : styles.tagOrange]}>
                    {v.followedRecommendation ? '✓ Rec' : '✎ Own'}
                  </Text>
                </View>
              );
            })}
          </GlassContainer>
        )}
      </ScrollView>

      {/* Rotating categories modal */}
      <Modal visible={rotatingModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setRotatingModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Rotating Categories</Text>
            <TouchableOpacity onPress={saveRotatingCategories}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>{currentQuarter.label} · {ROTATING_RATE}% up to ${ROTATING_MAX_SPEND}</Text>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {(Object.keys(CATEGORY_META) as StoreCategory[])
              .filter((c) => c !== 'other')
              .map((cat) => {
                const meta = CATEGORY_META[cat];
                const selected = rotatingSelected.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catRow, selected && styles.catRowSelected]}
                    onPress={() => toggleRotatingCat(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.catRowEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.catRowLabel, selected && styles.catRowLabelSelected]}>{meta.label}</Text>
                    {selected && <Text style={styles.catCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: COLORS.textPrimary, fontSize: 20 },
  headerActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
  },
  editBtnText: { color: COLORS.accentLight, fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.red + '55',
  },
  deleteBtnText: { color: COLORS.red, fontSize: 13, fontWeight: '600' },
  scroll: { paddingHorizontal: 24, paddingBottom: 60, gap: 16 },
  cardWrapper: { alignItems: 'center' },
  updateBanner: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  updateBannerTitle: { color: '#000', fontSize: 14, fontWeight: '800' },
  updateBannerSub: { color: 'rgba(0,0,0,0.65)', fontSize: 12, marginTop: 2, lineHeight: 17 },
  updateBannerArrow: { color: '#000', fontSize: 14, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, padding: 14, alignItems: 'center' },
  statVal: { color: COLORS.accentLight, fontSize: 20, fontWeight: '900' },
  statLbl: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  section: { padding: 16, gap: 10 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rewardDot: { width: 10, height: 10, borderRadius: 5 },
  rewardEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
  rewardMid: { flex: 1 },
  rewardCat: { color: COLORS.textSecondary, fontSize: 14 },
  rewardCap: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  rewardRate: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  rewardRateHigh: { color: COLORS.green },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  balanceEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
  },
  balanceEditBtnText: { color: COLORS.accentLight, fontSize: 12, fontWeight: '700' },
  balanceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  balanceInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
  },
  balanceUnit: { color: COLORS.textMuted, fontSize: 12 },
  balanceSaveBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  balanceSaveBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  balanceCancelText: { color: COLORS.textMuted, fontSize: 16 },
  balanceDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 8 },
  balanceAmount: {
    color: COLORS.accentLight,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  balanceAmountUnit: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
  balanceEmpty: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  editBenefitsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
  },
  editBenefitsBtnText: { color: COLORS.accentLight, fontSize: 12, fontWeight: '600' },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  benefitDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginTop: 5,
  },
  benefitMid: { flex: 1 },
  benefitLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  benefitNotes: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  benefitValue: { color: COLORS.green, fontSize: 13, fontWeight: '700' },
  benefitValueAnnual: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  netCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  netCostLabel: { color: COLORS.textSecondary, fontSize: 12 },
  netCostValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  netCostGreen: { color: COLORS.green },
  addBenefitsPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(52,211,153,0.07)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '33',
  },
  addBenefitsIcon: { fontSize: 22, color: COLORS.accentLight },
  addBenefitsTitle: { color: COLORS.accentLight, fontSize: 14, fontWeight: '700' },
  addBenefitsSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, lineHeight: 16 },
  addBenefitsChevron: { color: COLORS.accentLight, fontSize: 16, fontWeight: '700' },
  notes: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  habitEmoji: { fontSize: 18, width: 26 },
  habitCat: { flex: 1, color: COLORS.textSecondary, fontSize: 14 },
  habitCount: { color: COLORS.accentLight, fontSize: 13, fontWeight: '700' },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  visitEmoji: { fontSize: 18, width: 26 },
  visitMid: { flex: 1 },
  visitStore: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  visitDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  visitTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    overflow: 'hidden',
  },
  tagGreen: { backgroundColor: COLORS.green + '33', color: COLORS.green },
  tagOrange: { backgroundColor: COLORS.gold + '33', color: COLORS.gold },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { color: COLORS.textSecondary, fontSize: 18 },
  backBtn2: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backBtn2Text: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  // Rotating rewards
  rotatingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rotatingQtr: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  rotatingUpdateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
  },
  rotatingUpdateText: { color: COLORS.accentLight, fontSize: 12, fontWeight: '700' },
  rotatingEmpty: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  // Pinned rates
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pinnedSub: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  // Modal
  modal: { flex: 1, backgroundColor: '#0D1F14' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  modalSub: { color: COLORS.textMuted, fontSize: 12, paddingHorizontal: 20, paddingTop: 10 },
  cancelText: { color: COLORS.textSecondary, fontSize: 16 },
  saveText: { color: COLORS.accentLight, fontSize: 16, fontWeight: '700' },
  modalBody: { padding: 16, gap: 8 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  catRowSelected: {
    backgroundColor: 'rgba(5,150,105,0.15)',
    borderColor: COLORS.accentLight + '88',
  },
  catRowEmoji: { fontSize: 20, width: 28 },
  catRowLabel: { flex: 1, color: COLORS.textSecondary, fontSize: 15 },
  catRowLabelSelected: { color: COLORS.textPrimary, fontWeight: '600' },
  catCheck: { color: COLORS.accentLight, fontSize: 16, fontWeight: '700' },
});
