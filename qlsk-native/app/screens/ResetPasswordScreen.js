import React, { useState } from "react";
import Background from "../components/Background";
import BackButton from "../components/BackButton";
import Logo from "../components/Logo";
import Header from "../components/Header";
import TextInput from "../components/TextInput";
import Button from "../components/Button";
import { emailValidator } from "../helpers/emailValidator";
import { Alert } from "react-native";
import { sendForgotPasswordOTP } from "../api";

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState({ value: "", error: "" });
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const emailError = emailValidator(email.value);
    if (emailError) {
      setEmail({ ...email, error: emailError });
      return;
    }
    try {
      setLoading(true);
      await sendForgotPasswordOTP(email.value);
      Alert.alert(
        "Thành công",
        "Mã OTP đã được gửi về email. Vui lòng kiểm tra email để lấy mã OTP.",
        [
          {
            text: "Nhập mã OTP",
            onPress: () =>
              navigation.navigate("VerifyOTPScreen", { email: email.value }),
          },
        ]
      );
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Lỗi",
        error.response?.data?.error || "Không thể gửi OTP. Vui lòng thử lại!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <BackButton goBack={navigation.goBack} />
      <Logo />
      <Header>Quên mật khẩu</Header>
      <TextInput
        label="Email"
        returnKeyType="done"
        value={email.value}
        onChangeText={(text) => setEmail({ value: text, error: "" })}
        error={!!email.error}
        errorText={email.error}
        autoCapitalize="none"
        autoCompleteType="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        description="Nhập email để nhận mã OTP đặt lại mật khẩu."
      />
      <Button
        mode="contained"
        onPress={handleSendOTP}
        style={{ marginTop: 16 }}
        loading={loading}
        disabled={loading}
      >
        Gửi mã OTP
      </Button>
    </Background>
  );
}
