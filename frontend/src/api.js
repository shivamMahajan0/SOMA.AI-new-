import axios from 'axios';

// Use a relative base so this works in both:
//   • Dev: Vite proxy forwards /api → http://localhost:8000/api
//   • Production: same-origin FastAPI serves both frontend & API
const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
});

// Automatically set Content-Type: FormData requests get multipart boundary
// from browser; everything else gets application/json.
api.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        // Let the browser set the correct multipart/form-data boundary
        delete config.headers['Content-Type'];
    } else {
        config.headers['Content-Type'] = 'application/json';
    }
    return config;
});

// Projects
export const createProject = (formData) => api.post('/projects', formData);
export const listProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const updateTarget = (id, target) => {
    const fd = new FormData();
    fd.append('target_column', target);
    return api.put(`/projects/${id}/target`, fd);
};

// Training (supports custom mode)
export const startTraining = (id, trainConfig = null) => {
    if (trainConfig && trainConfig.custom_mode) {
        return api.post(`/projects/${id}/train`, trainConfig);
    }
    return api.post(`/projects/${id}/train`, {});
};
export const getResults = (id) => api.get(`/projects/${id}/results`);
export const getStatus = (id) => api.get(`/projects/${id}/status`);

// Prediction
export const getSchema = (id) => api.get(`/projects/${id}/schema`);
export const predict = (id, features) => api.post(`/projects/${id}/predict`, { features });

// Reports
export const downloadReport = (id) => api.get(`/projects/${id}/report/pdf`, { responseType: 'blob' });
export const downloadDataset = (id) => api.get(`/projects/${id}/export/dataset`, { responseType: 'blob' });
export const downloadModel = (id) => api.get(`/projects/${id}/export/model`, { responseType: 'blob' });
export const downloadCode = (id) => api.get(`/projects/${id}/export/code`, { responseType: 'blob' });

// Copilot
export const sendChat = (id, message) => api.post(`/projects/${id}/chat`, { message });
export const getChatHistory = (id) => api.get(`/projects/${id}/chat/history`);

// Drift
export const checkDrift = (id, formData) => api.post(`/projects/${id}/drift`, formData);

// Deploy
export const deployModel = (id) => api.post(`/projects/${id}/deploy`);
export const getApiDocs = (id) => api.get(`/projects/${id}/api-docs`);
export const getVersions = (id) => api.get(`/projects/${id}/versions`);

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getUserProfile = (userId) => api.get(`/auth/profile/${userId}`);
export const getUserStats = (userId) => api.get(`/auth/stats/${userId}`);
export const updateUserProfile = (userId, data) => api.put(`/auth/profile/${userId}`, data);
export const logActivity = (userId, action, description) =>
    api.post(`/auth/activity?user_id=${userId}&action=${action}&description=${encodeURIComponent(description)}`);

// Dataset Preview
export const getDataPreview = (id) => api.get(`/projects/${id}/preview`);

// Business Report
export const getBusinessReport = (id) => api.get(`/projects/${id}/business-report`);

// Documents (PDF)
export const uploadDocument = (formData) => api.post('/documents', formData);
export const listDocuments = () => api.get('/documents');
export const getDocument = (id) => api.get(`/documents/${id}`);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
export const chatWithDocument = (id, message) => api.post(`/documents/${id}/chat`, { message });
export const getDocumentChatHistory = (id) => api.get(`/documents/${id}/chat/history`);
export const getDocumentCharts = (id) => api.get(`/documents/${id}/charts`);

// PDF to Video
export const uploadPdfVideo = (formData) => api.post('/pdf-video/upload', formData);
export const getPdfVideoStatus = (id) => api.get(`/pdf-video/status/${id}`);

// AI Project Generator
export const generateProject = (prompt) => api.post('/project-generator/generate', { prompt });
export const downloadGeneratedProject = (id) => api.get(`/project-generator/download/${id}`, { responseType: 'blob' });

// Content Summarizer
export const processSummary = (formData) => api.post('/summarizer/process', formData);
export const getSummaries = (limit = 10, skip = 0) => api.get(`/summarizer/history?limit=${limit}&skip=${skip}`);
export const getSummary = (id) => api.get(`/summarizer/${id}`);

// Research Agent
export const startResearch = (formData) => api.post('/research/start', formData);
export const getResearchHistory = (limit = 10, skip = 0) => api.get(`/research/history?limit=${limit}&skip=${skip}`);
export const getResearchProject = (id) => api.get(`/research/${id}`);
export const chatWithResearch = (id, message) => api.post(`/research/${id}/chat`, { message });

export default api;
