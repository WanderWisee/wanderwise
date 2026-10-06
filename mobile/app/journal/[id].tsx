import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { addComment, deleteJournalEntry, fetchComments, fetchJournalEntry } from '../../services/journalService';
import { fetchPublicProfile, fullName } from '../../services/userService';
import { Avatar, ErrorState, Loading, ScreenHeader, SquareButton } from '../../components/ui';

// Isang journal post (sarili o ng ibang estudyante) + comments.
// Parehong JournalViewPage ng web.
export default function JournalViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t, user, timeAgo, formatDate } = useApp();
  const { confirm, toast } = useDialog();

  const [entry, setEntry] = useState(null);
  const [author, setAuthor] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJournalEntry(id);
      setEntry(data);
      setError(null);
      fetchComments(id).then(setComments).catch(() => {});
      if (data?.userId) fetchPublicProfile(data.userId).then(setAuthor).catch(() => {});
    } catch (e) {
      setError(e.status === 404 ? t('journalNotFound') : e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const created = await addComment(id, body);
      setComments((prev) => [...prev, created]);
      setText('');
    } catch (e) {
      toast(e.message);
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: t('deleteStoryTitle'),
      message: t('deleteStoryMessage'),
      confirmLabel: t('dialogDelete'),
      cancelLabel: t('cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteJournalEntry(id);
      toast(t('storyDeleted'));
      router.back();
    } catch (e) {
      toast(e.message);
    }
  }

  const isMine = entry && user && entry.userId === user.userId;

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader
        title={entry?.title || t('journal')}
        onBack={() => router.back()}
        titleSize={17}
        right={isMine ? <SquareButton onPress={remove} accessibilityLabel={t('dialogDelete')}>🗑</SquareButton> : null}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} retryLabel={t('tryAgain')} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {author && (
              <TouchableOpacity
                style={styles.authorRow}
                onPress={() => (isMine ? router.push('/(tabs)/profile') : router.push(`/user/${author.id}`))}
                activeOpacity={0.7}
              >
                <Avatar person={author} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{fullName(author, t('student'))}</Text>
                  <Text style={styles.meta}>{formatDate(entry.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            )}

            {entry.entries.length === 0 && <Text style={styles.meta}>{t('noPlacesAddedToStory')}</Text>}

            {entry.entries.map((p, i) => (
              <View key={p.id || i} style={styles.page}>
                {!!p.img && <Image source={{ uri: p.img }} style={styles.photo} />}
                <Text style={styles.placeName}>📍 {p.place || t('unnamedPlace')}</Text>
                {p.rating > 0 && (
                  <Text style={styles.stars}>
                    {'★'.repeat(p.rating)}
                    <Text style={{ color: Colors.line }}>{'★'.repeat(Math.max(0, 5 - p.rating))}</Text>
                  </Text>
                )}
                {!!p.description && <Text style={styles.description}>{p.description}</Text>}

                {p.pros.length > 0 && (
                  <>
                    <Text style={styles.listTitle}>{t('prosOfVisiting')} {p.place || t('thisPlace')}</Text>
                    {p.pros.map((x, k) => (
                      <Text key={k} style={styles.listItem}>✓  {x}</Text>
                    ))}
                  </>
                )}
                {p.cons.length > 0 && (
                  <>
                    <Text style={styles.listTitle}>{t('consOfVisiting')} {p.place || t('thisPlace')}</Text>
                    {p.cons.map((x, k) => (
                      <Text key={k} style={styles.listItem}>✕  {x}</Text>
                    ))}
                  </>
                )}
                {p.hotels.length > 0 && (
                  <>
                    <Text style={styles.listTitle}>{t('hotelOptions')}</Text>
                    {p.hotels.map((h, k) => (
                      <View key={h.id || k} style={styles.hotel}>
                        <Text style={styles.hotelName}>🏨 {h.name}</Text>
                        {!!h.description && <Text style={styles.hotelDesc}>{h.description}</Text>}
                      </View>
                    ))}
                  </>
                )}
              </View>
            ))}

            <Text style={styles.commentsTitle}>
              💬 {t('comments')} ({comments.length})
            </Text>
            {comments.length === 0 && <Text style={styles.meta}>{t('noCommentsBeFirst')}</Text>}
            {comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Avatar person={c} size={32} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentName}>
                    {fullName(c, t('student'))} <Text style={styles.commentTime}>· {timeAgo(c.createdAt)}</Text>
                  </Text>
                  <Text style={styles.commentText}>{c.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder={t('writeAComment')}
              placeholderTextColor={Colors.placeholder}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity style={styles.sendButton} onPress={send} disabled={sending || !text.trim()}>
              {sending ? <ActivityIndicator color={Colors.mint} size="small" /> : <Text style={styles.sendText}>{t('send')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E7DEBC' },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  authorName: { fontFamily: 'Lora_600SemiBold', fontSize: 15, color: Colors.brown900 },
  meta: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600, marginTop: 2 },
  page: {
    backgroundColor: '#FAF3E3', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(200,172,130,0.4)',
    padding: 18, marginBottom: 18,
    shadowColor: Colors.brown900, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  photo: { width: '100%', height: 220, borderRadius: 4, marginBottom: 14, backgroundColor: Colors.card },
  placeName: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  stars: { fontSize: 18, color: Colors.brown900, marginTop: 4 },
  description: { fontFamily: 'Lora_400Regular', fontSize: 14, lineHeight: 21, color: Colors.brown900, marginTop: 10 },
  listTitle: { fontFamily: 'Lora_400Regular', fontStyle: 'italic', fontSize: 14, color: Colors.brown900, marginTop: 16, marginBottom: 6 },
  listItem: { fontFamily: 'Lora_400Regular', fontSize: 13.5, lineHeight: 20, color: Colors.brown800, marginBottom: 3 },
  hotel: { marginBottom: 8 },
  hotelName: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.brown900 },
  hotelDesc: { fontFamily: 'Lora_400Regular', fontSize: 12, color: Colors.brown600, marginTop: 2 },
  commentsTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 17, color: Colors.brown900, marginTop: 8, marginBottom: 10 },
  comment: { flexDirection: 'row', gap: 10, marginTop: 12 },
  commentBubble: { flex: 1, backgroundColor: '#FAF3E3', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  commentName: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },
  commentTime: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600 },
  commentText: { fontFamily: 'Lora_400Regular', fontSize: 13.5, lineHeight: 19, color: Colors.brown900, marginTop: 3 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.cream, borderTopWidth: 1, borderTopColor: Colors.line,
  },
  composerInput: {
    flex: 1, maxHeight: 110, fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown900,
    backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
  },
  sendButton: {
    height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  sendText: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint },
});
