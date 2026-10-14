import { useCallback, useState } from 'react';
import { RefreshControl, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { fetchClasses, joinClass } from '../../services/studentService';
import StudentScreen, { StudentCard, studentStyles as styles } from '../../components/StudentScreen';
import { EmptyState, ErrorState, Field, Loading, PrimaryButton } from '../../components/ui';

export default function ClassesScreen() {
  const { t } = useApp();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const load = useCallback(async () => {
    try { setClasses(await fetchClasses()); setError(''); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function join() {
    if (joining || !code.trim()) return;
    setJoining(true); setJoinError('');
    try {
      const result = await joinClass(code);
      setCode('');
      router.push(`/classes/${result.classId}` as any);
    } catch (e: any) {
      setJoinError(e.status === 409 ? t('alreadyInClass') : e.status === 404 ? t('badClassCode') : e.message);
    } finally { setJoining(false); }
  }
  return (
    <StudentScreen title={t('myClasses')} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
      <StudentCard title={t('joinClass')}>
        <Text style={styles.text}>{t('classesHint')}</Text>
        <Field label={t('classCode')} value={code} onChangeText={(value: string) => setCode(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={12} returnKeyType="go" onSubmitEditing={join} />
        {!!joinError && <Text accessibilityRole="alert" style={styles.error}>{joinError}</Text>}
        <PrimaryButton label={t('joinClass')} onPress={join} loading={joining} disabled={!code.trim()} />
      </StudentCard>
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={load} retryLabel={t('tryAgain')} /> : classes.length === 0 ? <EmptyState icon="??" title={t('classEmpty')} /> : classes.map((cls) => (
        <TouchableOpacity accessibilityRole="button" key={cls.id} onPress={() => router.push(`/classes/${cls.id}` as any)}>
          <StudentCard title={cls.name}>
            <Text style={styles.text}>{[cls.section, cls.term].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.text}>{cls.teacherName}</Text>
          </StudentCard>
        </TouchableOpacity>
      ))}
    </StudentScreen>
  );
}
