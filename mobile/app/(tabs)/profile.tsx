import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import Backdrop from '../../components/Backdrop';
import MeshBlobs from '../../components/MeshBlobs';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('trips');

  return (
    <LinearGradient colors={['#F6F1DC', '#E6D9AE']} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <MeshBlobs height={900} style={styles.backdrop} />
        <Backdrop height={220} style={styles.backdrop} />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identitySection}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 36 }}>👤</Text>
            </View>

            <Text style={styles.username}>Username_150</Text>
            <Text style={styles.bio}>bio</Text>
            <Text style={styles.location}>📍 Location</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>likes</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>✎ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton}>
                <Text style={styles.shareButtonText}>⇱ Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('trips')}
            >
              <Text style={[styles.tabText, activeTab === 'trips' && styles.tabTextActive]}>
                📍 Trips
              </Text>
              {activeTab === 'trips' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('journal')}
            >
              <Text style={[styles.tabText, activeTab === 'journal' && styles.tabTextActive]}>
                📖 Journal
              </Text>
              {activeTab === 'journal' && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'trips' ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Your Travels</Text>
                  <TouchableOpacity style={styles.addButton}>
                    <Text style={styles.addButtonText}>+ Add new plan</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.emptyText}>No trips yet.</Text>
              </>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Your Travel Stories</Text>
                  <TouchableOpacity style={styles.addButton}>
                    <Text style={styles.addButtonText}>+ New post</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.emptyText}>No posts yet.</Text>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  identitySection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.line,
    marginBottom: 12,
  },
  username: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900 },
  bio: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 4 },
  location: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 4 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 20, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  statLabel: { fontFamily: 'Lora_400Regular', fontSize: 11, color: Colors.brown600, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.line },

  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  editButton: {
    flex: 1, height: 42, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  editButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.mint },
  shareButton: {
    flex: 1, height: 42, borderRadius: 12, backgroundColor: 'transparent',
    borderWidth: 1.4, borderColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  shareButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13, color: Colors.brown900 },

  divider: { height: 1, backgroundColor: Colors.line, marginBottom: 4 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.line, marginBottom: 20 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600 },
  tabTextActive: { fontFamily: 'Lora_600SemiBold', color: Colors.brown900 },
  tabUnderline: {
    position: 'absolute', bottom: -1, height: 2, width: '55%', backgroundColor: Colors.brown900,
  },

  tabContent: { paddingHorizontal: 2 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  addButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, paddingHorizontal: 14, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.mint },
  emptyText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600 },
});