// app/nearby-shops.tsx

/*
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";

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
              "User-Agent": "price-share-app/1.0 (https://example.com/contact)"
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
      // 店舗情報
      <View style={{ padding: 10, backgroundColor: "#fff", zIndex: 10 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>店舗名：{店舗名}</Text>
        <Text style={{ color: "#555" }}>住所：{住所}</Text>
      </View>

      // OSM マップ
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
//        provider={null as unknown as undefined} 
        initialRegion={{
          latitude: 現在地緯度 || 35.681236,
          longitude: 現在地経度 || 139.767125,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={() => {
          if (現在地緯度 && 店舗緯度) {
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
          }
        }}
      >
        // OSMタイルURL
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
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

      //  著作権表示（必須）
      <View style={styles.credit}>
        <Text style={{ fontSize: 12 }}>
          © OpenStreetMap contributors
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  credit: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 5,
    borderRadius: 5,
  },
});

*/


// app/OsmapLeafletMap.tsx

import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";

export default function NearbyShopsMap() {
  const params = useLocalSearchParams();

  // URLパラメータから取得。パースは安全のため念のため条件付きで。
  const 店舗名 = params.店舗名 ?? "店舗名不明";
  const 店舗緯度 = params.店舗緯度 ? parseFloat(params.店舗緯度 as string) : 35.681236; // 東京駅
  const 店舗経度 = params.店舗経度 ? parseFloat(params.店舗経度 as string) : 139.767125;
  const 現在地緯度 = params.現在地緯度 ? parseFloat(params.現在地緯度 as string) : 35.681236;
  const 現在地経度 = params.現在地経度 ? parseFloat(params.現在地経度 as string) : 139.767125;

  const [住所, set住所] = useState<string>("住所取得中...");

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${店舗緯度}&lon=${店舗経度}`,
          {
            headers: {
              "User-Agent": "price-share-app/1.0 (https://example.com/contact)",
            },
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

  // WebViewで表示するHTMLを動的に作成（座標・店舗名を埋め込み）
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Leaflet OSM Map</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css"
        crossorigin=""
      />
      <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
    </head>
    <body>
      <div id="map"></div>
      <script
        src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"
        crossorigin=""
      ></script>
      <script>
        const map = L.map('map').fitBounds([
          [${現在地緯度}, ${現在地経度}],
          [${店舗緯度}, ${店舗経度}]
        ]);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // 現在地マーカー
        L.marker([${現在地緯度}, ${現在地経度}])
          .addTo(map)
          .bindPopup('現在地')
          .openPopup();

        // 店舗マーカー
        L.marker([${店舗緯度}, ${店舗経度}])
          .addTo(map)
          .bindPopup('${店舗名}')
          .openPopup();
      </script>
    </body>
  </html>
  `;

  return (
    <View style={{ flex: 1 }}>
      {/* 店舗情報 */}
      <View style={{ padding: 10, backgroundColor: "#fff", zIndex: 10 }}>
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>店舗名：{店舗名}</Text>
        <Text style={{ color: "#555" }}>住所：{住所}</Text>
      </View>

      {/* WebView + Leaflet 地図表示 */}
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
    </View>
  );
}
