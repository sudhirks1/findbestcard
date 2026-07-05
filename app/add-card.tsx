import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator, // still used for AI lookup loading
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCardStore } from '../store/useCardStore';
import { useAuthStore } from '../store/useAuthStore';
import * as api from '../utils/api';
import { COLORS, CATEGORY_META, CARD_COLOR_SCHEMES, ALL_CATEGORIES } from '../utils/constants';
import { StoreCategory, CardNetwork, RewardType, CategoryReward, CardBenefit } from '../types';

const NETWORKS: { key: CardNetwork; label: string }[] = [
  { key: 'visa', label: 'Visa' },
  { key: 'mastercard', label: 'Mastercard' },
  { key: 'amex', label: 'Amex' },
  { key: 'discover', label: 'Discover' },
];

const REWARD_TYPES: { key: RewardType; label: string }[] = [
  { key: 'cashback', label: 'Cash Back %' },
  { key: 'points', label: 'Points (x)' },
  { key: 'miles', label: 'Miles (x)' },
];

const COLOR_KEYS = Object.keys(CARD_COLOR_SCHEMES);

type Step = 'basic' | 'rewards' | 'benefits' | 'confirm';

const BENEFIT_PERIODS: { key: CardBenefit['period']; label: string }[] = [
  { key: 'annual', label: 'Annual' },
  { key: 'monthly', label: 'Monthly' },
];

export default function AddCardScreen() {
  const router = useRouter();
  const { cardId, startStep } = useLocalSearchParams<{ cardId?: string; startStep?: string }>();
  const { addCard, updateCard, cards } = useCardStore();
  const token = useAuthStore((s) => s.token);

  const editingCard = cardId ? cards.find((c) => c.id === cardId) : undefined;
  const isEditing = !!editingCard;

  const validSteps: Step[] = ['basic', 'rewards', 'benefits', 'confirm'];
  const [step, setStep] = useState<Step>(
    isEditing && validSteps.includes(startStep as Step) ? (startStep as Step) : 'basic'
  );

  // Backend card templates for autofill
  const [catalogTemplates, setCatalogTemplates] = useState<any[]>([]);
  const [autoFillSuggestion, setAutoFillSuggestion] = useState<ReturnType<typeof api.serverTemplateToAutofill> | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<ReturnType<typeof api.serverTemplateToAutofill> | null>(null);
  const [aiLookupLoading, setAiLookupLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(editingCard?.templateId);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.getCardTemplates().then(setCatalogTemplates).catch(() => {});
  }, []);

  function findTemplate(query: string) {
    const lower = query.toLowerCase().trim();
    if (!lower || catalogTemplates.length === 0) return null;
    // exact name/issuer substring match first
    let found = catalogTemplates.find(
      (t) => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase())
    );
    if (!found) {
      // fuzzy: 2+ words of name appear in query
      found = catalogTemplates.find((t) => {
        const words = t.name.toLowerCase().split(' ').filter((w: string) => w.length > 3);
        return words.filter((w: string) => lower.includes(w)).length >= 2;
      });
    }
    return found ? api.serverTemplateToAutofill(found) : null;
  }

  // Basic info
  const [nickname, setNickname] = useState(editingCard?.nickname ?? '');
  const [bank, setBank] = useState(editingCard?.bank ?? '');
  const [lastFour, setLastFour] = useState(editingCard?.lastFour ?? '');
  const [network, setNetwork] = useState<CardNetwork>(editingCard?.network ?? 'visa');
  const [colorScheme, setColorScheme] = useState(editingCard?.colorScheme ?? COLOR_KEYS[0]);
  const [annualFee, setAnnualFee] = useState(String(editingCard?.annualFee ?? 0));
  const [hasQuarterlyRotating, setHasQuarterlyRotating] = useState(editingCard?.hasQuarterlyRotatingRewards ?? false);
  const [requiresPrime, setRequiresPrime] = useState(editingCard?.requiresPrimeMembership ?? false);

  // Benefits
  const [benefits, setBenefits] = useState<CardBenefit[]>(editingCard?.benefits ?? []);
  const [addingBenefit, setAddingBenefit] = useState(false);
  const [editingBenefitIdx, setEditingBenefitIdx] = useState<number | null>(null);
  const [benefitLabel, setBenefitLabel] = useState('');
  const [benefitValue, setBenefitValue] = useState('');
  const [benefitPeriod, setBenefitPeriod] = useState<CardBenefit['period']>('annual');
  const [benefitNotes, setBenefitNotes] = useState('');

  // Rewards
  const [baseReward, setBaseReward] = useState(String(editingCard?.baseReward ?? 1));
  const [baseRewardType, setBaseRewardType] = useState<RewardType>(editingCard?.baseRewardType ?? 'cashback');
  const [categoryRewards, setCategoryRewards] = useState<CategoryReward[]>(editingCard?.rewards ?? []);
  const [hotelRewardRate, setHotelRewardRate] = useState(String(editingCard?.hotelRewardRate ?? ''));
  const [notes, setNotes] = useState(editingCard?.notes ?? '');

  // Add category reward form
  const [editingCat, setEditingCat] = useState<StoreCategory | null>(null);
  const [editRate, setEditRate] = useState('');
  const [editType, setEditType] = useState<RewardType>('cashback');

  const handleAddCategoryReward = () => {
    if (!editingCat || !editRate) return;
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Invalid Rate', 'Enter a positive reward rate.');
      return;
    }
    setCategoryRewards((prev) => {
      const filtered = prev.filter((r) => r.category !== editingCat);
      return [...filtered, { category: editingCat, rewardRate: rate, rewardType: editType }];
    });
    setEditingCat(null);
    setEditRate('');
  };

  const handleRemoveCategoryReward = (cat: StoreCategory) => {
    setCategoryRewards((prev) => prev.filter((r) => r.category !== cat));
  };

const openEditBenefit = (idx: number) => {
    const b = benefits[idx];
    setBenefitLabel(b.label);
    setBenefitValue(String(b.value));
    setBenefitPeriod(b.period);
    setBenefitNotes(b.notes ?? '');
    setEditingBenefitIdx(idx);
    setAddingBenefit(true);
  };

  const handleAddBenefit = () => {
    if (!benefitLabel.trim()) return;
    const val = parseFloat(benefitValue);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid value', 'Enter a positive dollar amount.');
      return;
    }
    const entry: CardBenefit = { label: benefitLabel.trim(), value: val, period: benefitPeriod, notes: benefitNotes.trim() || undefined };
    if (editingBenefitIdx !== null) {
      setBenefits((prev) => prev.map((b, i) => (i === editingBenefitIdx ? entry : b)));
    } else {
      setBenefits((prev) => [...prev, entry]);
    }
    setBenefitLabel('');
    setBenefitValue('');
    setBenefitPeriod('annual');
    setBenefitNotes('');
    setAddingBenefit(false);
    setEditingBenefitIdx(null);
  };

  const validateBasic = () => {
    if (!nickname.trim()) { Alert.alert('Card name required'); return false; }
    if (!bank.trim()) { Alert.alert('Bank name required'); return false; }
    if (lastFour.length !== 4 || !/^\d+$/.test(lastFour)) {
      Alert.alert('Last 4 digits', 'Enter the last 4 digits of the card number.');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    const base = parseFloat(baseReward);
    if (isNaN(base) || base < 0) {
      Alert.alert('Invalid base reward rate');
      return;
    }
    const hotelRate = hotelRewardRate ? parseFloat(hotelRewardRate) : undefined;
    const payload = {
      nickname: nickname.trim(),
      bank: bank.trim(),
      lastFour,
      network,
      colorScheme,
      annualFee: parseFloat(annualFee) || 0,
      baseReward: base,
      baseRewardType,
      rewards: categoryRewards,
      notes: notes.trim(),
      hasQuarterlyRotatingRewards: hasQuarterlyRotating,
      requiresPrimeMembership: requiresPrime,
      hotelRewardRate: hotelRate && !isNaN(hotelRate) ? hotelRate : undefined,
      benefits: benefits.length > 0 ? benefits : undefined,
      templateId: selectedTemplateId,
    };
    if (isEditing && editingCard) {
      updateCard(editingCard.id, payload);
    } else {
      addCard(payload);
    }
    router.back();
  };

  const progressPct = step === 'basic' ? 25 : step === 'rewards' ? 50 : step === 'benefits' ? 75 : 100;

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing
            ? (step === 'basic' ? 'Edit Card' : step === 'rewards' ? 'Edit Rewards' : step === 'benefits' ? 'Edit Benefits' : 'Confirm Changes')
            : (step === 'basic' ? 'Card Details' : step === 'rewards' ? 'Rewards Setup' : step === 'benefits' ? 'Card Benefits' : 'Confirm')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 'basic' && (
          <View style={styles.stepContent}>
            <Field label="Card Nickname">
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={(text) => {
                  setNickname(text);
                  if (isEditing) return;

                  const catalogMatch = findTemplate(text);
                  setAutoFillSuggestion(catalogMatch);
                  setAiSuggestion(null);

                  if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);

                  if (!catalogMatch && text.trim().length > 4 && token) {
                    aiDebounceRef.current = setTimeout(async () => {
                      setAiLookupLoading(true);
                      const result = await api.aiLookupCard(token, text.trim());
                      setAiLookupLoading(false);
                      if (result) setAiSuggestion(api.serverTemplateToAutofill(result));
                    }, 1500);
                  } else {
                    setAiLookupLoading(false);
                  }
                }}
                placeholder="Chase Sapphire Preferred"
                placeholderTextColor={COLORS.textMuted}
              />
            </Field>

            {autoFillSuggestion && !isEditing && (
              <TouchableOpacity
                style={styles.autoFillBanner}
                onPress={() => {
                  const t = autoFillSuggestion!;
                  setNickname(t.name);
                  setBank(t.bank);
                  setColorScheme(t.colorScheme);
                  setAnnualFee(String(t.annualFee));
                  setBaseReward(String(t.baseReward));
                  setBaseRewardType(t.baseRewardType as RewardType);
                  setCategoryRewards(t.rewards as CategoryReward[]);
                  if (t.benefits) setBenefits(t.benefits as CardBenefit[]);
                  setSelectedTemplateId(t.templateId);
                  setHasQuarterlyRotating(t.hasQuarterlyRotatingRewards ?? false);
                  setRequiresPrime(t.requiresPrimeMembership ?? false);
                  setAutoFillSuggestion(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.autoFillIcon}>✨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoFillTitle}>Found: {autoFillSuggestion.name}</Text>
                  <Text style={styles.autoFillSub}>Tap to auto-fill rewards — you can edit after</Text>
                </View>
                <Text style={styles.autoFillChevron}>→</Text>
              </TouchableOpacity>
            )}

            {aiLookupLoading && !autoFillSuggestion && !isEditing && (
              <View style={styles.aiLoadingBanner}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.aiLoadingText}>Searching AI for card rates...</Text>
              </View>
            )}

            {aiSuggestion && !autoFillSuggestion && !isEditing && (
              <TouchableOpacity
                style={styles.aiBanner}
                onPress={() => {
                  const t = aiSuggestion!;
                  setNickname(t.name);
                  setBank(t.bank);
                  setColorScheme(t.colorScheme);
                  setAnnualFee(String(t.annualFee));
                  setBaseReward(String(t.baseReward));
                  setBaseRewardType(t.baseRewardType as RewardType);
                  setCategoryRewards(t.rewards as CategoryReward[]);
                  if (t.benefits?.length) setBenefits(t.benefits as CardBenefit[]);
                  setSelectedTemplateId(t.templateId);
                  setHasQuarterlyRotating(t.hasQuarterlyRotatingRewards ?? false);
                  setRequiresPrime(t.requiresPrimeMembership ?? false);
                  setAiSuggestion(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.aiBannerIcon}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiBannerTitle}>AI found: {aiSuggestion.name}</Text>
                  <Text style={styles.aiBannerSub}>Tap to apply rates — review before saving</Text>
                </View>
                <Text style={styles.aiBannerChevron}>→</Text>
              </TouchableOpacity>
            )}
            <Field label="Bank / Issuer">
              <TextInput
                style={styles.input}
                value={bank}
                onChangeText={setBank}
                placeholder="Chase, Amex, Capital One..."
                placeholderTextColor={COLORS.textMuted}
              />
            </Field>
            <Field label="Last 4 Digits">
              <TextInput
                style={styles.input}
                value={lastFour}
                onChangeText={(t) => setLastFour(t.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                maxLength={4}
              />
            </Field>
            <Field label="Card Network">
              <View style={styles.chips}>
                {NETWORKS.map((n) => (
                  <TouchableOpacity
                    key={n.key}
                    style={[styles.chip, network === n.key && styles.chipActive]}
                    onPress={() => setNetwork(n.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, network === n.key && styles.chipTextActive]}>
                      {n.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
            <Field label="Card Color">
              <View style={styles.colorRow}>
                {COLOR_KEYS.map((key) => {
                  const colors = CARD_COLOR_SCHEMES[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setColorScheme(key)}
                      style={[styles.colorSwatch, colorScheme === key && styles.colorSwatchActive]}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[colors[0], colors[1]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.colorGrad}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
            <Field label="Annual Fee ($)">
              <TextInput
                style={styles.input}
                value={annualFee}
                onChangeText={setAnnualFee}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
              />
            </Field>
            <Field label="Quarterly Rotating Rewards">
              <TouchableOpacity
                style={[styles.toggleRow, hasQuarterlyRotating && styles.flagToggleActive]}
                onPress={() => setHasQuarterlyRotating((v) => !v)}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleEmoji}>🔄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, hasQuarterlyRotating && styles.flagToggleLabelActive]}>
                    Has quarterly rotating categories
                  </Text>
                  <Text style={styles.toggleSub}>
                    e.g. Discover it — 5% categories change each quarter
                  </Text>
                </View>
                <View style={[styles.toggleCheckbox, hasQuarterlyRotating && styles.flagCheckboxActive]}>
                  {hasQuarterlyRotating && <Text style={styles.toggleCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            </Field>
            <Field label="Amazon Prime Required">
              <TouchableOpacity
                style={[styles.toggleRow, requiresPrime && styles.primeToggleActive]}
                onPress={() => setRequiresPrime((v) => !v)}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleEmoji}>📦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, requiresPrime && styles.primeToggleLabelActive]}>
                    Best rates require Prime membership
                  </Text>
                  <Text style={styles.toggleSub}>
                    e.g. Amazon Prime Visa — 5% only with active Prime
                  </Text>
                </View>
                <View style={[styles.toggleCheckbox, requiresPrime && styles.primeCheckboxActive]}>
                  {requiresPrime && <Text style={styles.toggleCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            </Field>
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => { if (validateBasic()) setStep('rewards'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>Next: Set Up Rewards →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'rewards' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepNote}>
              Set your base reward rate (applied to all purchases), then add higher rates for specific categories.
            </Text>
            <Field label="Base Reward Rate (all purchases)">
              <View style={styles.rateRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={baseReward}
                  onChangeText={setBaseReward}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor={COLORS.textMuted}
                />
                <View style={styles.chips}>
                  {REWARD_TYPES.map((rt) => (
                    <TouchableOpacity
                      key={rt.key}
                      style={[styles.chip, baseRewardType === rt.key && styles.chipActive]}
                      onPress={() => setBaseRewardType(rt.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, baseRewardType === rt.key && styles.chipTextActive]}>
                        {rt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Field>

            {/* Category Rewards */}
            <Text style={styles.fieldLabel}>Bonus Category Rates</Text>
            {categoryRewards.length > 0 && (
              <View style={styles.rewardsList}>
                {categoryRewards.map((r) => {
                  const meta = CATEGORY_META[r.category];
                  return (
                    <View key={r.category} style={styles.rewardRow}>
                      <Text style={styles.rewardEmoji}>{meta.emoji}</Text>
                      <Text style={styles.rewardCat}>{meta.label}</Text>
                      <Text style={styles.rewardRate}>
                        {r.rewardRate}{r.rewardType === 'cashback' ? '%' : 'x'}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveCategoryReward(r.category)}>
                        <Text style={styles.removeBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {editingCat ? (
              <View style={styles.editCatForm}>
                <Text style={styles.editCatTitle}>
                  {CATEGORY_META[editingCat].emoji} {CATEGORY_META[editingCat].label}
                </Text>
                <View style={styles.rateRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={editRate}
                    onChangeText={setEditRate}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 3"
                    placeholderTextColor={COLORS.textMuted}
                    autoFocus
                  />
                  <View style={styles.chips}>
                    {REWARD_TYPES.map((rt) => (
                      <TouchableOpacity
                        key={rt.key}
                        style={[styles.chip, editType === rt.key && styles.chipActive]}
                        onPress={() => setEditType(rt.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, editType === rt.key && styles.chipTextActive]}>
                          {rt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.editCatBtns}>
                  <TouchableOpacity style={styles.editCatSave} onPress={handleAddCategoryReward} activeOpacity={0.8}>
                    <Text style={styles.editCatSaveText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingCat(null)}>
                    <Text style={styles.editCatCancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.catGrid}>
                {ALL_CATEGORIES.filter((c) => !categoryRewards.find((r) => r.category === c)).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={styles.catTile}
                      onPress={() => { setEditingCat(cat); setEditRate(''); setEditType(baseRewardType); }}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.catTileEmoji}>{meta.emoji}</Text>
                      <Text style={styles.catTileLabel}>{meta.label}</Text>
                      <Text style={styles.catTileAdd}>+ Add</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Field label="Hotel Reward Rate (optional — for tiebreaking)">
              <TextInput
                style={styles.input}
                value={hotelRewardRate}
                onChangeText={setHotelRewardRate}
                keyboardType="decimal-pad"
                placeholder="e.g. 10 for 10x hotel points"
                placeholderTextColor={COLORS.textMuted}
              />
            </Field>

            <Field label="AI Strategy Note (optional)">
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Planning to cancel this card — don't recommend it. Or: Need to accumulate points here for a trip."
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
            </Field>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep('basic')} activeOpacity={0.8}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn2} onPress={() => setStep('benefits')} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>Benefits →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'benefits' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepNote}>
              Add credits and perks that offset the annual fee — like travel credits, Uber Cash, or free night certificates. The app will calculate your card's net effective cost.
            </Text>

            {/* Existing benefits list */}
            {benefits.length > 0 && (
              <View style={styles.rewardsList}>
                {benefits.map((b, idx) => {
                  const annual = b.period === 'monthly' ? b.value * 12 : b.value;
                  return (
                    <View key={idx} style={styles.rewardRow}>
                      <Text style={styles.rewardEmoji}>✓</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rewardCat}>{b.label}</Text>
                        <Text style={[styles.rewardRate, { fontSize: 12 }]}>
                          {b.period === 'monthly'
                            ? `$${b.value}/mo = $${annual}/yr`
                            : `$${annual}/yr`}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => openEditBenefit(idx)} style={{ paddingHorizontal: 6 }}>
                        <Text style={styles.editBenefitIcon}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setBenefits((prev) => prev.filter((_, i) => i !== idx))}>
                        <Text style={styles.removeBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {/* Total */}
                {(() => {
                  const totalCredits = benefits.reduce(
                    (s, b) => s + (b.period === 'monthly' ? b.value * 12 : b.value), 0
                  );
                  const fee = parseFloat(annualFee) || 0;
                  const net = fee - totalCredits;
                  return (
                    <View style={styles.benefitTotalRow}>
                      <Text style={styles.benefitTotalLabel}>
                        Annual fee ${fee} − ${totalCredits} credits
                      </Text>
                      <Text style={[styles.benefitTotalValue, net <= 0 && styles.benefitTotalGreen]}>
                        {net <= 0 ? `Earns $${Math.abs(net)}/yr` : `Net $${net}/yr`}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}

            {addingBenefit ? (
              <View style={styles.editCatForm}>
                <Text style={styles.editCatTitle}>{editingBenefitIdx !== null ? 'Edit Benefit' : 'New Benefit'}</Text>
                <TextInput
                  style={styles.input}
                  value={benefitLabel}
                  onChangeText={setBenefitLabel}
                  placeholder="e.g. Uber Cash, Travel Credit, Free Night"
                  placeholderTextColor={COLORS.textMuted}
                  autoFocus
                />
                <View style={styles.rateRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={benefitValue}
                    onChangeText={setBenefitValue}
                    keyboardType="decimal-pad"
                    placeholder="$ value"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <View style={styles.chips}>
                    {BENEFIT_PERIODS.map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        style={[styles.chip, benefitPeriod === p.key && styles.chipActive]}
                        onPress={() => setBenefitPeriod(p.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, benefitPeriod === p.key && styles.chipTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TextInput
                  style={styles.input}
                  value={benefitNotes}
                  onChangeText={setBenefitNotes}
                  placeholder="Notes (optional)"
                  placeholderTextColor={COLORS.textMuted}
                />
                <View style={styles.editCatBtns}>
                  <TouchableOpacity style={styles.editCatSave} onPress={handleAddBenefit} activeOpacity={0.8}>
                    <Text style={styles.editCatSaveText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setAddingBenefit(false); setEditingBenefitIdx(null); }}>
                    <Text style={styles.editCatCancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBenefitBtn}
                onPress={() => setAddingBenefit(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.addBenefitBtnText}>+ Add Benefit</Text>
              </TouchableOpacity>
            )}

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep('rewards')} activeOpacity={0.8}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn2} onPress={() => setStep('confirm')} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>{benefits.length > 0 ? 'Review →' : 'Skip →'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'confirm' && (
          <View style={styles.stepContent}>
            <Text style={styles.confirmTitle}>{nickname}</Text>
            <Text style={styles.confirmSub}>{bank} · ••••{lastFour} · {network.toUpperCase()}</Text>

            <View style={styles.confirmCard}>
              <LinearGradient
                colors={CARD_COLOR_SCHEMES[colorScheme]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmCardGrad}
              >
                <Text style={styles.confirmCardNick}>{nickname}</Text>
                <Text style={styles.confirmCardDots}>•••• {lastFour}</Text>
              </LinearGradient>
            </View>

            <View style={styles.confirmDetails}>
              <ConfirmRow label="Annual Fee" value={`$${annualFee || 0}`} />
              <ConfirmRow
                label="Base Reward"
                value={`${baseReward}${baseRewardType === 'cashback' ? '%' : 'x'} ${baseRewardType}`}
              />
              {categoryRewards.map((r) => (
                <ConfirmRow
                  key={r.category}
                  label={`${CATEGORY_META[r.category].emoji} ${CATEGORY_META[r.category].label}`}
                  value={`${r.rewardRate}${r.rewardType === 'cashback' ? '%' : 'x'} ${r.rewardType}`}
                />
              ))}
              {hotelRewardRate ? <ConfirmRow label="🏨 Hotel Reward" value={`${hotelRewardRate}x (secondary priority)`} /> : null}
              {benefits.map((b, i) => {
                const annual = b.period === 'monthly' ? b.value * 12 : b.value;
                return (
                  <ConfirmRow
                    key={i}
                    label={`✓ ${b.label}`}
                    value={b.period === 'monthly' ? `$${b.value}/mo ($${annual}/yr)` : `$${annual}/yr`}
                  />
                );
              })}
              {notes ? <ConfirmRow label="Notes" value={notes} /> : null}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep('benefits')} activeOpacity={0.8}>
                <Text style={styles.prevBtnText}>← Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes ✓' : 'Add to Wallet ✓'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.confirmRow}>
      <Text style={styles.confirmLabel}>{label}</Text>
      <Text style={styles.confirmValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  backBtnText: { color: COLORS.textPrimary, fontSize: 16 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.surface,
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 120 },
  stepContent: { gap: 20, paddingTop: 16 },
  stepNote: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  field: { gap: 8 },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  input: {
    color: COLORS.textPrimary,
    fontSize: 15,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  chipActive: {
    backgroundColor: COLORS.accent + '33',
    borderColor: COLORS.accentLight,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.accentLight },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: { borderColor: '#FFFFFF' },
  colorGrad: { flex: 1 },
  rateRow: { gap: 10 },
  rewardsList: { gap: 8 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  rewardEmoji: { fontSize: 18 },
  rewardCat: { flex: 1, color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  rewardRate: { color: COLORS.green, fontSize: 14, fontWeight: '700' },
  editBenefitIcon: { color: COLORS.accentLight, fontSize: 15, fontWeight: '600' },
  removeBtn: { color: COLORS.red, fontSize: 16, fontWeight: '600' },
  editCatForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
  },
  editCatTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  editCatBtns: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  editCatSave: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 20,
  },
  editCatSaveText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  editCatCancel: { color: COLORS.textSecondary, fontSize: 14 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catTile: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  catTileEmoji: { fontSize: 22 },
  catTileLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '500', textAlign: 'center', marginTop: 4 },
  catTileAdd: { color: COLORS.accentLight, fontSize: 10, fontWeight: '700', marginTop: 2 },
  navRow: { flexDirection: 'row', gap: 12 },
  prevBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  prevBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  nextBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: 'center',
  },
  nextBtn2: {
    flex: 2,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: 'center',
  },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  confirmTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  confirmSub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 4 },
  confirmCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  confirmCardGrad: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
  },
  confirmCardNick: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  confirmCardDots: { color: 'rgba(255,255,255,0.75)', fontSize: 14, letterSpacing: 2 },
  confirmDetails: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  confirmLabel: { color: COLORS.textSecondary, fontSize: 14 },
  confirmValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    backgroundColor: COLORS.green,
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  toggleEmoji: { fontSize: 22 },
  toggleLabel: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  toggleSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  toggleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCheckmark: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  // Quarterly rotating toggle (blue-ish)
  flagToggleActive: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderColor: '#818CF8',
  },
  flagToggleLabelActive: { color: '#818CF8' },
  flagCheckboxActive: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  // Prime membership toggle (amber)
  primeToggleActive: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: '#F59E0B',
  },
  primeToggleLabelActive: { color: '#F59E0B' },
  primeCheckboxActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  addBenefitBtn: {
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBenefitBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  benefitTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    marginTop: 4,
  },
  benefitTotalLabel: { color: COLORS.textSecondary, fontSize: 12 },
  benefitTotalValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  benefitTotalGreen: { color: COLORS.green },
  autoFillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#34D399',
  },
  autoFillIcon: { fontSize: 22 },
  autoFillTitle: { color: '#34D399', fontSize: 14, fontWeight: '700' },
  autoFillSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  autoFillChevron: { color: '#34D399', fontSize: 18, fontWeight: '700' },
  aiLoadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  aiLoadingText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  aiBannerIcon: { fontSize: 22 },
  aiBannerTitle: { color: '#F59E0B', fontSize: 14, fontWeight: '700' },
  aiBannerSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  aiBannerChevron: { color: '#F59E0B', fontSize: 18, fontWeight: '700' },
});
