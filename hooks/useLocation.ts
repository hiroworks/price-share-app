// price-share-app/hooks/useLocation.ts
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

// 緯度・経度・住所・エラーを含むカスタムフック
export const useCurrentLocation = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('位置情報の取得が許可されていません');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });

        // 逆ジオコーディングで住所を取得
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (addresses.length > 0) {
          const { region, city, subregion, street, name } = addresses[0];
          const fullAddress = `${region ?? ''}${subregion ?? ''}${city ?? ''}${street ?? ''}${name ?? ''}`;
          setAddress(fullAddress);
        }
      } catch (e) {
        setError('位置情報の取得中にエラーが発生しました');
        console.error(e);
      }
    })();
  }, []);

  return { location, address, error };
};
