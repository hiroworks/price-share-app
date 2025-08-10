// app/nearby-shops.tsx

import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export default function NearbyShopsMap() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const 店舗名 = params.店舗名 as string;
  const 店舗緯度 = parseFloat(params.店舗緯度 as string);
  const 店舗経度 = parseFloat(params.店舗経度 as string);
  const 現在地緯度 = parseFloat(params.現在地緯度 as string);
  const 現在地経度 = parseFloat(params.現在地経度 as string);

  const [住所, set住所] = useState<string>("");

  console.log('nearby-shops・店舗名：', 店舗名 ?? "");
  console.log('nearby-shops・現在地緯度：', 現在地緯度 ?? "");
  console.log('nearby-shops・現在地経度：', 現在地経度 ?? "");
  console.log('nearby-shops・店舗緯度：', 店舗緯度 ?? "");
  console.log('nearby-shops・店舗経度：', 店舗経度 ?? "");

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${店舗緯度}&lon=${店舗経度}`,
          {
            headers: {
              "User-Agent": "my_geocoder"
            }
          }
        );
        const json = await res.json();
        set住所(json.display_name || "住所不明");
      } catch (err) {
        console.error("住所取得エラー:", err);
        set住所("住所取得に失敗");
      }
    };

    fetchAddress();
  }, [店舗緯度, 店舗経度]);


  return (
    <View style={{ flex: 1 }}>
      {/* 🔼 地図の上に店舗情報を表示 */}
      <View style={{ padding: 10, backgroundColor: "#fff", zIndex: 10 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>店舗名：{店舗名}</Text>
        <Text style={{ color: "#555" }}>住所：{住所}</Text>
      </View>

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        onMapReady={() => {
          mapRef.current?.fitToCoordinates(
            [
              { latitude: 現在地緯度, longitude: 現在地経度 },
              { latitude: 店舗緯度, longitude: 店舗経度 },
            ],
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            }
          );
        }}
      >
        <Marker
          coordinate={{ latitude: 現在地緯度, longitude: 現在地経度 }}
          title="現在地"
          pinColor="blue"
        />
        <Marker
          coordinate={{ latitude: 店舗緯度, longitude: 店舗経度 }}
          title={店舗名}
          pinColor="red"
        />
      </MapView>
    </View>
  );
}
