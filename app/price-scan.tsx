// app/price-scan.tsx

import { BlurView } from 'expo-blur';
import {
  CameraView,
  type BarcodeScanningResult,
  type CameraCapturedPicture
} from 'expo-camera';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Button, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';


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

  // Camera の型を直接定義（公式型定義から抽出）
  type CameraHandle = {
    takePictureAsync: (options?: any) => Promise<CameraCapturedPicture>;
    pausePreview: () => void;
    resumePreview: () => void;
    // 必要なら他のメソッドも追加
  };

/*
  const [janResult, setJanResult] = useState<{
    jan?: string;
    productName?: string;
    imageUrl?: string;
  } | null>(null);
*/
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [priceMode, setPriceMode] = useState<'tax_excluded' | 'tax_included'>('tax_excluded');
  const cameraRef = useRef<CameraView | null>(null);
  const [showCamera, setShowCamera] = useState(true);
  /*
  useEffect(() => {
    // 起動時にカメラを起動
    takePhoto();
  }, []);
*/

type RankingItem = {
    商品名: string;
    価格: number;
    店舗名: string;
    商品画像: string;
    緯度: string;
    経度: string;
    距離_km: string;
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


const calcTaxIncludedPrice = (price: string | number, mode: 'tax_excluded' | 'tax_included'): number => {
  const num = parseFloat(price as string) || 0;
  if (mode === 'tax_excluded') {
    return Math.round(num * 1.1); // 税抜き → 税込み
  }
  return num; // 税込み表示
};


/*
const takePhoto = async () => {
  console.log('カメラ撮影開始');
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

    // 即アップロード（保存・確認なし）
    const manipResult = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 500 } }], // 横幅500pxに縮小（縦横比維持）
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // JPEGで圧縮
    );

    console.log('カメラ撮影成功');
    // 一時的にURIはstateに入れる（アップロードに使用）
//    setImageUri(manipResult.uri);
    await sendToServer(manipResult.uri); // ← 撮影直後にアップロード実行
  }
};
*/


  const sendToServer = async (uri: string) => {
    if (!uri) return; // URIが無ければ何もしない
    console.log('sendToServer');
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
      uri: uri,
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
        setShowCamera(false); // カメラ画面を非表示にする
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

/*
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

        // OCRレスポンス受信後の処理
        type OCRRecognition = {
          商品名?: string;
          本体価格?: string;
          [key: string]: any;
        };

        type OCRResponse = {
          recognition?: OCRRecognition;
          corrected_image_path?: string;
          extracted_image_path?: string;
        };

        let ocrJson: OCRResponse | null = null;

//        let ocrJson = null;

        try {
          ocrJson = JSON.parse(text);
          console.log('OCRレスポンスJSON:', ocrJson);
        } catch (jsonErr) {
          console.error('JSON解析エラー:', jsonErr);
          setOcrResult('OCRサーバーから不正なレスポンスを受信:\n' + text);
          return;
        }

        // 表示
        if (!ocrJson) {
          setOcrResult('OCRデータが空です。');
          return;
        }
        const recognition = ocrJson.recognition as OCRRecognition;
        if (recognition) {
//        if (recognition && (recognition['本体価格'] || recognition['商品名'])) {
          // === ここから追加：OCRの値をステップ2用に保持 ===
          const ocrProductName = recognition['商品名'];
          const ocrPrice = recognition['本体価格'];
//          const ocrProductName = recognition['商品名'] ?? '';
//          const ocrPrice      = recognition['本体価格']?.toString() ?? '';

          // OCR情報を state に格納
          setOcrInfo({
            productName: ocrProductName ?? '',
            price: ocrPrice ?? '',
          });

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
          // === ここまで追加 === 

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
*/

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


      // 価格ランキング情報取得
      try {
        //  冗長ではあるがエラー回避のために定義
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setShopResult('位置情報の使用が許可されていません');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

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
//        setStep(5);
      } catch (e: any) {
        console.error('価格ランキング情報取得失敗:', e.message);
        setShopResult('価格ランキング情報取得に失敗しました: ' + e.message);
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


  const onBarCodeScanned = async (scanningResult: BarcodeScanningResult) => {
    if (isProcessing) return;
    setIsProcessing(true);

    console.log('バーコード検出', scanningResult.data);

    if (cameraRef.current) {
      const photo: CameraCapturedPicture =
        await cameraRef.current.takePictureAsync({ quality: 0.8 });
      await sendToServer(photo.uri);
    }

    onScanComplete();
    setIsProcessing(false);
  };

  // スキャン完了時
  const onScanComplete = () => {
    console.log('スキャン完了');
    setShowCamera(false); // カメラ画面を非表示にする
    console.log('カメラ画面を非表示');
    setStep(1);           // ステップ1へ遷移
  };



  return (
    <View style={styles.container}>
      {/* 固定ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>アプリ名</Text>
      </View>

      {/* ====== バーコードスキャン画面 ====== */}
      {showCamera && (
        <CameraView
          ref={cameraRef}
          facing="back"
          onBarcodeScanned={onBarCodeScanned} // バーコード認識コールバック
          style={StyleSheet.absoluteFill} // 画面いっぱいに表示
        />
      )}

      <View style={styles.overlay}>
        <BlurView intensity={50} style={styles.topBottomOverlay} />
        <View style={styles.middleRow}>
          <BlurView intensity={50} style={styles.sideOverlay} />
          <View style={styles.guideBox}>
            {/* 中心線 */}
            <View style={styles.centerLine} />
          </View>
          <BlurView intensity={50} style={styles.sideOverlay} />
        </View>
        <BlurView intensity={50} style={styles.topBottomOverlay} />
      </View>

      {/* ここ ↓↓↓ をまるごと差し替える */}
      <ScrollView contentContainerStyle={styles.scrollContent}>


        {/* ====== Step 1 : バーコード結果 ====== */}
        {!showCamera && step === 1 && janInfo && (
          <View style={styles.stepCard}>
            {/* 上部：商品画像＋右側に「商品名」「JANコード」風ピル */}
            <View style={styles.row}>
              {janInfo.imageUrl ? (
                <Image source={{ uri: janInfo.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { alignItems:'center', justifyContent:'center' }]}>
                  <Text style={{ color:'#999' }}>画像なし</Text>
                </View>
              )}



              <View style={{ flex: 1 }}>

                {/* JANコード表示（読み取り値をそのまま） */}
                <View>
                  <Text style={styles.pillText}>
                    JANコード:{janInfo.jan || '(未取得)'}
                  </Text>
                </View>

                {/* 商品名（編集可）— ピル風 */}
                <View>
                  <Text style={styles.pillText}>
                    {finalProductName}
                  </Text>
                </View>

                {/* 商品名（編集可）— ピル風 */}
                <View>
                  <Text style={styles.pillText}>
                    レトルト商品
                  </Text>
                </View>

              </View>

            </View>

            {/* 大きな角丸のプライマリボタン */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => { setStep(2); }}
            >
              <Text style={styles.primaryButtonText}>商品を登録する</Text>
            </TouchableOpacity>

            {/* スキップ（セカンダリリンク風。挙動は元の「登録しない」と同じ） */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setFinalProductName('');
                setFinalJanCode('');
                setFinalImageUrl('');
                setFinalPrice('');
                setStep(2);
              }}
            >
              <Text style={styles.linkButtonText}>登録しない</Text>
            </TouchableOpacity>

            {/* みんなの価格セクション */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>価格ランキング</Text>

              {/* 並べ替えボタン（見た目だけ。既存ロジックは変更しない） */}
              <TouchableOpacity style={styles.outlineButton} activeOpacity={0.8}>
                <Text style={styles.outlineButtonText}>
                  近隣
                </Text>
              </TouchableOpacity>

              {/* ランキングカードリスト（クリックで既存のrouter.pushを使用） */}
              <View style={{ marginTop: 8 }}>
                {ranking.map((r, i) => (
                  <TouchableOpacity
                    key={`${r.店舗名}-${i}`}
                    style={styles.rankRow}
                    activeOpacity={0.8}
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
                  >
                    <Text style={styles.rankIndex}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankPrice}>¥ {r.価格}</Text>
                      <Text style={styles.rankShop}>{r.店舗名} ({r.距離_km}km)</Text>
                    </View>
                    <Text style={styles.rankArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}



        {/* ====== Step 2 : OCR結果 + 店舗選択 ====== */}
        {step === 2 && janInfo && (
          <View>
            <Text>📍 現在のステップ: {step}</Text>
            <Text style={styles.heading}>🔍 OCR結果 (Step2)</Text>


            {/* 上部：商品画像＋右側に「商品名」「JANコード」風ピル */}
            <View style={styles.row}>
              {janInfo.imageUrl ? (
                <Image source={{ uri: janInfo.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { alignItems:'center', justifyContent:'center' }]}>
                  <Text style={{ color:'#999' }}>画像なし</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>

                {/* JANコード表示（読み取り値をそのまま） */}
                <View>
                  <Text style={styles.pillText}>
                    JANコード:{janInfo.jan || '(未取得)'}
                  </Text>
                </View>

                {/* 商品名（編集可）— ピル風 */}
                <View>
                  <Text style={styles.pillText}>
                    レトルト商品
                  </Text>
                </View>

              </View>

            </View>


            {/* 商品名（編集可） */}
            <Text style={styles.inputLabel}>商品名:</Text>
            <TextInput
              style={styles.input}
              value={finalProductName}
              onChangeText={setFinalProductName}
              placeholder="商品名を入力"
              keyboardType="default"
            />

            {/* 本体価格 + 切替ボタン */}
            <Text style={styles.inputLabel}>本体価格:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={finalPrice}
                onChangeText={setFinalPrice}
                placeholder="本体価格を入力"
                keyboardType="numeric"
              />
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    priceMode === 'tax_excluded' && styles.switchBtnActive,
                  ]}
                  onPress={() => setPriceMode('tax_excluded')}
                >
                  <Text style={styles.switchBtnText}>税抜き</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.switchBtn,
                    priceMode === 'tax_included' && styles.switchBtnActive,
                  ]}
                  onPress={() => setPriceMode('tax_included')}
                >
                  <Text style={styles.switchBtnText}>税込み</Text>
                </TouchableOpacity>
                {/* 税込み価格表示 */}
                <Text style={{ marginTop: 6, fontSize: 16 }}>
                  税込: {calcTaxIncludedPrice(finalPrice, priceMode)} 円
                </Text>
              </View>
            </View>

            {/* 近隣店舗プルダウン */}
            <Text style={styles.inputLabel}>近隣店舗:</Text>
            <Dropdown
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 }}
              data={shops.map((shop, index) => ({
                label: `${shop.name}（${shop.distance_km?.toFixed(2)} km）`,
                value: index
              }))}
              labelField="label"
              valueField="value"
              placeholder="近隣店舗を選択"
              value={selectedShopIndex}
              onChange={(item: { label: string; value: number }) => setSelectedShopIndex(item.value)}
            />


            {/* 大きな角丸のプライマリボタン */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => { setStep(4); }}
            >
              <Text style={styles.primaryButtonText}>入力内容を確認する</Text>
            </TouchableOpacity>

            {/* スキップ（セカンダリリンク風。挙動は元の「登録しない」と同じ） */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setFinalProductName('');
                setFinalJanCode('');
                setFinalImageUrl('');
                setFinalPrice('');
                setStep(1);
              }}
            >
              <Text style={styles.linkButtonText}>前のページに戻る</Text>
            </TouchableOpacity>

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

console.log('JANコード：', finalJanCode ?? ""),
console.log('販売価格：', finalPrice ?? ""),
console.log('商品名：', finalProductName ?? ""),

          <View>
            <Text style={styles.heading}>✅ 登録内容の確認 (Step4)</Text>


            {/* 上部：商品画像＋右側に「商品名」「JANコード」風ピル */}
            {/* 画像＋右側の情報 */}
            <View style={styles.row}>
              {/* 左：画像 */}
              {finalImageUrl ? (
                <Image source={{ uri: finalImageUrl }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#999' }}>画像なし</Text>
                </View>
              )}

              {/* 右：JANコード、価格、種類 */}
              <View style={{ flex: 1 }}>
                <Text style={styles.pillText}>
                  JANコード: {finalJanCode || '(未取得)'}
                </Text>
                <Text style={styles.pillText}>
                  販売価格: {finalPrice || '(未取得)'}
                </Text>
                <Text style={styles.pillText}>
                  種類：レトルト商品
                </Text>
              </View>
            </View>

            {/* 下：商品名 */}
            <Text style={{ marginTop: 10 }}>🛒 商品名: {finalProductName}</Text>

            {/* 下：店舗名 */}
            {selectedShopIndex !== null && shops[selectedShopIndex] && (
              <Text style={styles.inputLabel}>🏪 店舗名: {shops[selectedShopIndex].name}</Text>
            )}


            <View style={{ marginTop: 20 }}>

              {/* 大きな角丸のプライマリボタン */}
              <TouchableOpacity
                style={styles.primaryButton}
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
              >
                <Text style={styles.primaryButtonText}>この内容で登録</Text>
              </TouchableOpacity>

              {/* スキップ（セカンダリリンク風。挙動は元の「登録しない」と同じ） */}
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
//                  setFinalProductName('');
//                  setFinalJanCode('');
//                  setFinalImageUrl('');
//                  setFinalPrice('');
                  setStep(2);
                }}
              >
                <Text style={styles.linkButtonText}>前のページに戻る</Text>
              </TouchableOpacity>

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

  container: { flex: 1, backgroundColor: '#ccc' },
  header: { height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFA500' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlayHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  guideBox: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'blue',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerLine: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 2,
    backgroundColor: 'yellow',
  },

  scrollContent: { padding: 16 },


  camera: { flex: 1 }, // 画面全体にカメラ映像を表示

  topBottomOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  middleRow: { flexDirection: 'row' },

  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },

  heading: {
    fontWeight: 'bold',
    fontSize: 18,
    marginVertical: 12,
    color: '#D86B5F',
  },

  /*
  container: {
    flex: 1,
    backgroundColor: '#F7F2EE', // 淡いベージュ系
  },
  header: {
    backgroundColor: 'transparent', // バーを無くし紙面風
    height: 100,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingBottom: 12,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#D86B5F', // コーラル
  },
  scrollContent: {
    padding: 16,
    alignItems: 'stretch', // 中央寄せ → 画面幅いっぱい
  },

    overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBottomOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  middleRow: { flexDirection: 'row', width: '100%', height: 150 },
  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  guideBox: {
    width: '70%',
    aspectRatio: 2, // 透明矩形縦横比
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: 'white',
  },
  */
  inputLabel: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 6,
    color: '#6B5E57',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E6DDD7',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },

  /* 追加スタイル -------------------- */

  // Stepの大枠カード
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 16,
  },

  row: { flexDirection: 'row', gap: 12 },

  productImage: {
    width: 92,
    height: 92,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    marginRight: 12,
  },

  // ピル型の入力（商品名）
  pillInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DDD7',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  pillText: {
    fontSize: 14,
    color: '#403A36',
  },

  // ピル型の表示（JANなど）
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DDD7',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pillLabel: {
    color: '#8A7D76',
    marginRight: 6,
    fontSize: 14,
  },
  pillValue: {
    color: '#403A36',
    fontSize: 16,
    fontWeight: '600',
  },

  // 大きい丸ボタン
  primaryButton: {
    backgroundColor: '#D86B5F',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // セカンダリ（リンク風）
  linkButton: { alignSelf: 'center', paddingVertical: 10 },
  linkButtonText: { color: '#C05B4C', fontSize: 14 },

  // セクション（みんなの価格）
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D86B5F',
    marginBottom: 8,
  },

  // 枠線だけのピルボタン
  outlineButton: {
    borderWidth: 1.5,
    borderColor: '#D8BFB5',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  outlineButtonText: {
    color: '#7D6F68',
    fontSize: 14,
    fontWeight: '600',
  },

  // ランキング行（カード化）
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFE6E0',
  },
  rankIndex: {
    width: 28,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#B36F5E',
    marginRight: 10,
  },
  rankPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2F2A27',
  },
  rankShop: {
    fontSize: 14,
    color: '#6B5E57',
    marginTop: 2,
  },
  rankArrow: {
    fontSize: 26,
    color: '#C5B8B2',
    marginLeft: 6,
  },
  guide: {
    width: 250,
    height: 150,
    borderColor: 'white',
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  redLine: {
    position: 'absolute',
    width: 250,
    height: 2,
    backgroundColor: 'red',
  },

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

  radioCircle: {
    fontSize: 22,
    marginRight: 8,
    color: '#FF6600',
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
  switchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  switchBtnActive: {
    backgroundColor: '#FF6600',
    borderColor: '#FF6600',
  },
  switchBtnText: {
    color: '#fff',
  },

});

