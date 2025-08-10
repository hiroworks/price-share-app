// app/price-scan.tsx

import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { useCurrentLocation } from '../hooks/useLocation';
import { useNearbyStores } from '../hooks/useNearbyStores';

export default function PriceScanScreen() {
  const { ocrText } = useLocalSearchParams<{ ocrText?: string }>();
  const text = typeof ocrText === 'string' ? ocrText : '';

  const priceRegex = /(?:¥|￥)?\d{2,6}(?:\.\d{1,2})?(?:円)?/g;
  const prices = text.match(priceRegex) || [];

  // ✅ 正しい形式でuseCurrentLocationを使用
  const { location, address, error } = useCurrentLocation();
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  const { stores } = useNearbyStores(latitude, longitude);

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      {/* 現在地と店舗表示 */}
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>現在地：</Text>
      {error ? (
        <Text style={{ color: 'red' }}>位置情報エラー: {error}</Text>
      ) : (
        <>
          <Text style={{ fontSize: 16 }}>緯度: {latitude}</Text>
          <Text style={{ fontSize: 16 }}>経度: {longitude}</Text>
          <Text style={{ fontSize: 16, marginBottom: 5 }}>住所: {address ?? '取得中...'}</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>店舗名候補:</Text>
          {stores.length > 0 ? (
            stores.map((store, idx) => (
              <Text key={idx} style={{ fontSize: 16 }}>🏬 {store}</Text>
            ))
          ) : (
            <Text style={{ fontSize: 16, fontStyle: 'italic' }}>候補なし</Text>
          )}
        </>
      )}

      {/* OCR結果の表示 */}
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 }}>
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
