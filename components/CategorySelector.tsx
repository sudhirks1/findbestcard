import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StoreCategory } from '../types';
import { CATEGORY_META, ALL_CATEGORIES, COLORS } from '../utils/constants';

interface Props {
  selected: StoreCategory | null;
  onSelect: (category: StoreCategory) => void;
}

export default function CategorySelector({ selected, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {ALL_CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        const isSelected = selected === cat;
        return (
          <TouchableOpacity
            key={cat}
            style={[styles.tile, isSelected && styles.tileSelected]}
            onPress={() => onSelect(cat)}
            activeOpacity={0.75}
          >
            <FontAwesome
              name={meta.faIcon as any}
              size={24}
              color={isSelected ? COLORS.accentLight : COLORS.textSecondary}
              style={styles.icon}
            />
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignContent: 'space-around',
  },
  tile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  tileSelected: {
    backgroundColor: COLORS.accent + '33',
    borderColor: COLORS.accentLight,
  },
  icon: {
    marginBottom: 6,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelSelected: {
    color: COLORS.accentLight,
    fontWeight: '700',
  },
});
