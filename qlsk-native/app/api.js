import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://192.168.1.83:8000/api/";

export const API_ENDPOINTS = {
  LOGIN: "auth/jwt/token/",
  REGISTER: "register/",
  PROFILE: "auth/profile/",
  PASSWORD_RESET: "auth/password/reset/",
  SEND_OTP: "auth/password/send-otp/",
  VERIFY_OTP: "auth/password/confirm-otp/",
};

// Các endpoint public không cần token
const publicEndpoints = [
  API_ENDPOINTS.LOGIN,
  API_ENDPOINTS.REGISTER,
  API_ENDPOINTS.SEND_OTP,
  API_ENDPOINTS.VERIFY_OTP,
];

const api = axios.create({
  baseURL: API_BASE,
});

// Interceptor thêm token cho các API cần xác thực
api.interceptors.request.use(
  async (config) => {
    if (!publicEndpoints.some((ep) => config.url.endsWith(ep))) {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor refresh token chỉ cho các API cần xác thực
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (publicEndpoints.some((ep) => originalRequest.url.endsWith(ep))) {
      return Promise.reject(error);
    }
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refreshToken = await AsyncStorage.getItem("refresh_token");
      if (!refreshToken) {
        await AsyncStorage.removeItem("access_token");
        await AsyncStorage.removeItem("refresh_token");
        return Promise.reject(error);
      }
      try {
        const response = await axios.post(
          `${API_BASE}auth/jwt/token/refresh/`,
          { refresh: refreshToken }
        );
        const { access } = response.data;
        await AsyncStorage.setItem("access_token", access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.removeItem("access_token");
        await AsyncStorage.removeItem("refresh_token");
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// API gửi OTP quên mật khẩu (public)
export const sendForgotPasswordOTP = (email) => {
  return api.post(API_ENDPOINTS.SEND_OTP, { email });
};

// API xác nhận OTP và đổi mật khẩu (public)
export const verifyForgotPasswordOTP = (email, otp, newPassword) => {
  return api.post(API_ENDPOINTS.VERIFY_OTP, {
    email,
    otp,
    new_password: newPassword,
  });
};

// Các API khác (cần xác thực)
export const register = (username, email, password, password2, role) => {
  return api.post(API_ENDPOINTS.REGISTER, {
    username,
    email,
    password,
    password2,
    role,
  });
};

export const login = (username, password) => {
  return api.post(API_ENDPOINTS.LOGIN, {
    username,
    password,
  });
};

export const getUserProfile = () => {
  return api.get(API_ENDPOINTS.PROFILE);
};

export const updateUserProfile = (data) => {
  return api.put(API_ENDPOINTS.PROFILE, data);
};

export const requestPasswordReset = (email) => {
  return api.post(API_ENDPOINTS.PASSWORD_RESET, { email });
};

export const getReminders = () => api.get("/reminders/");
export const createReminder = (data) => api.post("/reminders/", data);
export const deleteReminder = (id) => api.delete(`/reminders/${id}/`);
export const updateReminder = (id, data) => api.put(`/reminders/${id}/`, data);

export default api;
