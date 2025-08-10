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
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [shopJson, setShopJson] = useState<any | null>(null);
  const [productName, setProductName] = useState<any>(null);
  const [price, setPrice] = useState<any>(null);
  const [combinedResult, setCombinedResult] = useState<any>(null);


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
    searchNearbyShops();  // 近隣店舗検索
  };




  // 近隣店舗検索
  const searchNearbyShops = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setOcrResult('位置情報の使用が許可されていません');
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
        setOcrResult(`店舗検索エラー: ${errorText}`);
        return;
      }

      const shopJson = await shopResp.json();
      console.log('近隣店舗検索結果:', shopJson);
      setOcrResult(prev => (prev ?? '') + '\n\n🏪近隣店舗:\n' + JSON.stringify(shopJson, null, 2));
    } catch (e: any) {
      console.error('位置情報取得・店舗検索失敗:', e.message);
      setOcrResult('位置情報取得に失敗しました: ' + e.message);
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
      const uploadResp = await fetch('http://192.168.3.12:8000/upload', {
        method: 'POST',
        body: form,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadJson = await uploadResp.json();
console.log('Upload Response:', uploadJson);


    let resultText = '';

    // ✅ 即時のバーコード結果 or OCR結果に応じて表示
    if (uploadJson.source === 'barcode' && uploadJson.barcode) {
      resultText += `📦 バーコード認識結果:\n`;
      const item = uploadJson.rakuten?.検索結果?.[0];
      if (item) {
        resultText += `・商品名: ${item.商品名}\n`;
        resultText += `・価格: ${item.最安価格}円\n`;
        setProductName(item.商品名 ?? '');
        setPrice(item.最安価格?.toString() ?? '');
      } else {
        resultText += `楽天検索結果なし\n`;
      }

      setOcrResult(resultText); // 一旦バーコード結果を表示

      // ✅ OCRが非同期で走っているため、一定時間後に結果を取得
      const filename = uploadJson.filename;
      if (filename) {
        setTimeout(() => {
          fetch(`http://192.168.3.12:8000/ocr-result?filename=${filename}`)
            .then(res => res.json())
            .then(ocrJson => {
              let ocrText = '\n📄 OCR結果:\n';

              const ocr = ocrJson.ocr?.structured;
              const rakuten = ocrJson.rakuten?.検索結果?.[0];

              if (ocr) {
                ocrText += `・商品名: ${ocr.商品名}\n`;
                ocrText += `・本体価格: ${ocr.本体価格}円\n`;
              }

              if (rakuten) {
                ocrText += `・楽天商品: ${rakuten.商品名}\n`;
                ocrText += `・楽天価格: ${rakuten.最安価格}円\n`;
              }

              setOcrResult(prev => prev + '\n' + ocrText);
            })
            .catch(err => {
              console.error('OCR取得エラー:', err);
              setOcrResult(prev => prev + '\nOCR結果取得エラー');
            });
        }, 3000); // 3秒後に取得（必要なら調整可能）
      }
    }

    // ✅ OCR即時応答（バーコード失敗時）
    else if (uploadJson.source === 'ocr') {
      const ocr = uploadJson.ocr?.structured;
      const rakuten = uploadJson.rakuten?.検索結果?.[0];

      if (ocr || rakuten) {
        resultText += `📄 OCR認識結果:\n`;
        if (ocr) {
          resultText += `・商品名: ${ocr.商品名}\n`;
          resultText += `・本体価格: ${ocr.本体価格}円\n`;
        }
        if (rakuten) {
          resultText += `・楽天商品: ${rakuten.商品名}\n`;
          resultText += `・楽天価格: ${rakuten.最安価格}円\n`;
        }

        setProductName(ocr?.商品名 ?? '');
        setPrice(ocr?.本体価格?.toString() ?? '');
        setOcrResult(resultText);
      } else {
        setOcrResult('OCR結果なし');
      }
    }


/*
    // ✅ 表示テキストを構築
    let resultText = '';

    // === 1. バーコード結果があれば先に処理 ===
    if (uploadJson.source === 'barcode' && uploadJson.barcode) {
      resultText += `📦 バーコード認識結果（${uploadJson.barcode.検索種別}）:\n`;
      const items = uploadJson.barcode.検索結果;
      if (items?.length > 0) {
        resultText += `・商品名: ${items[0].商品名}\n`;
        resultText += `・最安価格: ${items[0].最安価格}円\n`;
        // 初期入力として商品名と価格をセット
        setProductName(items[0].商品名 ?? '');
        setPrice(items[0].最安価格?.toString() ?? '');
      } else {
        resultText += '検索結果なし\n';
      }
    }

    // === 2. OCR結果が返ってきたら続けて処理 ===
    if (uploadJson.ocr) {
      const ocrStructured = uploadJson.ocr.structured;
      if (ocrStructured) {
        resultText += `\n🔤 OCR認識結果:\n`;
        resultText += `・商品名: ${ocrStructured.商品名}\n`;
        resultText += `・本体価格: ${ocrStructured.本体価格}円\n`;
        resultText += `・税込価格: ${ocrStructured.税込価格 ?? '不明'}円\n`;
        setProductName(ocrStructured.商品名 ?? '');
        setPrice(ocrStructured.本体価格?.toString() ?? '');
      }
    }

    // === 3. 楽天検索結果（barcode or ocrの後に共通） ===
    if (uploadJson.rakuten?.検索結果?.length > 0) {
      const rakuten = uploadJson.rakuten;
      resultText += `\n🔍 楽天検索（${rakuten.検索種別}）:\n`;
      const item = rakuten.検索結果[0];
      resultText += `・商品名: ${item.商品名}\n`;
      resultText += `・価格: ${item.最安価格}円\n`;
    }
*/


    // ✅ 全体構造から必要なデータを取り出して表示
//    setOcrResult(JSON.stringify(uploadJson, null, 2)); // 全体表示（デバッグ）

/*
    // 商品名と価格の初期値セット（楽天結果優先）
    const rakuten = uploadJson.rakuten?.検索結果?.[0];
    if (rakuten?.商品名) setProductName(rakuten.商品名);
    if (rakuten?.最安価格) setPrice(rakuten.最安価格.toString());
*/    

/*
      // ✅ ここで即座にバーコード結果を表示（OCR未実行でも）
      if (uploadJson.result) {
        setOcrResult(JSON.stringify(uploadJson.result, null, 2));
        return;
      }

      if (!uploadJson.filename) {
        setOcrResult('アップロード失敗: ファイル名が返されませんでした');
        return;
      }
*/

/*
      // OCR実行リクエスト
      try {
        console.log('OCRリクエスト送信中...');
        const ocrResp = await fetch('http://192.168.3.12:8000/ocr', {
          method: 'POST',
          body: JSON.stringify({ filename: uploadJson.filename }),
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



console.log('ocrJson:', ocrJson);
console.log('result:', ocrJson.result);
console.log('structured:', ocrJson.structured);
console.log('本体価格:', ocrJson.structured.本体価格);
*/
/***
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
***/



/*
        // 表示
        if (ocrJson && (ocrJson.structured.本体価格 || ocrJson.structured.商品名)) {
          // OCR結果あり（通常パターン）
          setOcrResult(JSON.stringify(ocrJson, null, 2));

//        if (ocrJson && (ocrJson['本体価格'] || ocrJson['商品名'])) {
//          // OCR結果あり（通常パターン）
//          setOcrResult(JSON.stringify(ocrJson, null, 2));

          // 近隣店舗検索リクエスト
          await searchNearbyShops();  // ← OCR結果表示後や、成功した後に呼ぶのが自然

        } else if (ocrJson && ocrJson.corrected_image_path && ocrJson.extracted_image_path) {
          // 値札抽出モード（画像処理だけ完了したパターン）
          setOcrResult('値札抽出と傾き補正が完了しました。\n' + JSON.stringify(ocrJson, null, 2));
        } else {
          // 予期しない形式
          console.warn('必要なキーが見つかりません:', ocrJson);
          setOcrResult('OCR結果の解析に失敗しました');
        }

      } catch (error: any) {
        console.error('通信エラー:', error.message);
        setOcrResult(`通信エラーが発生しました: ${error.message}`);
      }
*/
    } catch (error: any) {
      console.error('アップロード中に通信エラー:', error.message);
      setOcrResult(`アップロード中に通信エラーが発生しました: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="写真を撮る" onPress={takePhoto} />
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: 200, height: 200, margin: 10 }} />}
      {imageUri && <Button title="OCR実行" onPress={sendToServer} />}
      {imageUri && <Button title="近隣店舗検索" onPress={searchNearbyShops} />}
      <ScrollView style={{ maxHeight: 400 }}>
        {ocrResult && (
          <View>
            <Text>OCR結果：</Text>
            <Text>{ocrResult}</Text>
            <Text style={{ marginTop: 20 }}>🏪 近隣店舗一覧：</Text>
              {shopJson?.shops?.map((shop: Shop, index: number) => (
                <Text key={index}>
                  ・{shop.name ?? '名称不明'}（{shop.category}）: 約{shop.distance_km}km
                </Text>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
