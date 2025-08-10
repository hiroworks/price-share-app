// price-share-app/app/nearby-shops.tsx
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

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
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報の取得が許可されていません。');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      try {
        const response = await fetch('http://192.168.3.12:3000/api/nearby-shops', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }),
        });

        const data = await response.json();
        setShops(data.shops || []);
      } catch (err) {
        console.error(err);
        Alert.alert('店舗情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    })();
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
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker
        coordinate={location}
        title="あなたの現在地"
        pinColor="blue"
      />
      {shops.map((shop, index) => (
        <Marker
          key={index}
          coordinate={{ latitude: shop.lat, longitude: shop.lon }}
          title={shop.name}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
