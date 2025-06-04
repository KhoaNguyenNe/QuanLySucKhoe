import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://192.168.1.128:8000/api/";

export const API_ENDPOINTS = {
  LOGIN: "auth/jwt/token/",
  REGISTER: "register/",
  PROFILE: "auth/profile/",
  PASSWORD_RESET: "auth/password/reset/",
  SEND_OTP: "auth/password/send-otp/",
  VERIFY_OTP: "auth/password/confirm-otp/",
  WATER_INTAKE: "health-metrics/water/",
  HEALTH_HISTORY: "health-metrics/history/",
  STEPS_HISTORY: "health-metrics/steps/",
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
  headers: {
    "Content-Type": "application/json",
  },
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

export const getExercises = () => api.get("/exercises/");

export const createExercise = (data) => {
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
      Accept: "application/json",
    },
    transformRequest: (data, headers) => {
      return data;
    },
  };
  return api.post("/exercises/", data, config);
};

export const updateExercise = (id, data) => {
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
      Accept: "application/json",
    },
    transformRequest: (data, headers) => {
      return data;
    },
  };
  return api.put(`/exercises/${id}/`, data, config);
};

export const deleteExercise = (id) => api.delete(`/exercises/${id}/`);

export const getWorkoutSessions = () => api.get("/workout-sessions/");
export const createWorkoutSession = (data) => {
  return api.post("/workout-sessions/", data);
};
export const getWorkoutSession = (id) => api.get(`/workout-sessions/${id}/`);

export const completeExercise = (sessionId, data) =>
  api.post(`/workout-sessions/${sessionId}/complete_exercise/`, data);
export const completeWorkout = (sessionId) =>
  api.post(`/workout-sessions/${sessionId}/complete_workout/`);

export const createHealthJournal = (data) => api.post("/journals/", data);

export const getHealthJournals = () => api.get("/journals/");

export const updateWaterIntake = (data) => {
  // Chuyển đổi ml sang lít
  const amountInLiters = parseFloat(data.amount) / 1000;
  return api.post(API_ENDPOINTS.WATER_INTAKE, { amount: amountInLiters });
};

export const getHealthHistory = () => {
  return api.get(API_ENDPOINTS.HEALTH_HISTORY);
};

export const saveStepsHistory = (data) => {
  return api.post(API_ENDPOINTS.STEPS_HISTORY, data);
};

// Lấy thống kê tập luyện (tổng hợp tuần/tháng/năm)
export const getUserStatistics = (userId) => {
  return api.get(`/users/${userId}/statistics/`);
};

// Lấy lịch sử sức khỏe 7 ngày gần nhất (bước đi, nước uống...)
export const getHealthMetricsHistory = () => {
  return api.get(API_ENDPOINTS.HEALTH_HISTORY);
};

// Lấy lịch sử tập luyện 7 ngày gần nhất (số buổi tập, calo)
export const getTrainingHistory = () => {
  return api.get("/training-history/");
};

// Lấy thống kê tập luyện đa chế độ (tuần/tháng/năm)
export const getTrainingStatistics = (mode = "week") => {
  return api.get(`/training-statistics/?mode=${mode}`);
};

export const getWaterSessions = () => api.get("/water-sessions/");
export const addWaterSession = (amount) =>
  api.post("/water-sessions/", { amount });

// Cập nhật BMI vào user
export const updateBMI = (bmi) => {
  return api.put(API_ENDPOINTS.PROFILE, { bmi });
};

// Chat APIs
export const sendMessage = async (messageData) => {
  return await api.post("/chat-messages/", messageData);
};

export const getChatHistory = async (userId, expertId) => {
  return await api.get(`/chat-history/${userId}/${expertId}/`);
};

export const markMessagesAsRead = async (messageIds) => {
  return await api.post("/chat-messages/mark_as_read/", {
    message_ids: messageIds,
  });
};

export default api;
