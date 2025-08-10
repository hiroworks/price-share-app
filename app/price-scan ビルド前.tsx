// app/price-scan.tsx

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Shop = {
  name?: string;
  category?: string;
  coordinates?: [number, number]; 
  lat?: number;
  lon?: number;
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

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);

  const [janInfo, setJanInfo] = useState<{ jan: string; productName: string; imageUrl: string } | null>(null);
  const [ocrInfo, setOcrInfo] = useState<{ productName: string; price: string } | null>(null);
  const [finalProductName, setFinalProductName] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [finalImageUrl, setFinalImageUrl] = useState('');
  const [finalJanCode, setFinalJanCode] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopIndex, setSelectedShopIndex] = useState<number | null>(null);
  const [captureStage, setCaptureStage] = useState<'label' | 'product' | 'done'>('label');
  const [labelImageUri, setLabelImageUri] = useState<string | null>(null);
  const [productImageUri, setProductImageUri] = useState<string | null>(null);


  useEffect(() => {
    // 起動時にカメラを起動
    takePhoto();
  }, []);

  type RankingItem = {
    商品名: string;
    価格: number;
    店舗名: string;
    商品画像: string;
    緯度: string;
    経度: string;
  };

  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankJson, setRankJson] = useState<RankingItem[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);


//  const [step, setStep] = useState<1 | 2 | 3 | 4>(0); // ← 初期状態は 0
//  const [janInfo, setJanInfo] = useState<{ jan: string; productName: string; imageUrl?: string } | null>(null);
//  const [finalProductName, setFinalProductName] = useState('');
//  const [finalJanCode, setFinalJanCode] = useState('');
//  const [finalImageUrl, setFinalImageUrl] = useState('');

  const [selectedItem, setSelectedItem] = useState<{
    商品名: string;
    本体価格: string;
    店舗名: string;
    JANコード: string;
    商品画像: string;
    緯度: string;
    経度: string;
  } | null>(null);

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('カメラへのアクセスが許可されていません');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
    }

/*
  const takePhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
*/

    if (!result.canceled) {
      const originalUri = result.assets[0].uri;

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

/*
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    const formData = new FormData();
    formData.append('image', {
      uri: manipResult.uri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);
*/

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
      console.log('🧾 janResult:', JSON.stringify(janResult, null, 2));

      const rakuten = janResult?.rakuten;
      const janCode = rakuten?.['キーワード'] ?? '';
      const searchResults = rakuten?.['検索結果'];
      const firstHit = Array.isArray(searchResults) && searchResults.length > 0 ? searchResults[0] : null;

      const productName = firstHit?.['商品名'] ?? '';
      const imageUrl = firstHit?.['商品画像'] ?? '';
      const price = firstHit?.['最安価格']?.toString() ?? '';

      console.log('✅ JANコード:', janCode);
      console.log('✅ 商品名:', productName);
      console.log('✅ 商品画像:', imageUrl);
      console.log('✅ 最安価格:', price);

      if (janCode || productName) {
        setJanInfo({
          jan: janCode,
          productName: productName,
          imageUrl: imageUrl,
        });
        setFinalProductName(productName);
        setFinalJanCode(janCode);
        setFinalImageUrl(imageUrl);
        setFinalPrice(price);
        setImageUri(null);  // ← 画像を非表示にする
        setStep(1);
      } else {
        console.log('❌ 商品情報が取得できませんでした → OCRへ');
        setStep(2);
      }



//      if (janResult) {
//        setJanResult(JSON.stringify(janResult, null, 2));

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
//      }

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
        if (recognition) {
//        if (recognition && (recognition['本体価格'] || recognition['商品名'])) {
          /* === ここから追加：OCRの値をステップ2用に保持 === */
          const ocrProductName = recognition['商品名'];
          const ocrPrice = recognition['本体価格'];
//          const ocrProductName = recognition['商品名'] ?? '';
//          const ocrPrice      = recognition['本体価格']?.toString() ?? '';

          // OCR情報を state に格納
          setOcrInfo({ productName: ocrProductName, price: ocrPrice });

          // まだ確定していない項目だけ補完
          if (!finalProductName && ocrProductName) {
            setFinalProductName(ocrProductName);
          }
          if (ocrPrice) {
            setFinalPrice(ocrPrice);
          }
//          if (!finalProductName) setFinalProductName(ocrProductName);
//          if (!finalPrice)       setFinalPrice(ocrPrice);

          // ステップ2へ進む
          setStep(2);
          /* === ここまで追加 === */

          // OCR結果あり デバッグ用に全文表示（任意）
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
        setLatitude(latitude);
        setLongitude(longitude);

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
          setShops(shopJson.shops);
          console.log('✅ setShops後のshops:', shopJson.shops);
          const formatted = shopJson.shops
            .map((s: any) => `・${s.name}（${s.category}）距離: ${s.distance_km}km`)
            .join('\n');
          setShopResult(formatted);
        } else {
          setShopResult('近隣に店舗は見つかりませんでした');
        }
        console.log('🏪取得したショップ一覧:', shops);
        //        setShopResult(prev => (prev ?? '') + '\n\n🏪近隣店舗:\n' + JSON.stringify(shopJson, null, 2));

      } catch (e: any) {
        console.error('位置情報取得・店舗検索失敗:', e.message);
        setShopResult('位置情報取得に失敗しました: ' + e.message);
      }


/*
      await fetch('http://192.168.3.12:8000/api/register-price', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          jan: finalJanCode,
          product_name: finalProductName,
          shop_name: selectedShopIndex !== null ? shops[selectedShopIndex].name : "不明な店舗",
          price: Number(finalPrice),
          lat: latitude,   // 直近 Location から保持しておく
          lon: longitude,
          image_url: finalImageUrl
        })
      });

      const res = await fetch('http://192.168.3.12:8000/api/price-ranking', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          jan: finalJanCode,
          product_name: finalProductName,
          lat: latitude,
          lon: longitude
        })
      });
      const rankJson = await res.json();
      setRanking(rankJson.ranking);   // ← useState で保持
      setStep(5);
*/


    } catch (error: any) {
      console.error('アップロード中に通信エラー:', error.message);
      setShopResult(`アップロード中に通信エラーが発生しました: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>アプリ名</Text>
      </View>

      {imageUri && (
        <>
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
          />
          <Text style={styles.confirmText}>この画像でよろしいですか？</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.okButton} onPress={sendToServer}>
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ngButton} onPress={sendToServer}>
              <Text style={styles.buttonText}>NG</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ここ ↓↓↓ をまるごと差し替える */}
      <ScrollView contentContainerStyle={styles.scrollContent}>


        {/* ====== Step 1 : バーコード結果 ====== */}
        {step === 1 && janInfo && (
          <View>
            <Text>📍 現在のステップ: {step}</Text>
            <Text style={styles.heading}>✅ バーコード結果 (Step1)</Text>

            {janInfo.imageUrl ? (
              <Image source={{ uri: janInfo.imageUrl }} style={{ width: 150, height: 150 }} />
            ) : (
              <Text>画像なし</Text>
            )}

            <Text>JANコード: {janInfo.jan || '(未取得)'}</Text>

            {/* 編集可能な商品名 */}
            <Text style={styles.inputLabel}>商品名（編集可）:</Text>
            <TextInput
              style={styles.input}
              value={finalProductName}
              onChangeText={setFinalProductName}
              placeholder="商品名を入力"
              keyboardType="default"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Button
                title="登録する"
                onPress={() => {
                  setStep(2); // ステップ2（OCR結果表示）へ進む
                }}
              />
              <Button
                title="登録しない"
                onPress={() => {
                  setFinalProductName('');
                  setFinalJanCode('');
                  setFinalImageUrl('');
                  setFinalPrice('');
                  setStep(2); // 次のステップへ
                }}
              />
            </View>
          </View>
        )}


        {/* ====== Step 2 : OCR結果 ====== */}
        {step === 2 && (
          <View>
            <Text>📍 現在のステップ: {step}</Text>
            <Text style={styles.heading}>🔍 OCR結果 (Step2)</Text>

            {/* 商品画像（ステップ1で取得済みなら表示） */}
            {finalImageUrl ? (
              <Image source={{ uri: finalImageUrl }} style={{ width: 150, height: 150 }} />
            ) : null}

            {/* 編集可能な商品名 */}
            <Text style={styles.inputLabel}>商品名（編集可）:</Text>
            <TextInput
              style={styles.input}
              value={finalProductName}
              onChangeText={setFinalProductName}
              placeholder="商品名を入力"
              keyboardType="default"
            />

            {/* 編集可能な本体価格 */}
            <Text style={styles.inputLabel}>本体価格（編集可）:</Text>
            <TextInput
              style={styles.input}
              value={finalPrice}
              onChangeText={setFinalPrice}
              placeholder="本体価格を入力"
              keyboardType="numeric"
            />

            {/* 登録／登録しない */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Button
                title="登録する"
                onPress={() => {
                  // 入力内容はすでに finalXXX 系に保持されている
                  setStep(3);
                }}
              />
              <Button
                title="登録しない"
                onPress={() => {
                  // 終了または初期化（任意）
                  setStep(0);
                  alert('登録を中止しました');
                }}
              />
            </View>
          </View>
        )}

        {/* ====== Step 3 : 近隣店舗一覧 ====== */}
        {step === 3 && (
          console.log('店舗情報：', shops ?? ""),
          <View>
            <Text>📍 現在のステップ: {step}</Text>
            <Text style={styles.heading}>✅ 店舗を選択 (Step3)</Text>

            {shops.length === 0 ? (
              <Text>📡 店舗情報を取得中です...</Text>
            ) : (
              <>
                {shops.map((shop, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.radioRow}
                    onPress={() => setSelectedShopIndex(index)}
                  >
                    <Text style={styles.radioCircle}>
                      {selectedShopIndex === index ? '◉' : '○'}
                    </Text>
                    <Text style={styles.radioLabel}>
                      {shop.name}（{shop.distance_km?.toFixed(2)} km）
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={{ marginTop: 20 }}>
                  <Button
                    title="次へ"
                    onPress={() => {
                      if (selectedShopIndex !== null) {
                        setStep(4);
                      } else {
                        alert('店舗を選択してください');
                      }
                    }}
                  />
                </View>
              </>
            )}
          </View>
        )}


        {/* ====== Step 4 : 最終確認 ====== */}
        {step === 4 && (
console.log('選択店舗番号0：', selectedShopIndex ?? ""),
console.log('選択店舗情報：', shops[0] ?? ""),
console.log('選択店舗緯度：', shops[0]?.coordinates ?? ""),
console.log('選択店舗の緯度（lat）：', shops[0]?.coordinates?.[1] ?? ""),
console.log('選択店舗の経度（lon）：', shops[0]?.coordinates?.[0] ?? ""),


          <View>
            <Text style={styles.heading}>✅ 登録内容の確認 (Step4)</Text>

            <Text style={styles.inputLabel}>🛒 商品名: {finalProductName}</Text>
            <Text style={styles.inputLabel}>📦 JANコード: {finalJanCode || '(なし)'}</Text>
            <Text style={styles.inputLabel}>💴 値札価格: {finalPrice || '(未取得)'}</Text>

            {finalImageUrl ? (
              <Image source={{ uri: finalImageUrl }} style={{ width: 150, height: 150, marginVertical: 10 }} />
            ) : null}

            {selectedShopIndex !== null && shops[selectedShopIndex] && (
              <Text style={styles.inputLabel}>🏪 店舗: {shops[selectedShopIndex].name}</Text>
            )}

            <View style={{ marginTop: 20 }}>
              <Button
                title="この内容で登録"
                onPress={async () => {
                  try {
                    const registerResp = await fetch('http://192.168.3.12:8000/api/register-price', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jan: finalJanCode,
                        product_name: finalProductName,
                        shop_name: selectedShopIndex !== null ? shops[selectedShopIndex].name : "不明な店舗",
                        price: Number(finalPrice),
                        lat: selectedShopIndex !== null ? shops[selectedShopIndex]?.coordinates?.[1] : "不明な緯度",
                        lon: selectedShopIndex !== null ? shops[selectedShopIndex]?.coordinates?.[0] : "不明な経度",
                        image_url: finalImageUrl
                      })
                    });

                    if (!registerResp.ok) {
                      const errorText = await registerResp.text();
                      console.error('登録APIエラー:', errorText);
                      alert('登録に失敗しました:\n' + errorText);
                      return;
                    }

                    const rankingResp = await fetch('http://192.168.3.12:8000/api/price-ranking', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jan: finalJanCode,
                        product_name: finalProductName,
                        lat: latitude,
                        lon: longitude
                      })
                    });
console.log('ランキング情報', rankingResp ?? "");
                    if (!rankingResp.ok) {
                      const errorText = await rankingResp.text();
                      console.error('ランキングAPIエラー:', errorText);
                      alert('ランキング取得に失敗しました:\n' + errorText);
                      return;
                    }

                    const rankJson = await rankingResp.json();
                    console.log('ランキング情報00', rankJson ?? "");
                    setRanking(rankJson.ranking || []);
                    console.log('ランキング情報01', rankJson ?? "");
                    setStep(5);

                  } catch (e: any) {
                    console.error('登録 / ランキング取得失敗:', e.message);
                    alert('登録に失敗しました: ' + e.message);
                  }
                }}
              />

            </View>
          </View>
        )}


        {step === 5 && ranking.length > 0 && (
          console.log('ランキング情報', ranking ?? ""),
          console.log('遷移パラメータ・keyword:', ranking[0]?.商品名 ?? ""),
          console.log('遷移パラメータ・現在地lat:', latitude?.toString() ?? ""),
          console.log('遷移パラメータ・現在地lon:', longitude?.toString() ?? ""),
          <View>
            <Text style={styles.heading}>🏆 価格ランキング (30km)</Text>

            {ranking.map((r, i) => (
              console.log('遷移パラメータ', r ?? ""),
              console.log('遷移パラメータ・店舗名：', r.店舗名 ?? ""),
              console.log('遷移パラメータ・緯度：', r.緯度 ?? ""),
              console.log('遷移パラメータ・経度：', r.経度 ?? ""),
              <View key={i} style={{ marginVertical: 6 }}>
                <Text
                  style={{ fontSize: 18, color: 'blue', textDecorationLine: 'underline' }}
                  onPress={() => {
                    router.push({
                      pathname: "/nearby-shops",
                      params: {
                        店舗名: r.店舗名,
                        店舗緯度: r.緯度.toString() ?? "",
                        店舗経度: r.経度.toString() ?? "",
                        現在地緯度: latitude?.toString() ?? "",
                        現在地経度: longitude?.toString() ?? "",
                      },
                    });
                  }}
                  >{i + 1}位 ¥{r.価格} {r.店舗名}
                </Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );


}

const styles = StyleSheet.create({

  result: {
    fontFamily: 'monospace',
    backgroundColor: '#f3f3f3',
    padding: 8,
    borderRadius: 6,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  radioLabel: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 12,
    color: '#FF6600',
  },
   inputLabel: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 10,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    width: '100%',
    backgroundColor: '#fffaf0e3',
  },
  radioCircle: {
    fontSize: 22,
    marginRight: 8,
    color: '#FF6600',
  },

  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#FFA500',
    height: 75,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
    previewImage: {
    width: '100%',
    aspectRatio: 1, // 正方形として仮設定（後述）
    resizeMode: 'contain',
    marginVertical: 10,
  },
  confirmText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    color: '#333',
  },
  okButton: {
    backgroundColor: '#4c63afff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '40%',
    alignItems: 'center',
  },
  ngButton: {
    backgroundColor: '#4c63afff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '40%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

});

