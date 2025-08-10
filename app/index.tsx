// app/index.tsx

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';

// ✅ 型定義を明示する
//const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedView: React.ComponentType<React.ComponentProps<typeof View>> =
  Animated.createAnimatedComponent(View);

export default function IndexScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [fadeAnim] = useState(new Animated.Value(1)); // 初期は不透明（1）
//  const AnimatedView = Animated.createAnimatedComponent(View);

  const handleNearbyShops = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      if (status !== 'granted') {
        Alert.alert('位置情報の取得が許可されていません');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;


      const response = await fetch('http://192.168.3.12:8000/api/nearby-shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`サーバーエラー: ${errorText}`);
      }

      const result = await response.json();

      // ✅ ここでデバッグログ出力
      console.log('🚩 受け取った近隣店舗データ:', result);

      router.push({
        pathname: '/price-scan',
        params: {
          ocrText: result.text,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        },
      });
      /*
      router.push({
        pathname: '/price-scan',
        params: {
          ocrText: result.text,
          lat: latitude.toString(),
          lon: longitude.toString(),
        },
      });

      router.push({
        pathname: '/nearby-shops',
        params: {
          count: String(result.count),
          shops: JSON.stringify(result.shops),
        },
      });
      */
     } catch (err: any) {
      console.error('近隣店舗取得エラー:', err.message);
      Alert.alert('通信エラー', JSON.stringify(err));
    }     
      /*
    } catch (err: any) {
      console.error('近隣店舗取得エラー:', err);
      Alert.alert('エラー', err.message || '近隣店舗の取得に失敗しました。');
    }
    */
  };

  useEffect(() => {
    // 2秒かけてフェードアウト
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 3000,
      useNativeDriver: true,
    }).start(() => {
      router.push('/price-scan'); // フェードアウト後に遷移
    });
  }, []);

  return (
    <AnimatedView style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>📄 値札スキャンアプリへようこそ</Text>
    </AnimatedView>
  );


/*
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📄 値札OCRアプリへようこそ</Text>
      <Button
        title="価格読み取りに進む"
        onPress={() => router.push('/price-scan')}
      />
      <View style={styles.buttonContainer}>
        <View style={{ marginTop: 10 }} />
        <Button title="📍 近隣の店舗を表示" onPress={handleNearbyShops} />
      </View>
    </View>
  );
*/

}

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    elevation: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
});

