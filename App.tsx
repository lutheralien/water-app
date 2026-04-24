import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

type Reading = {
  id: string;
  sensorValue: number;
  ntu: number;
  waterStatus: string;
  source: string;
  recordedAt: string;
  receivedAt: string;
};

const API_BASE = 'http://192.168.1.100:4000';
const POLL_INTERVAL_MS = 1000;

export default function App() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const lastUpdated = useMemo(() => {
    if (!reading) return 'No data yet';
    return new Date(reading.receivedAt).toLocaleString();
  }, [reading]);

  const fetchLatest = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/readings/latest`);
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      const data = await res.json();
      setReading(data.reading ?? null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reading');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    const timer = setInterval(fetchLatest, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLatest();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Water Quality Monitor</Text>
      <Text style={styles.subtitle}>Polling backend every 1 second</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.status}>{reading?.waterStatus ?? 'No reading'}</Text>

          <Text style={styles.label}>NTU</Text>
          <Text style={styles.value}>{reading ? reading.ntu.toFixed(2) : '-'}</Text>

          <Text style={styles.label}>Raw Sensor</Text>
          <Text style={styles.value}>{reading?.sensorValue ?? '-'}</Text>

          <Text style={styles.label}>Source</Text>
          <Text style={styles.value}>{reading?.source ?? '-'}</Text>

          <Text style={styles.label}>Last Update</Text>
          <Text style={styles.value}>{lastUpdated}</Text>
        </View>
      )}

      {error ? <Text style={styles.error}>Error: {error}</Text> : null}
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    color: '#475569',
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 2,
  },
  label: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  value: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
  },
  status: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  center: {
    justifyContent: 'center',
  },
});
