import { useEffect, useState } from 'react';

// 仮の店舗候補を返す例（本番ではGoogle Places APIなどに置き換え）
export const useNearbyStores = (latitude?: number, longitude?: number) => {
  const [stores, setStores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!latitude || !longitude) return;

    // 模擬的に現在地に基づく店舗名を作成（API未使用）
    try {
      const dummyStores = [
        'スーパーマーケットA',
        'ディスカウントB',
        '食料品C',
      ];
      setStores(dummyStores);
    } catch (e) {
      setError('店舗情報の取得に失敗しました');
    }
  }, [latitude, longitude]);

  return { stores, error };
};
