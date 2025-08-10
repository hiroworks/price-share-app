// app/index.tsx

import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📄 値札OCRアプリへようこそ</Text>
      <Button
        title="価格読み取りに進む"
        onPress={() => router.push('/price-scan')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});



/*
import { router } from 'expo-router';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

export default function IndexScreen() {
  const handleRunSampleOCR = async () => {
    try {
      const response = await fetch('http://192.168.3.12:3000/api/ocr');

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
      console.error('OCR取得エラー:', err);
      Alert.alert('エラー', err.message || 'OCR実行に失敗しました。');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📄 サンプルOCR確認</Text>
      <Button title="OCRを実行する" onPress={handleRunSampleOCR} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});
*/