import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Colors } from '../../constants/theme';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('trips');

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.username}>Username_150</Text>
        <Text style={styles.bio}>bio</Text>
        <Text style={styles.location}>📍 Location</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>following</Text>
          </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  topBar: {
    backgroundColor: Colors.card, height: 100,
    alignItems: 'center', justifyContent: 'flex-end',
  },
  avatarSection: { marginBottom: -40 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.cream2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.cream,
  },
  content: { paddingHorizontal: 20, paddingTop: 46, paddingBottom: 40, alignItems: 'center' },
  username: { fontFamily: 'Lora_600SemiBold', fontSize: 20, color: Colors.brown900 },
  bio: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 4 },
  location: { fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, marginTop: 4 },
  statsRow: {
    flexDirection: 'row', gap: 32, marginTop: 18, marginBottom: 18,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: 'Lora_600SemiBold', fontSize: 18, color: Colors.brown900 },
  statLabel: { fontFamily: 'Lora_400Regular', fontSize: 11.5, color: Colors.brown600 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%' },
  editButton: {
    flex: 1, height: 42, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  editButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint },
  shareButton: {
    flex: 1, height: 42, borderRadius: 12, backgroundColor: Colors.brown900,
    alignItems: 'center', justifyContent: 'center',
  },
  shareButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 13.5, color: Colors.mint },
  tabRow: {
    flexDirection: 'row', width: '100%', borderBottomWidth: 1, borderBottomColor: Colors.line,
    marginBottom: 20,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingBottom: 12 },
  tabText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: Colors.brown600 },
  tabTextActive: { fontFamily: 'Lora_600SemiBold', color: Colors.brown900 },
  tabUnderline: {
    position: 'absolute', bottom: -1, height: 2, width: '60%', backgroundColor: Colors.brown900,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', marginBottom: 16,
  },
  sectionTitle: { fontFamily: 'Lora_600SemiBold', fontSize: 19, color: Colors.brown900 },
  addButton: {
    backgroundColor: Colors.brown900, borderRadius: 12, paddingHorizontal: 14, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  addButtonText: { fontFamily: 'Lora_600SemiBold', fontSize: 12.5, color: Colors.mint },
  emptyText: {
    fontFamily: 'Lora_400Regular', fontSize: 13, color: Colors.brown600, alignSelf: 'flex-start',
  },
});