import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { makeRedirectUri } from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const API_URL = "http://192.168.1.237:8000/";
const GOOGLE_CLIENT_ID = Constants.expoConfig.extra.GOOGLE_CLIENT_ID;
const FACEBOOK_CLIENT_ID = Constants.expoConfig.extra.FACEBOOK_CLIENT_ID;

// Luôn dùng proxy để redirectUri đúng chuẩn Expo
const redirectUri = makeRedirectUri({ useProxy: true });

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    redirectUri,
  });

  const handleGoogleLogin = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === "success") {
        const { authentication } = result;
        const res = await axios.post(`${API_URL}/api/auth/google-login/`, {
          access_token: authentication.accessToken,
        });
        if (res.data.token) {
          await AsyncStorage.setItem("token", res.data.token);
          return res.data;
        }
      }
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };

  return { handleGoogleLogin };
};

export const useFacebookAuth = () => {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_CLIENT_ID,
    redirectUri,
  });

  const handleFacebookLogin = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === "success") {
        const { authentication } = result;
        const response = await axios.post(`${API_URL}/auth/facebook/`, {
          access_token: authentication.accessToken,
        });
        if (response.data.token) {
          await AsyncStorage.setItem("token", response.data.token);
          return response.data;
        }
      }
    } catch (error) {
      console.error("Facebook login error:", error);
      throw error;
    }
  };

  return { handleFacebookLogin };
};
