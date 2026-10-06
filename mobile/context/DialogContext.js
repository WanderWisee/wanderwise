import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';

// In-app dialogs (parehong ideya ng DialogContext ng web): kapareho ng
// tema ng app at gumagana rin sa Expo web, hindi tulad ng Alert.alert.
//
//   const { confirm, alert, toast } = useDialog();
//   if (await confirm({ title: 'Delete?', message: '...', danger: true })) ...
//   alert('Saved', 'Your changes are saved.');
//   toast('Saved');

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toastText, setToastText] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  const close = useCallback((result) => {
    setDialog((d) => {
      if (d) d.resolve(result);
      return null;
    });
  }, []);

  const confirm = useCallback(
    ({ title, message = '', confirmLabel = 'OK', cancelLabel = 'Cancel', danger = false }) =>
      new Promise((resolve) => {
        setDialog({ title, message, confirmLabel, cancelLabel, danger, resolve, showCancel: true });
      }),
    []
  );

  const alert = useCallback(
    (title, message = '', okLabel = 'OK') =>
      new Promise((resolve) => {
        setDialog({ title, message, confirmLabel: okLabel, resolve, showCancel: false });
      }),
    []
  );

  const toast = useCallback(
    (text) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastText(text);
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setToastText(null)
        );
      }, 1900);
    },
    [toastAnim]
  );

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  return (
    <DialogContext.Provider value={{ confirm, alert, toast }}>
      {children}

      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.overlay} onPress={() => dialog?.showCancel && close(false)}>
          <Pressable style={styles.box} onPress={(e) => e.stopPropagation()}>
            {!!dialog?.title && <Text style={styles.title}>{dialog.title}</Text>}
            {!!dialog?.message && <Text style={styles.message}>{dialog.message}</Text>}
            <View style={styles.actions}>
              {dialog?.showCancel && (
                <TouchableOpacity style={styles.cancelButton} onPress={() => close(false)} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>{dialog.cancelLabel}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.confirmButton, dialog?.danger && styles.dangerButton]}
                onPress={() => close(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmText, dialog?.danger && styles.dangerText]}>{dialog?.confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {toastText && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastText}</Text>
        </Animated.View>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(46,27,14,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  box: {
    width: '100%', maxWidth: 380, backgroundColor: Colors.cream, borderRadius: 20,
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18,
    shadowColor: Colors.brown900, shadowOpacity: 0.25, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  title: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900, marginBottom: 8 },
  message: { fontFamily: 'Lora_400Regular', fontSize: 14, lineHeight: 21, color: Colors.brown600, marginBottom: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelButton: {
    height: 42, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.4, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.brown900 },
  confirmButton: {
    height: 42, paddingHorizontal: 20, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  dangerButton: { backgroundColor: Colors.error },
  confirmText: { fontFamily: 'Lora_600SemiBold', fontSize: 14, color: Colors.mint },
  dangerText: { color: '#FFFFFF' },
  toast: {
    position: 'absolute', bottom: 96, alignSelf: 'center',
    backgroundColor: Colors.brown900, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  toastText: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint },
});
