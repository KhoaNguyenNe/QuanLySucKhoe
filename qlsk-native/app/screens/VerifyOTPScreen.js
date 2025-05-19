import React, { useState } from "react";
import Background from "../components/Background";
import Header from "../components/Header";
import TextInput from "../components/TextInput";
import Logo from "../components/Logo";
import Button from "../components/Button";
import { Alert } from "react-native";
import { verifyForgotPasswordOTP } from "../api";

export default function VerifyOTPScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOTP] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu nhập lại không khớp.");
      return;
    }
    try {
      setLoading(true);
      await verifyForgotPasswordOTP(email, otp, newPassword);
      Alert.alert("Thành công", "Đổi mật khẩu thành công!", [
        {
          text: "Đăng nhập",
          onPress: () => navigation.navigate("LoginScreen"),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.error || "OTP không hợp lệ hoặc đã hết hạn."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <Logo />
      <Header>Xác nhận OTP & Đổi mật khẩu</Header>
      <TextInput
        label="Mã OTP"
        value={otp}
        onChangeText={setOTP}
        keyboardType="numeric"
        autoCapitalize="none"
        style={{ marginBottom: 16 }}
      />
      <TextInput
        label="Mật khẩu mới"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        style={{ marginBottom: 16 }}
      />
      <TextInput
        label="Nhập lại mật khẩu mới"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={{ marginBottom: 16 }}
      />
      <Button
        mode="contained"
        onPress={handleConfirm}
        loading={loading}
        disabled={loading}
      >
        Xác nhận & Đổi mật khẩu
      </Button>
    </Background>
  );
}
