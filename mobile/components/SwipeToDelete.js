import { useRef } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

export default function SwipeToDelete({ children, onDelete, disabled, label = 'Delete' }) {
  const swipeRef = useRef(null);

  function renderRightActions() {
    return (
      <TouchableOpacity
        style={styles.action}
        onPress={() => {
          swipeRef.current?.close();
          onDelete();
        }}
      >
        <Text style={styles.actionText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      enabled={!disabled}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 84, marginLeft: 8, borderRadius: 16, backgroundColor: '#B3261E',
    alignItems: 'center', justifyContent: 'center',
  },
  actionText: { color: '#FFFFFF', fontFamily: 'Lora_600SemiBold', fontSize: 13 },
});