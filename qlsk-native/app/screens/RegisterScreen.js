import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Text } from "react-native-paper";

import Background from "../components/Background";
import Logo from "../components/Logo";
import Header from "../components/Header";
import Button from "../components/Button";
import TextInput from "../components/TextInput";
import BackButton from "../components/BackButton";
import { theme } from "../core/theme";
import { emailValidator } from "../helpers/emailValidator";
import { passwordValidator } from "../helpers/passwordValidator";
import { nameValidator } from "../helpers/nameValidator";
import { register } from "../api";

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState({ value: "", error: "" });
  const [email, setEmail] = useState({ value: "", error: "" });
  const [password, setPassword] = useState({ value: "", error: "" });
  const [rePassword, setRePassword] = useState({ value: "", error: "" });
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const onSignUpPressed = async () => {
    const usernameError = nameValidator(username.value);
    const emailError = emailValidator(email.value);
    const passwordError = passwordValidator(password.value);
    if (
      emailError ||
      passwordError ||
      usernameError ||
      rePassword.value !== password.value
    ) {
      setUsername({ ...username, error: usernameError });
      setEmail({ ...email, error: emailError });
      setPassword({ ...password, error: passwordError });
      if (rePassword.value !== password.value) {
        setRePassword({ ...rePassword, error: "Mật khẩu nhập lại không khớp" });
      }
      return;
    }

    try {
      setLoading(true);
      const response = await register(
        username.value,
        email.value,
        password.value,
        rePassword.value,
        role // Truyền role đã chọn
      );

      if (response.data) {
        Alert.alert("Thành công", "Đăng ký tài khoản thành công!", [
          {
            text: "Đăng nhập",
            onPress: () => navigation.replace("LoginScreen"),
          },
        ]);
      }
    } catch (error) {
      let errorMessage = "Đã có lỗi xảy ra";
      if (error.response) {
        if (error.response.data.username) {
          errorMessage = "Tên đăng nhập đã tồn tại";
        } else if (error.response.data.email) {
          errorMessage = "Email đã tồn tại";
        } else if (error.response.data.password) {
          errorMessage = "Mật khẩu không hợp lệ";
        }
      }
      console.log("Register error:", error);
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <BackButton goBack={navigation.goBack} />
      <Logo />
      <Header>Chào mừng.</Header>
      <TextInput
        label="Tên đăng nhập"
        returnKeyType="next"
        value={username.value}
        onChangeText={(text) => setUsername({ value: text, error: "" })}
        error={!!username.error}
        errorText={username.error}
      />
      <TextInput
        label="Email"
        returnKeyType="next"
        value={email.value}
        onChangeText={(text) => setEmail({ value: text, error: "" })}
        error={!!email.error}
        errorText={email.error}
        autoCapitalize="none"
        autoCompleteType="email"
        textContentType="emailAddress"
        keyboardType="email-address"
      />
      <TextInput
        label="Mật khẩu"
        returnKeyType="next"
        value={password.value}
        onChangeText={(text) => setPassword({ value: text, error: "" })}
        error={!!password.error}
        errorText={password.error}
        secureTextEntry
      />
      <TextInput
        label="Nhập lại mật khẩu"
        returnKeyType="done"
        value={rePassword.value}
        onChangeText={(text) => setRePassword({ value: text, error: "" })}
        error={!!rePassword.error}
        errorText={rePassword.error}
        secureTextEntry
      />
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={styles.radioOption}
          onPress={() => setRole("user")}
        >
          <View style={styles.radioCircle}>
            {role === "user" && <View style={styles.radioDot} />}
          </View>
          <Text style={styles.radioLabel}>Người dùng</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.radioOption}
          onPress={() => setRole("expert")}
        >
          <View style={styles.radioCircle}>
            {role === "expert" && <View style={styles.radioDot} />}
          </View>
          <Text style={styles.radioLabel}>Chuyên gia/HLV</Text>
        </TouchableOpacity>
      </View>
      <Button
        mode="contained"
        onPress={onSignUpPressed}
        style={{ marginTop: 24 }}
        loading={loading}
        disabled={loading}
      >
        Đăng ký
      </Button>
      <View style={styles.row}>
        <Text>Tôi đã có tài khoản!</Text>
      </View>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => navigation.replace("LoginScreen")}>
          <Text style={styles.link}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginTop: 4,
  },
  link: {
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  radioLabel: {
    fontSize: 16,
  },
});
