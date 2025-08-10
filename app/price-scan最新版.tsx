// app/price-scan.tsx

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';

export default function PriceScan() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);

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
      const uploadResp = await fetch('http://192.168.3.12:8000/upload', {
        method: 'POST',
        body: form,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadJson = await uploadResp.json();
      console.log('Upload Response:', uploadJson);

      // ✅ ここで即座にバーコード結果を表示（OCR未実行でも）
      if (uploadJson.result) {
        setOcrResult(JSON.stringify(uploadJson.result, null, 2));
        return;
      }

      if (!uploadJson.filename) {
        setOcrResult('アップロード失敗: ファイル名が返されませんでした');
        return;
      }


      // ② OCR実行リクエスト
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

        // 表示
        if (ocrJson && (ocrJson['本体価格'] || ocrJson['商品名'])) {
          // OCR結果あり（通常パターン）
          setOcrResult(JSON.stringify(ocrJson, null, 2));
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
      {ocrResult && (
        <View>
          <Text>OCR結果：</Text>
          <Text>{ocrResult}</Text>
        </View>
      )}
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
});
