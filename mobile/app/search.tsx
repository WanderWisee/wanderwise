import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { fullName, searchUsers } from '../services/userService';
import { Avatar, EmptyState, Loading, ScreenHeader } from '../components/ui';

// Paghahanap ng kapwa estudyante (parehong /api/users/search ng web Profile).
export default function SearchStudentsScreen() {
  const router = useRouter();
  const { t } = useApp();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(() => {
      searchUsers(term)
        .then((data) => alive && (setResults(data), setError(null)))
        .catch((e) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={t('searchForAStudent')} onBack={() => router.back()} titleSize={18} />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          placeholder={`🔍  ${t('searchByName')}`}
          placeholderTextColor={Colors.placeholder}
          value={q}
          onChangeText={setQ}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <Loading />
      ) : error ? (
        <EmptyState icon="📡" title={error} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            q.trim().length >= 2 ? <EmptyState icon="🙈" title={t('noStudentsFound')} /> : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/user/${item.id}`)} activeOpacity={0.7}>
              <Avatar person={item} size={44} />
              <Text style={styles.name}>{fullName(item, t('unnamedStudent'))}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  searchWrap: { paddingHorizontal: 20, marginBottom: 10 },
  input: {
    fontFamily: 'Lora_400Regular', fontSize: 15, color: Colors.brown900,
    backgroundColor: Colors.cream2, borderRadius: 12, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  name: { flex: 1, fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },
  chevron: { fontSize: 20, color: Colors.brown600 },
});
