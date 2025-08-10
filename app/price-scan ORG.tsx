// app/price-scan.tsx
import { StyleSheet, Text, View } from 'react-native';

export default function PriceScan() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>商品情報</Text>
      <Text>商品名：ダミー商品</Text>
      <Text>価格：¥999</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
});
