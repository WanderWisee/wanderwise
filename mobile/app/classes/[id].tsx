import { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { fetchClass, fetchClassAnnouncements } from '../../services/studentService';
import { fullName } from '../../services/userService';
import StudentScreen, { StudentCard, studentStyles as styles } from '../../components/StudentScreen';
import { Avatar, EmptyState, ErrorState, Loading } from '../../components/ui';

export default function ClassScreen() {
  const { id } = useLocalSearchParams();
  const { t, timeAgo } = useApp();
  const [cls, setClass] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const [detail, announcements] = await Promise.all([fetchClass(id), fetchClassAnnouncements(id)]);
      setClass(detail); setItems(announcements); setError('');
    } catch (e: any) { setError(e.message); }
    finally { setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return (
    <StudentScreen title={cls?.name || t('myClasses')} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
      {error ? <ErrorState message={error} onRetry={load} retryLabel={t('tryAgain')} /> : !cls ? <Loading /> : <>
        <StudentCard title={cls.name}>
          <Text style={styles.text}>{[cls.section, cls.term].filter(Boolean).join(' · ')}</Text>
          <View style={styles.row}><Avatar person={cls.teacher} size={44} /><Text style={styles.text}>{fullName(cls.teacher)}</Text></View>
        </StudentCard>
        <Text style={styles.title}>{t('announcements')}</Text>
        {!items.length && <EmptyState icon="📢" title={t('noAnnouncements')} />}
        {items.map((item) => <StudentCard key={item.id} title={item.authorName}>
          <Text style={styles.text}>{item.message}</Text>
          <Text style={styles.text}>{timeAgo(item.createdAt)}</Text>
        </StudentCard>)}
      </>}
    </StudentScreen>
  );
}
