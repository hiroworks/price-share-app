// app/index.tsx

import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function PriceScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  if (permission === null) {
    return (
      <View style={styles.center}>
        <Text>カメラの権限を確認中...</Text>
      </View>
    );
  }
  if (!permission.granted) {
    // 権限がない場合、リクエストを表示
    return (
      <View style={styles.center}>
        <Text>カメラへのアクセスが必要です</Text>
        <Button title="許可する" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.buttonContainer}>
        <Button title="スキャン" onPress={() => router.push({ pathname: '/price-scan' })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
