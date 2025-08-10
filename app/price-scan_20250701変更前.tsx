// 📄 app/price-scan.tsx

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';


type RawShop = {
  name?: string;
  coordinates?: [number, number];
};

type Shop = {
  name: string;
  lat: number;
  lon: number;
};

export default function PriceScan() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [shopJson, setShopJson] = useState<any | null>(null);
  const [shops, setShops] = useState<any[]>([]); // JSON保持用
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!res.canceled) {
      const originalUri = res.assets[0].uri;

      const manipResult = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 500 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImageUri(manipResult.uri);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setOcrResult('位置情報の使用が許可されていません');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    }
  };

  const sendToServer = async () => {
    if (!imageUri) return;

    const form = new FormData();
    // @ts-ignore
    form.append('file', {
      uri: imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    try {
      const uploadResp = await fetch('http://192.168.3.12:8000/upload', {
        method: 'POST',
        body: form,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadJson = await uploadResp.json();
console.log('[DEBUG用データ表示] UPLOAD JSON:', JSON.stringify(uploadJson, null, 2));
/*
console.log('[DEBUG用データ表示] UPLOAD JSON:', JSON.stringify(uploadJson.result.検索結果[0].商品名, null, 2));
console.log('商品名:', uploadJson.result.検索結果[0].商品名);
console.log('最安価格:', uploadJson.result.検索結果[0].最安価格);
console.log('商品名 typeof :', typeof uploadJson.result.検索結果[0].商品名);
console.log('最安価格 typeof :', typeof uploadJson.result.検索結果[0].最安価格);
*/
    if (uploadJson.result) {
        setOcrResult(JSON.stringify(uploadJson.result, null, 2));


      // 商品名と価格の初期値を仮セット
      if (uploadJson) {
        // 商品名を抽出
        if (uploadJson.result.検索結果[0].商品名) {
          setProductName(uploadJson.result.検索結果[0].商品名);
        }
        // 本体価格を抽出
        if (uploadJson.result.検索結果[0].最安価格) {
          setPrice(uploadJson.result.検索結果[0].最安価格.toString());
        }
      }
/*
console.log('商品名1:', setProductName);
console.log('商品名2:', productName);
console.log('本体価格1:', setPrice);
console.log('本体価格2:', price);
*/



        return;
      }

      const filename = uploadJson.filename;
      if (!filename) {
        setOcrResult('アップロード失敗: ファイル名が返されませんでした');
        return;
      }

      const ocrResp = await fetch('http://192.168.3.12:8000/ocr', {
        method: 'POST',
        body: JSON.stringify({ filename }),
        headers: { 'Content-Type': 'application/json' },
      });

      const text = await ocrResp.text();
      let ocrJson = null;
      try {
        ocrJson = JSON.parse(text);
console.log('[DEBUG用データ表示] OCR JSON:', ocrJson); // ←ここ
      } catch {
        setOcrResult('OCRレスポンスの解析に失敗しました:\n' + text);
        return;
      }

      // 📍 OCR結果を表示
      setOcrResult(JSON.stringify(ocrJson, null, 2));

console.log('result:', ocrJson.result);
console.log('structured:', ocrJson.structured);
console.log('本体価格:', ocrJson.structured.本体価格);

      // 商品名と価格の初期値を仮セット
      if (ocrJson) {
        if (ocrJson.result.検索結果[0]) {
          // 商品名を抽出
          if (ocrJson.result.検索結果[0].商品名) {
            setProductName(ocrJson.result.検索結果[0].商品名);
          }
        } else if (ocrJson.structured) {
        // 商品名を抽出
          if (ocrJson.structured.商品名) {
            setProductName(ocrJson.structured.商品名);
          }
        }
        if (ocrJson.structured) {
          // 本体価格を抽出
          if (ocrJson.structured.本体価格) {
            setPrice(ocrJson.structured.本体価格.toString());
          }
        }
      }
/*
console.log('商品名1:', price);
console.log('商品名2:', setPrice);
console.log('本体価格1:', productName);
console.log('本体価格2:', setProductName);
*/
      // 🏪 近隣店舗検索も実行
      if (location) {
        searchNearbyShops(location.lat, location.lon);
      }

    } catch (e: any) {
      console.error('通信エラー:', e.message);
      setOcrResult('エラー: ' + e.message);
    }
  };

  const searchNearbyShops = async (lat: number, lon: number) => {
    try {
      const res = await fetch('http://192.168.3.12:8000/api/nearby-shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }), // ← 絶対必要
      });

      if (!res.ok) {
        const errText = await res.text();
        setOcrResult(prev => (prev ?? '') + '\n\n🏪 店舗検索エラー: ' + errText);
        return;
      }

      const json = await res.json();
console.log('店舗情報JSON:', json);

      const shopListText = (json.shops || [])
        .sort((a: any, b: any) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)) // 距離で昇順ソート
        .map((shop: any) => {
          const name = shop.name ?? '名称不明';
          const category = shop.category ?? 'カテゴリ不明';
          const distance = shop.distance_km?.toFixed(2) ?? '距離不明';
          return `・${name}（${category}）… ${distance} km`;
        })
        .join('\n');

      setOcrResult(prev => (prev ?? '') + '\n\n🏪 近隣店舗一覧（近い順）:\n' + shopListText);


//      setOcrResult(prev => (prev ?? '') + '\n\n🏪 近隣店舗:\n' + JSON.stringify(json, null, 2));

      // ✅ coordinates → lat/lon に変換、安全確認
      const converted: Shop[] = (json.shops || []).map((s: RawShop) => ({
        name: s.name ?? '店舗名なし',
        lat: s.coordinates?.[1],
        lon: s.coordinates?.[0],
      })).filter((s: Shop | Partial<Shop>): s is Shop =>
        typeof s.lat === 'number' &&
        typeof s.lon === 'number' &&
        !isNaN(s.lat) &&
        !isNaN(s.lon)
      );

      // ✅ セット & 地図ページへ遷移
      setShops(converted);
      /*
      router.push({
        pathname: '/nearby-shops',
        params: {
          shops: JSON.stringify(converted),
        },
      });
      */
    } catch (e: any) {
      setOcrResult('店舗検索失敗: ' + e.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="📸 写真を撮る" onPress={takePhoto} />
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: 200, height: 200, margin: 10 }} />}
      {imageUri && <Button title="🔍 OCR実行" onPress={sendToServer} />}
      {ocrResult && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: 'bold' }}>📄 結果：</Text>
          <Text selectable>{ocrResult}</Text>

          <Text style={{ marginTop: 10 }}>🛍 商品名：</Text>
          <TextInput
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
          />

          <Text>💴 本体価格：</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          <Button
            title="✅ 商品決定"
            onPress={() => {
              if (shops.length === 0) {
                alert('近隣店舗が取得されていません');
                return;
              }

              const sorted = [...shops].sort((a, b) => {
                const d1 = distance(location!, a);
                const d2 = distance(location!, b);
                return d1 - d2;
              });

              router.push({
                pathname: '/nearby-shops',
                params: {
                  shops: JSON.stringify(sorted),
                  productName,
                  price,
                },
              });
            }}
          />

          <Button
            title="🗺 地図"
            onPress={() => {
              router.push({
                pathname: '/nearby-shops',
                params: {
                  shops: JSON.stringify(shops),
                },
              });
            }}
          />

        </View>
      )}

    </ScrollView>
  );
}

function distance(loc1: { lat: number; lon: number }, shop: { lat: number; lon: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(shop.lat - loc1.lat);
  const dLon = toRad(shop.lon - loc1.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(shop.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    width: 200,
    marginBottom: 10,
  },
});
