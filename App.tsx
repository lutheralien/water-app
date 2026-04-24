import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

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

const statusTheme: Record<string, { bg: string; fg: string; accent: string }> = {
  SAFE: { bg: '#e8f7ef', fg: '#0d7a46', accent: '#16a34a' },
  CLOUDY: { bg: '#fff7e6', fg: '#9a6600', accent: '#f59e0b' },
  DIRTY: { bg: '#fff0eb', fg: '#9d3412', accent: '#ea580c' },
  UNSAFE: { bg: '#ffe9ea', fg: '#b42318', accent: '#dc2626' }
};

function getStatusTheme(status?: string) {
  if (!status) {
    return { bg: '#ecf1ff', fg: '#1d4ed8', accent: '#3b82f6' };
  }

  return statusTheme[status] || { bg: '#f1f5f9', fg: '#334155', accent: '#64748b' };
}

export default function App() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  const theme = getStatusTheme(reading?.waterStatus);

  const lastUpdated = useMemo(() => {
    if (!reading) return 'No data yet';
    return new Date(reading.receivedAt).toLocaleString();
  }, [reading]);

  const recordedAt = useMemo(() => {
    if (!reading?.recordedAt) return '-';
    return new Date(reading.recordedAt).toLocaleTimeString();
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

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLatest();
  };

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.12]
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.8]
  });

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.bgCircleA} />
      <View style={styles.bgCircleB} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Water Project</Text>
            <Text style={styles.heading}>Quality Dashboard</Text>
          </View>
          <Pressable style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={[styles.heroCard, { borderColor: theme.accent }]}> 
          <View style={styles.liveRow}>
            <Animated.View
              style={[
                styles.pulseOuter,
                {
                  backgroundColor: theme.accent,
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }]
                }
              ]}
            />
            <View style={[styles.pulseCore, { backgroundColor: theme.accent }]} />
            <Text style={styles.liveText}>Live feed every second</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0f172a" style={styles.loader} />
          ) : (
            <>
              <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}> 
                <Text style={[styles.statusText, { color: theme.fg }]}>{reading?.waterStatus ?? 'No reading'}</Text>
              </View>
              <Text style={styles.statusLabel}>Current Water Status</Text>
            </>
          )}
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>NTU</Text>
            <Text style={styles.metricValue}>{reading ? reading.ntu.toFixed(2) : '-'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Raw Sensor</Text>
            <Text style={styles.metricValue}>{reading?.sensorValue ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoHeading}>Telemetry</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Source</Text>
            <Text style={styles.infoVal}>{reading?.source ?? '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Recorded At</Text>
            <Text style={styles.infoVal}>{recordedAt}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Last Updated</Text>
            <Text style={styles.infoVal}>{lastUpdated}</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>Connection error: {error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  bgCircleA: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#c4d7ff',
    top: -70,
    right: -60,
    opacity: 0.55
  },
  bgCircleB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#b8f2e6',
    bottom: 30,
    left: -90,
    opacity: 0.45
  },
  container: {
    paddingTop: 72,
    paddingBottom: 36,
    paddingHorizontal: 20,
    gap: 14
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#475569',
    fontWeight: '600'
  },
  heading: {
    fontSize: 32,
    lineHeight: 34,
    color: '#0f172a',
    fontWeight: '800'
  },
  refreshBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  refreshBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative'
  },
  pulseOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    left: 0
  },
  pulseCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10
  },
  liveText: {
    color: '#334155',
    fontWeight: '600'
  },
  loader: {
    marginVertical: 18
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8
  },
  statusText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  statusLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500'
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dbe5f1'
  },
  metricLabel: {
    color: '#64748b',
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 6,
    fontWeight: '700'
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800'
  },
  infoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    gap: 8
  },
  infoHeading: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8
  },
  infoKey: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12
  },
  infoVal: {
    color: '#f1f5f9',
    fontWeight: '700',
    fontSize: 12,
    maxWidth: '62%',
    textAlign: 'right'
  },
  error: {
    color: '#b91c1c',
    fontWeight: '700',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 10
  }
});
