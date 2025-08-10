// app/index.tsx

import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

export default function IndexScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);

  const handleCapture = async () => {
    const camera = cameraRef.current;
    if (!camera) {
      Alert.alert('カメラが初期化されていません');
      return;
    }

    try {
      const photo: CameraCapturedPicture = await camera.takePictureAsync();

      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch('http://192.168.3.12:3000/api/ocr', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCRサーバーエラー: ${errorText}`);
      }

      const result = await response.json();

      router.push({
        pathname: '/price-scan',
        params: {
          ocrText: result.text,
        },
      });
    } catch (err: any) {
      console.error('OCR送信エラー:', err);
      Alert.alert('エラー', err.message || '撮影またはOCR送信に失敗しました。');
    }
  };

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

      const response = await fetch('http://192.168.3.12:3000/api/nearby-shops', {
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
        pathname: '/nearby-shops',
        params: {
          count: String(result.count),
          shops: JSON.stringify(result.shops),
        },
      });
    } catch (err: any) {
      console.error('近隣店舗取得エラー:', err);
      Alert.alert('エラー', err.message || '近隣店舗の取得に失敗しました。');
    }
  };

  if (!permission) {
    return <View><Text>カメラ許可の状態を確認中...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text>カメラの使用を許可してください。</Text>
        <Button title="カメラ許可をリクエスト" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} />
      <View style={styles.buttonContainer}>
        <Button title="📸 撮影" onPress={handleCapture} />
        <View style={{ marginTop: 10 }} />
        <Button title="📍 近隣の店舗を表示" onPress={handleNearbyShops} />
      </View>
    </View>
  );
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
});
