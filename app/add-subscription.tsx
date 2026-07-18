import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { useCardStore } from '../store/useCardStore';
import { COLORS } from '../utils/constants';

const COMMON_SERVICES = [
  'Netflix', 'Hulu', 'Disney+', 'Max', 'Peacock', 'Paramount+',
  'Amazon Prime', 'Apple TV+', 'Spotify', 'Apple Music', 'YouTube Premium',
  'iCloud+', 'Google One', 'Microsoft 365', 'Adobe Creative Cloud',
  'Costco', "Sam's Club", 'Gym/Fitness', 'SiriusXM', 'Audible',
];

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const { subId } = useLocalSearchParams<{ subId?: string }>();
  const { addSubscription, updateSubscription, subscriptions } = useSubscriptionStore();
  const { cards } = useCardStore();

  const editingSub = subId ? subscriptions.find((s) => s.id === subId) : undefined;
  const isEditing = !!editingSub;

  const [name, setName] = useState(editingSub?.name ?? '');
  const [amount, setAmount] = useState(editingSub ? String(editingSub.amount) : '');
  const [period, setPeriod] = useState<'monthly' | 'annual'>(editingSub?.period ?? 'monthly');
  const [cardId, setCardId] = useState<string | undefined>(editingSub?.cardId);
  const [notes, setNotes] = useState(editingSub?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a service name.'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Required', 'Please enter a valid amount.'); return; }
    setSaving(true);
    if (isEditing && editingSub) {
      await updateSubscription(editingSub.id, { name: name.trim(), amount: amt, period, cardId, notes: notes.trim() || undefined });
    } else {
      await addSubscription({ name: name.trim(), amount: amt, period, cardId, notes: notes.trim() || undefined });
    }
    router.back();
  };

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Edit Subscription' : 'Add Subscription'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Quick pick */}
          <Text style={styles.sectionLabel}>Quick pick</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {COMMON_SERVICES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, name === s && styles.chipActive]}
                onPress={() => setName(s)}
              >
                <Text style={[styles.chipText, name === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Service Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Netflix"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
            />
          </View>

          {/* Amount + Period */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Amount ($) *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="15.99"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Billing Period</Text>
              <View style={styles.periodRow}>
                {(['monthly', 'annual'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                      {p === 'monthly' ? 'Monthly' : 'Annual'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Card selection */}
          {cards.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>Paid with (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardChips}>
                <TouchableOpacity
                  style={[styles.chip, !cardId && styles.chipActive]}
                  onPress={() => setCardId(undefined)}
                >
                  <Text style={[styles.chipText, !cardId && styles.chipTextActive]}>None</Text>
                </TouchableOpacity>
                {cards.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, cardId === c.id && styles.chipActive]}
                    onPress={() => setCardId(c.id)}
                  >
                    <Text style={[styles.chipText, cardId === c.id && styles.chipTextActive]}>
                      {c.nickname}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Family plan, shared with..."
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </View>

          {/* Summary */}
          {name && amount && !isNaN(parseFloat(amount)) && (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {name} · ${parseFloat(amount).toFixed(2)}/{period}
                {period === 'annual'
                  ? ` (~$${(parseFloat(amount) / 12).toFixed(2)}/mo)`
                  : ` ($${(parseFloat(amount) * 12).toFixed(2)}/yr)`}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  cancelBtn: { padding: 4 },
  cancelText: { color: COLORS.textSecondary, fontSize: 16 },
  title: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  saveBtn: { padding: 4 },
  saveText: { color: COLORS.accentLight, fontSize: 16, fontWeight: '700' },
  scroll: { padding: 20, gap: 20, paddingBottom: 60 },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  chips: { marginTop: 8 },
  cardChips: { marginTop: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.accent + '33', borderColor: COLORS.accentLight },
  chipText: { color: COLORS.textSecondary, fontSize: 13 },
  chipTextActive: { color: COLORS.accentLight, fontWeight: '700' },
  field: { gap: 6 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  input: {
    color: COLORS.textPrimary,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  row: { flexDirection: 'row', gap: 12 },
  periodRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  periodBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  periodBtnActive: { backgroundColor: COLORS.accent + '33', borderColor: COLORS.accentLight },
  periodText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: COLORS.accentLight },
  summary: {
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '33',
  },
  summaryText: { color: COLORS.accentLight, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
