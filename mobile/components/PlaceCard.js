import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import TimePickerSheet, { formatTime12 } from './TimePickerSheet';

const GREY_PLACEHOLDER = '#A8A29B';
const COST_CATEGORIES = ['Transportation', 'Entrance Fee', 'Food', 'Hotel', 'Other'];

export default function PlaceCard({
  place,
  index,
  expanded,
  selecting = false,
  selected = false,
  dayLabel = null,
  onPress,
  onLongPress = null,
  onChangeNotes,
  onEndNotes,
  onToggleVisited,
  onSetTime,
  onAddCost,
  onRemoveCost,
}) {
  const [timeOpen, setTimeOpen] = useState(false);
  const [addingCost, setAddingCost] = useState(false);
  const [costCategory, setCostCategory] = useState(COST_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [costAmount, setCostAmount] = useState('');

  const costs = place.costs || [];
  const totalCost = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const hasChips = place.visited || place.scheduledTime || totalCost > 0 || dayLabel;

  function resetCostForm() {
    setAddingCost(false);
    setCostAmount('');
    setCustomCategory('');
    setCostCategory(COST_CATEGORIES[0]);
  }

  function confirmCost() {
    const amount = Number(costAmount);
    if (!amount || amount <= 0) return;
    const category =
      costCategory === 'Other' && customCategory.trim() ? customCategory.trim() : costCategory;
    onAddCost({ id: `cost_${Date.now()}`, category, amount });
    resetCostForm();
  }

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        activeOpacity={0.7}
      >
        {selecting && (
          <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
            {selected && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
        )}

        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>{place.name}</Text>
          {hasChips && (
            <View style={styles.chipsRow}>
              {!!dayLabel && (
                <View style={[styles.chip, styles.chipDay]}>
                  <Text style={[styles.chipText, styles.chipDayText]}>📅 {dayLabel}</Text>
                </View>
              )}
              {place.visited && (
                <View style={[styles.chip, styles.chipVisited]}>
                  <Text style={[styles.chipText, styles.chipVisitedText]}>✓ Visited</Text>
                </View>
              )}
              {!!place.scheduledTime && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>🕒 {formatTime12(place.scheduledTime)}</Text>
                </View>
              )}
              {totalCost > 0 && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>₱{totalCost.toLocaleString()}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.thumb}>
          <Text style={{ fontSize: 22 }}>📍</Text>
        </View>
      </TouchableOpacity>

      {expanded && !selecting && (
        <View style={styles.details}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes, links, etc."
            placeholderTextColor={GREY_PLACEHOLDER}
            value={place.notes}
            onChangeText={onChangeNotes}
            onEndEditing={onEndNotes}
            multiline
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onToggleVisited} style={styles.actionButton}>
              <Text style={[styles.actionText, place.visited && styles.actionTextActive]}>
                {place.visited ? '✓ Visited' : '✓ Mark as visited'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTimeOpen(true)} style={styles.actionButton}>
              <Text style={styles.actionText}>
                🕒 {place.scheduledTime ? formatTime12(place.scheduledTime) : 'Add time'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAddingCost(true)} style={styles.actionButton}>
              <Text style={styles.actionText}>₱ Add cost</Text>
            </TouchableOpacity>
          </View>

          {costs.length > 0 && (
            <View style={styles.costList}>
              {costs.map((c) => (
                <View key={c.id} style={styles.costRow}>
                  <Text style={styles.costCategory}>{c.category}</Text>
                  <Text style={styles.costAmount}>₱{Number(c.amount).toLocaleString()}</Text>
                  <TouchableOpacity onPress={() => onRemoveCost(c.id)} style={styles.costRemove}>
                    <Text style={styles.costRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.costTotal}>Total: ₱{totalCost.toLocaleString()}</Text>
            </View>
          )}

          {addingCost && (
            <View style={styles.costForm}>
              <View style={styles.categoryRow}>
                {COST_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, costCategory === cat && styles.categoryChipActive]}
                    onPress={() => setCostCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, costCategory === cat && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {costCategory === 'Other' && (
                <TextInput
                  style={styles.costInput}
                  placeholder="Category name"
                  placeholderTextColor={GREY_PLACEHOLDER}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                />
              )}

              <TextInput
                style={styles.costInput}
                placeholder="Amount (₱)"
                placeholderTextColor={GREY_PLACEHOLDER}
                value={costAmount}
                onChangeText={setCostAmount}
                keyboardType="decimal-pad"
              />

              <View style={styles.costFormActions}>
                <TouchableOpacity style={styles.costCancel} onPress={resetCostForm}>
                  <Text style={styles.costCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.costAdd} onPress={confirmCost}>
                  <Text style={styles.costAddText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      <TimePickerSheet
        visible={timeOpen}
        initial={place.scheduledTime}
        onClose={() => setTimeOpen(false)}
        onSave={(value) => {
          onSetTime(value);
          setTimeOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.line,
    shadowColor: Colors.brown900, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardSelected: { borderColor: Colors.brown900, borderWidth: 1.5 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cream,
  },
  checkboxChecked: { backgroundColor: Colors.brown900, borderColor: Colors.brown900 },
  checkboxMark: { color: Colors.mint, fontSize: 13, fontFamily: 'Lora_600SemiBold' },
  numberBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  numberText: { fontFamily: 'Lora_600SemiBold', fontSize: 12, color: Colors.mint },
  name: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { backgroundColor: Colors.cream2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontFamily: 'Lora_400Regular', fontSize: 11, color: Colors.brown600 },
  chipDay: { backgroundColor: 'rgba(46,27,14,0.08)' },
  chipDayText: { color: Colors.brown900, fontFamily: 'Lora_600SemiBold' },
  chipVisited: { backgroundColor: 'rgba(63,169,138,0.15)' },
  chipVisitedText: { color: Colors.mint, fontFamily: 'Lora_600SemiBold' },
  thumb: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
  },

  details: { marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 12 },
  notesInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    minHeight: 40, paddingVertical: 4, textAlignVertical: 'top',
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionButton: {
    backgroundColor: Colors.cream2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  actionText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.brown900 },
  actionTextActive: { color: Colors.mint },

  costList: { marginTop: 12 },
  costRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  costCategory: { flex: 1, fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown900 },
  costAmount: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900, marginRight: 10 },
  costRemove: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  costRemoveText: { fontSize: 12, color: Colors.error },
  costTotal: {
    fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.brown600,
    textAlign: 'right', marginTop: 6,
  },

  costForm: { marginTop: 12, backgroundColor: Colors.cream, borderRadius: 12, padding: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  categoryChip: {
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Colors.line,
  },
  categoryChipActive: { backgroundColor: Colors.brown900, borderColor: Colors.brown900 },
  categoryChipText: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown900 },
  categoryChipTextActive: { color: Colors.mint, fontFamily: 'Lora_600SemiBold' },
  costInput: {
    fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  costFormActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  costCancel: {
    flex: 1, height: 38, borderRadius: 10, borderWidth: 1.2, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  costCancelText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },
  costAdd: {
    flex: 1, height: 38, borderRadius: 10, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  costAddText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },
});