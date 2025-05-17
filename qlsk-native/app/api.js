import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://26.77.196.96:8000/api/";

const api = axios.create({
  baseURL: API_BASE,
});

// Thêm interceptor để tự động thêm token vào header
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Thêm interceptor để xử lý refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và chưa thử refresh token
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refresh_token");
        const response = await axios.post(
          `${API_BASE}auth/jwt/token/refresh/`,
          {
            refresh: refreshToken,
          }
        );

        const { access } = response.data;
        await AsyncStorage.setItem("access_token", access);

        // Thử lại request ban đầu với token mới
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Nếu refresh token cũng hết hạn, xóa token và chuyển về màn hình login
        await AsyncStorage.removeItem("access_token");
        await AsyncStorage.removeItem("refresh_token");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const register = (username, email, password, password2, role) => {
  return api.post(`register/`, {
    username,
    email,
    password,
    password2,
    role,
  });
};

export const login = (username, password) => {
  return api.post(`auth/jwt/token/`, {
    username,
    password,
  });
};

export const getUserProfile = () => {
  return api.get("auth/profile/");
};

export default api;
