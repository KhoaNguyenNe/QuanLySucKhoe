import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserProfile } from "../api";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function HomeScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] });
        return;
      }
      const response = await getUserProfile();
      setUserInfo(response.data);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lấy thông tin người dùng");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("access_token");
    await AsyncStorage.removeItem("refresh_token");
    navigation.reset({ index: 0, routes: [{ name: "StartScreen" }] });
  };

  const roleLabel =
    userInfo?.user?.role === "expert" ? "Chuyên gia/HLV" : "Người dùng";

  // Danh sách chức năng dạng card
  const features = [
    {
      icon: "account-heart",
      label: "Hồ sơ sức khỏe",
      color: "#1ccfcf",
      onPress: () => {
        navigation.navigate("ProfileScreen");
      },
    },
    {
      icon: "calendar-check",
      label: "Kế hoạch tập luyện",
      color: "#2db6f5",
      onPress: () => {},
    },
    {
      icon: "bell-ring",
      label: "Nhắc nhở",
      color: "#2d6cf5",
      onPress: () => {
        navigation.navigate("ReminderScreen");
      },
    },
    {
      icon: "notebook-edit",
      label: "Nhật ký sức khỏe",
      color: "#1ccfcf",
      onPress: () => {},
    },
    {
      icon: "chat-processing",
      label: "Chat với chuyên gia",
      color: "#2db6f5",
      onPress: () => {},
    },
    {
      icon: "chart-bar",
      label: "Thống kê & báo cáo",
      color: "#2d6cf5",
      onPress: () => {},
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.Box}>
          <View>
            <Text style={styles.name}>{userInfo?.user?.username || "..."}</Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Icon name="logout" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
      >
        {features.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.card, { backgroundColor: item.color }]}
            onPress={item.onPress}
            activeOpacity={0.85}
          >
            <Icon
              name={item.icon}
              size={36}
              color="#fff"
              style={{ marginRight: 16 }}
            />
            <Text style={styles.cardLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bottomNav}>
        <Icon name="home" size={28} color="#2d6cf5" />
        <Icon name="chat-processing" size={28} color="#b0b0b0" />
        <TouchableOpacity style={styles.plusBtn}>
          <Icon name="plus" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("JournalScreen")}>
          <Icon name="notebook-edit" size={28} color="#b0b0b0" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("ProfileScreen")}>
          <Icon name="cog" size={28} color="#b0b0b0" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf7fa", paddingTop: 30 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingTop: 36,
  },
  Box: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  name: { fontSize: 20, fontWeight: "bold", color: "#222" },
  role: { fontSize: 15, color: "#007AFF", marginTop: 2 },
  logoutBtn: {
    backgroundColor: "#FF3B30",
    padding: 10,
    borderRadius: 8,
  },
  cardList: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    marginBottom: 18,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  plusBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#2d6cf5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
    elevation: 4,
  },
});
