import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.100.186:8000/api";

// Tạo instance axios với cấu hình mặc định
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Thêm interceptor để tự động thêm token vào header
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API cho bài tập
export const getExercises = () => api.get("/exercises/");
export const getExercise = (id) => api.get(`/exercises/${id}/`);
export const createExercise = (data) => {
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };
  return api.post("/exercises/", data, config);
};
export const updateExercise = (id, data) => {
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };
  return api.put(`/exercises/${id}/`, data, config);
};
export const deleteExercise = (id) => api.delete(`/exercises/${id}/`);

// API cho lịch tập
export const getTrainingSchedules = () => api.get("/training-schedules/");
export const createTrainingSchedule = (data) =>
  api.post("/training-schedules/", data);
export const getTrainingSchedule = (id) =>
  api.get(`/training-schedules/${id}/`);

// API cho buổi tập
export const getTrainingSessions = () => api.get("/training-sessions/");
export const createTrainingSession = (data) => {
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };
  return api.post("/training-sessions/", data, config);
};
export const getTrainingSession = (id) => api.get(`/training-sessions/${id}/`);
export const updateTrainingSession = (id, data) => {
  const config = {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };
  return api.put(`/training-sessions/${id}/`, data, config);
};
export const addFeedback = (id, feedback) =>
  api.post(`/training-sessions/${id}/add_feedback/`, { feedback });

// API cho nhắc nhở
export const getReminders = () => api.get("/reminders/");
export const createReminder = (data) => api.post("/reminders/", data);
export const getReminder = (id) => api.get(`/reminders/${id}/`);
export const updateReminder = (id, data) => api.put(`/reminders/${id}/`, data);
export const deleteReminder = (id) => api.delete(`/reminders/${id}/`);

// API cho nhật ký sức khỏe
export const getHealthJournals = () => api.get("/health-journals/");
export const createHealthJournal = (data) =>
  api.post("/health-journals/", data);

export default api;
