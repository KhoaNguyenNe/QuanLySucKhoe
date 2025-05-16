import axios from "axios";

const API_BASE = "http://26.77.196.96:8000/api/";

const api = axios.create({
  baseURL: API_BASE,
});

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
  return api.post(`auth/token/`, {
    username,
    password,
  });
};

export default api;
