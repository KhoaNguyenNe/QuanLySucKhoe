import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { useGoogleAuth, useFacebookAuth } from "../services/auth.service";

const SocialLoginButtons = () => {
  const { handleGoogleLogin } = useGoogleAuth();
  const { handleFacebookLogin } = useFacebookAuth();

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        icon="google"
        onPress={handleGoogleLogin}
        style={[styles.button, styles.googleButton]}
        labelStyle={styles.buttonLabel}
      >
        Đăng nhập bằng Google
      </Button>
      <Button
        mode="contained"
        icon="facebook"
        onPress={handleFacebookLogin}
        style={[styles.button, styles.facebookButton]}
        labelStyle={styles.buttonLabel}
      >
        Đăng nhập bằng Facebook
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  button: {
    marginVertical: 8,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    color: "white",
  },
  googleButton: {
    backgroundColor: "#DB4437",
  },
  facebookButton: {
    backgroundColor: "#4267B2",
  },
});

export default SocialLoginButtons;
