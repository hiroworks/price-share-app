// price-share-app/app/store-detect.tsx
import React, { useState } from 'react';
import { ActivityIndicator, Button, Text, View } from 'react-native';
import { useCurrentLocation } from '../hooks/useLocation';

export default function StoreDetectScreen() {
  const location = useCurrentLocation();
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNearestStore = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const res = await fetch('http://192.168.3.12:3000/api/nearest-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      });
      const data = await res.json();
      setStoreName(data.storeName || '店舗名が取得できませんでした');
    } catch (e) {
      console.error('通信エラー:', e);
      setStoreName('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="現在地から店舗名を取得" onPress={fetchNearestStore} />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        storeName && (
          <Text style={{ marginTop: 20, fontSize: 18 }}>📍 現在の店舗: {storeName}</Text>
        )
      )}
    </View>
  );
}
