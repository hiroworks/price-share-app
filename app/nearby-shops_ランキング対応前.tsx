// price-share-app/app/nearby-shops.tsx
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Shop = {
  name: string;
  lat: number;
  lon: number;
};

type LocationCoords = {
  latitude: number;
  longitude: number;
};

export default function NearbyShopsScreen() {
  const { shops, productName, price } = useLocalSearchParams<{ shops?: string; productName?: string; price?: string }>();

  const parsedShops: Shop[] = (() => {
    try {
      return shops ? JSON.parse(shops) : [];
    } catch {
      return [];
    }
  })();

  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報の取得が許可されていません。');
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      if (isMounted) {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !location) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🛍 商品名: {productName}</Text>
      <Text style={styles.heading}>💴 本体価格: {price}</Text>

      <Text style={styles.subheading}>🏪 店舗一覧（近い順）:</Text>

      <FlatList
        data={parsedShops}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => setSelectedIndex(index)}
          >
            <Text>
              {selectedIndex === index ? '🔘' : '⚪'} {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {selectedIndex !== null && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: 'green' }}>✅ 選択された店舗: {parsedShops[selectedIndex].name}</Text>
          <Button title="🗺 地図で見る" onPress={() => {
            Alert.alert(`選択店舗: ${parsedShops[selectedIndex].name}`);
          }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 14,
    marginTop: 20,
    marginBottom: 10,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});
