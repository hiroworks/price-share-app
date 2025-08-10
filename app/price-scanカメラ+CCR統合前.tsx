// app/price-scan.tsx

import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';

export default function PriceScanScreen() {
  const { ocrText } = useLocalSearchParams<{ ocrText?: string }>();
  const text = typeof ocrText === 'string' ? ocrText : '';

  const priceRegex = /(?:¥|￥)?\d{2,6}(?:\.\d{1,2})?(?:円)?/g;
  const prices = text.match(priceRegex) || [];

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        OCR結果（全文）：
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 20 }}>
        {text || '（OCR結果がありません）'}
      </Text>

      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        抽出された価格情報：
      </Text>
      {prices.length > 0 ? (
        prices.map((price, idx) => (
          <Text key={idx} style={{ fontSize: 18, color: 'green' }}>
            🏷️ {price}
          </Text>
        ))
      ) : (
        <Text style={{ fontSize: 16, color: 'red' }}>
          価格が見つかりませんでした。
        </Text>
      )}
    </ScrollView>
  );
}
