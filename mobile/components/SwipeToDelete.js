import { useRef } from 'react';
import { Animated, PanResponder, View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const DELETE_WIDTH = 72;

export default function SwipeToDelete({ children, onDelete, disabled }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabled && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        const next = Math.min(0, Math.max(-DELETE_WIDTH, currentOffset.current + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const next = currentOffset.current + gesture.dx;
        const shouldOpen = next < -DELETE_WIDTH / 2;
        currentOffset.current = shouldOpen ? -DELETE_WIDTH : 0;
        Animated.spring(translateX, {
          toValue: currentOffset.current,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

  function handleDelete() {
    Animated.timing(translateX, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    currentOffset.current = 0;
    onDelete();
  }

  return (
    <View style={{ position: 'relative' }}>
      <View style={styles.deleteBackground}>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...(disabled ? {} : panResponder.panHandlers)}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  deleteBackground: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: DELETE_WIDTH,
    backgroundColor: '#B3261E', alignItems: 'center', justifyContent: 'center',
  },
  deleteButton: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#FFFFFF', fontFamily: 'Lora_600SemiBold', fontSize: 12.5 },
});