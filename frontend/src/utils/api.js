import axios from "axios";

// Use .env when available, else default to local backend
const BASE = process.env.REACT_APP_API_URL || "http://localhost:3050";

export const api = axios.create({ baseURL: BASE });
