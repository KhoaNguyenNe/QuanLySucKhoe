import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserProfile } from "../api";

import Background from "../components/Background";
import Logo from "../components/Logo";
import Header from "../components/Header";
import Paragraph from "../components/Paragraph";
import Button from "../components/Button";

export default function HomeScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

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
      console.log(error);
      Alert.alert("Lỗi", "Không thể lấy thông tin người dùng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <Logo />
      <Header>Chào mừng 💫</Header>
      <Paragraph>Chúc mừng bạn đã đăng nhập thành công.</Paragraph>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : userInfo ? (
        <View style={styles.infoBox}>
          <Text style={styles.label}>
            Tên đăng nhập:{" "}
            <Text style={styles.value}>{userInfo.user.username}</Text>
          </Text>
          <Text style={styles.label}>
            Email: <Text style={styles.value}>{userInfo.user.email}</Text>
          </Text>
          <Text style={styles.label}>
            Vai trò: <Text style={styles.value}>{userInfo.user.role}</Text>
          </Text>
        </View>
      ) : null}
      <Button
        mode="outlined"
        onPress={async () => {
          await AsyncStorage.removeItem("access_token");
          await AsyncStorage.removeItem("refresh_token");
          navigation.reset({
            index: 0,
            routes: [{ name: "StartScreen" }],
          });
        }}
      >
        Đăng xuất
      </Button>
    </Background>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 8,
    padding: 16,
    alignSelf: "stretch",
  },
  label: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
    color: "#333",
  },
  value: {
    fontWeight: "normal",
    color: "#007AFF",
  },
});
