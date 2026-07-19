import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { getCardTemplates, createCardTemplate, updateCardTemplate, deleteCardTemplate } from '../../utils/api';
import { COLORS } from '../../utils/constants';

type Template = {
  id: string;
  name: string;
  issuer: string;
  network: string;
  rewardType: string;
  baseRewardRate: number;
  diningRate: number;
  groceriesRate: number;
  gasRate: number;
  travelRate: number;
  hotelsRate: number;
  onlineShoppingRate: number;
  entertainmentRate: number;
  streamingRate: number;
  pharmacyRate: number;
  retailRate: number;
  homeGardenRate: number;
  wholesaleRate: number;
  annualFee: number;
  colorScheme: string;
  isActive: boolean;
};

const RATE_FIELDS: { key: keyof Template; label: string }[] = [
  { key: 'baseRewardRate', label: 'Base Rate' },
  { key: 'diningRate', label: 'Dining' },
  { key: 'groceriesRate', label: 'Groceries' },
  { key: 'gasRate', label: 'Gas' },
  { key: 'travelRate', label: 'Travel' },
  { key: 'hotelsRate', label: 'Hotels' },
  { key: 'onlineShoppingRate', label: 'Online Shopping' },
  { key: 'entertainmentRate', label: 'Entertainment' },
  { key: 'streamingRate', label: 'Streaming' },
  { key: 'pharmacyRate', label: 'Pharmacy' },
  { key: 'retailRate', label: 'Retail' },
  { key: 'homeGardenRate', label: 'Home & Garden' },
  { key: 'wholesaleRate', label: 'Wholesale' },
];

const NETWORKS = ['visa', 'mastercard', 'amex', 'discover'];

const EMPTY_TEMPLATE: Omit<Template, 'id' | 'isActive'> = {
  name: '',
  issuer: '',
  network: '',
  rewardType: 'cashback',
  baseRewardRate: 1,
  diningRate: 0,
  groceriesRate: 0,
  gasRate: 0,
  travelRate: 0,
  hotelsRate: 0,
  onlineShoppingRate: 0,
  entertainmentRate: 0,
  streamingRate: 0,
  pharmacyRate: 0,
  retailRate: 0,
  homeGardenRate: 0,
  wholesaleRate: 0,
  annualFee: 0,
  colorScheme: 'sapphire',
};

export default function AdminScreen() {
  const token = useAuthStore((s) => s.token);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCardTemplates();
      setTemplates(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing({ ...EMPTY_TEMPLATE });
    setIsNew(true);
    setModalVisible(true);
  };

  const openEdit = (t: Template) => {
    setEditing({ ...t });
    setIsNew(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!editing || !token) return;
    if (!editing.name?.trim() || !editing.issuer?.trim()) {
      Alert.alert('Validation', 'Name and issuer are required.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await createCardTemplate(token, editing);
      } else {
        await updateCardTemplate(token, editing.id!, editing);
      }
      setModalVisible(false);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (t: Template) => {
    Alert.alert('Delete', `Remove "${t.name}" from catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCardTemplate(token!, t.id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.issuer.toLowerCase().includes(search.toLowerCase()),
  );

  const setField = (key: string, value: string) => {
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setNumericField = (key: string, value: string) => {
    const num = parseFloat(value);
    setEditing((prev) => (prev ? { ...prev, [key]: isNaN(num) ? 0 : num } : prev));
  };

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Card Catalog</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or issuer…"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accentLight} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>No templates found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardIssuer}>{item.issuer}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.deleteBtnText}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Base {item.baseRewardRate}%</Text>
                {item.diningRate > 0 && <Text style={styles.rateLabel}>Dining {item.diningRate}%</Text>}
                {item.groceriesRate > 0 && <Text style={styles.rateLabel}>Grocery {item.groceriesRate}%</Text>}
                {item.travelRate > 0 && <Text style={styles.rateLabel}>Travel {item.travelRate}%</Text>}
              </View>
              <Text style={styles.rateType}>
                {item.rewardType} · ${item.annualFee}/yr
              </Text>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isNew ? 'New Template' : 'Edit Template'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={COLORS.accentLight} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <Text style={styles.sectionLabel}>Card Info</Text>
            <TextInput
              style={styles.field}
              value={editing?.name ?? ''}
              onChangeText={(v) => setField('name', v)}
              placeholder="Card name"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={styles.field}
              value={editing?.issuer ?? ''}
              onChangeText={(v) => setField('issuer', v)}
              placeholder="Issuer (e.g. Chase)"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.sectionLabel}>Network</Text>
            <View style={styles.chipRow}>
              {NETWORKS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, editing?.network === n && styles.chipActive]}
                  onPress={() => setField('network', n)}
                >
                  <Text style={[styles.chipText, editing?.network === n && styles.chipTextActive]}>
                    {n.charAt(0).toUpperCase() + n.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.field}
              value={String(editing?.annualFee ?? 0)}
              onChangeText={(v) => setNumericField('annualFee', v)}
              placeholder="Annual fee"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.sectionLabel}>Reward Rates (%)</Text>
            {RATE_FIELDS.map(({ key, label }) => (
              <View key={key} style={styles.rateField}>
                <Text style={styles.rateFieldLabel}>{label}</Text>
                <TextInput
                  style={styles.rateFieldInput}
                  value={String(editing?.[key] ?? 0)}
                  onChangeText={(v) => setNumericField(key, v)}
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  addBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  searchBox: { paddingHorizontal: 16, marginBottom: 4 },
  searchInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  cardName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  cardIssuer: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: 'rgba(244,63,94,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  deleteBtnText: { color: COLORS.red, fontSize: 13, fontWeight: '600' },
  rateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rateLabel: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(52,211,153,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rateType: { color: COLORS.textMuted, fontSize: 12 },
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
  cancelText: { color: COLORS.textSecondary, fontSize: 16 },
  saveText: { color: COLORS.accentLight, fontSize: 16, fontWeight: '700' },
  modalBody: { padding: 20, gap: 12, paddingBottom: 60 },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  field: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  rateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  rateFieldLabel: { color: COLORS.textSecondary, fontSize: 14 },
  rateFieldInput: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 60,
  },
});
