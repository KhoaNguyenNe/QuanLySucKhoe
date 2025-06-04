import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";
import { getMyClients } from "../api";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LinkedClientsScreen({ navigation }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await getMyClients();
      setClients(res.data);
    } catch (err) {
      console.log(
        "Lỗi lấy danh sách user liên kết:",
        err?.response?.data || err
      );
      setClients([]);
      let msg = "Không thể lấy danh sách người dùng liên kết";
      if (err?.response?.data?.detail) msg += `: ${err.response.data.detail}`;
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() =>
        navigation.navigate("ClientStatisticsScreen", {
          userId: item.id,
          username: item.username,
        })
      }
    >
      <Icon
        name="account"
        size={32}
        color="#2d6cf5"
        style={{ marginRight: 16 }}
      />
      <View>
        <Text style={{ fontWeight: "bold", fontSize: 16 }}>
          {item.username}
        </Text>
        <Text style={{ color: "#888" }}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2d6cf5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerRow, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#2d6cf5" />
        </TouchableOpacity>
        <Text style={styles.header}>Người dùng liên kết</Text>
      </View>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={fetchClients}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 30 }}>
            Chưa có người dùng nào liên kết
          </Text>
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#222",
  },
  backBtn: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    elevation: 0,
  },
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
