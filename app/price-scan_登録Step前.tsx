// app/price-scan.tsx

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

type Shop = {
  name?: string;
  category?: string;
  distance_km?: number;
};

export default function PriceScan() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [janResult, setJanResult] = useState<string | null>(null);
/*
  const [janResult, setJanResult] = useState<{
    jan?: string;
    productName?: string;
    imageUrl?: string;
  } | null>(null);
*/
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [shopResult, setShopResult] = useState<string | null>(null);

  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!res.canceled) {
      const originalUri = res.assets[0].uri;

      // 画像のメタ情報取得（サイズなど）
      const manipResult = await ImageManipulator.manipulateAsync(
        originalUri,
        [{ resize: { width: 500 } }], // 横幅500pxにリサイズ（縦横比維持）
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImageUri(manipResult.uri); // 縮小後の画像URIを使用
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
      // 画像をアップロード
      console.log('アップロードリクエスト送信中...');
      const uploadResp = await fetch('http://192.168.3.12:8000/upload', {
        method: 'POST',
        body: form,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });


      // ✅ ここで即座にバーコード結果を受信（OCR未実行でも）
      const janResult = await uploadResp.json();
      console.log('バーコードレスポンス受信:', janResult);
      if (janResult) {
        setJanResult(JSON.stringify(janResult, null, 2));
/*
        setJanResult({
          jan: janResult.barcode?.キーワード,
          productName: janResult.rakuten?.検索結果?.[0]?.商品名,
          imageUrl: janResult.rakuten?.検索結果?.[0]?.画像URL,
      });
*/

//      if (janResult.recognition) {
//        setJanResult(JSON.stringify(janResult.recognition, null, 2));
//        return;
      }

      if (!janResult.filename) {
        setJanResult('アップロード失敗: ファイル名が返されませんでした');
        return;
      }


      // OCR実行リクエスト
      try {
        console.log('OCRリクエスト送信中...');
        const ocrResp = await fetch('http://192.168.3.12:8000/ocr', {
          method: 'POST',
          body: JSON.stringify({ filename: janResult.filename }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('OCRレスポンス受信:', ocrResp.status);
        if (!ocrResp.ok) {
          const errorText = await ocrResp.text();
          console.error(`HTTPエラー: ${ocrResp.status}`);
          console.error('レスポンス本文:', errorText);
          setOcrResult(`OCRサーバーからエラー応答:\n${errorText}`);
          return;
        }

        const text = await ocrResp.text(); // まずテキストとして受け取る
        console.log('OCRレスポンス文字列:', text); // ← 追加（JSONパース前に確認）

        let ocrJson = null;
        try {
          ocrJson = JSON.parse(text);
          console.log('OCRレスポンスJSON:', ocrJson);
        } catch (jsonErr) {
          console.error('JSON解析エラー:', jsonErr);
          setOcrResult('OCRサーバーから不正なレスポンスを受信:\n' + text);
          return;
        }

        // 表示
        const recognition = ocrJson.recognition;

        if (recognition && (recognition['本体価格'] || recognition['商品名'])) {
          // OCR結果あり
          setOcrResult(JSON.stringify(ocrJson, null, 2));
        } else if (
          ocrJson &&
          ocrJson.corrected_image_path &&
          ocrJson.extracted_image_path
        ) {
          // 前処理だけ成功
          setOcrResult('値札抽出と傾き補正が完了しました。\n' + JSON.stringify(ocrJson, null, 2));
        } else {
          console.warn('必要なキーが見つかりません:', ocrJson);
          setOcrResult('OCR結果の解析に失敗しました');
        }

      } catch (error: any) {
        console.error('通信エラー:', error.message);
        setOcrResult(`通信エラーが発生しました: ${error.message}`);
      }



      // 近隣店舗検索
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setShopResult('位置情報の使用が許可されていません');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        const shopResp = await fetch('http://192.168.3.12:8000/api/nearby-shops', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: latitude,
            lon: longitude,
          }),
        });

        if (!shopResp.ok) {
          const errorText = await shopResp.text();
          console.error('店舗検索エラー:', errorText);
          setShopResult(`店舗検索エラー: ${errorText}`);
          return;
        }

        const shopJson = await shopResp.json();
        console.log('近隣店舗検索結果:', shopJson);
        if (shopJson?.shops?.length) {
          const formatted = shopJson.shops
            .map((s: any) => `・${s.name}（${s.category}）距離: ${s.distance_km}km`)
            .join('\n');
          setShopResult(formatted);
        } else {
          setShopResult('近隣に店舗は見つかりませんでした');
        }

        //        setShopResult(prev => (prev ?? '') + '\n\n🏪近隣店舗:\n' + JSON.stringify(shopJson, null, 2));

      } catch (e: any) {
        console.error('位置情報取得・店舗検索失敗:', e.message);
        setShopResult('位置情報取得に失敗しました: ' + e.message);
      }


    } catch (error: any) {
      console.error('アップロード中に通信エラー:', error.message);
      setShopResult(`アップロード中に通信エラーが発生しました: ${error.message}`);
    }
  };

return (
  <View style={styles.container}>
    <Button title="写真を撮る" onPress={takePhoto} />
    {imageUri && (
      <>
        <Image source={{ uri: imageUri }} style={{ width: 200, height: 200, margin: 10 }} />
        <Button title="OCR実行" onPress={sendToServer} />
      </>
    )}

    <ScrollView style={{ marginTop: 20, width: '90%' }}>
      {janResult && (
        <>
          <Text style={styles.heading}>✅✅バーコード認識結果✅✅</Text>
          <Text style={styles.result}>{janResult}</Text>
        </>
      )}
      {ocrResult && (
        <>
          <Text style={styles.heading}>✅✅OCR認識結果✅✅</Text>
          <Text style={styles.result}>{ocrResult}</Text>
        </>
      )}
      {shopResult && (
        <>
          <Text style={styles.heading}>✅✅近隣店舗一覧✅✅</Text>
          <Text style={styles.result}>{shopResult}</Text>
        </>
      )}
    </ScrollView>

  </View>
);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 16,
    marginVertical: 8,
    color: '#222',
  },
  result: {
    fontFamily: 'monospace',
    backgroundColor: '#f3f3f3',
    padding: 8,
    borderRadius: 6,
  },
});

