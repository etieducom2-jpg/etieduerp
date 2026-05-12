import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const session = localStorage.getItem('session');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Add session to all requests (as query param or header)
  if (session) {
    config.headers['X-Academic-Session'] = session;
    // Also add to query params for GET requests
    if (config.method === 'get' || config.method === 'GET') {
      config.params = config.params || {};
      if (!config.params.session) {
        config.params.session = session;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', new URLSearchParams(credentials), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  getSessions: () => api.get('/auth/sessions'),
  getSessionStats: (year) => api.get(`/auth/session-stats/${year}`),
};

export const adminAPI = {
  createBranch: (data) => api.post('/admin/branches', data),
  getBranches: () => api.get('/admin/branches'),
  updateBranch: (id, data) => api.put(`/admin/branches/${id}`, data),
  deleteBranch: (id) => api.delete(`/admin/branches/${id}`),
  createProgram: (data) => api.post('/admin/programs', data),
  getPrograms: () => api.get('/programs'),
  updateProgram: (id, data) => api.put(`/admin/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/admin/programs/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  getUsers: () => api.get('/admin/users'),
  getBranchUsers: () => api.get('/branch/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  changeUserPassword: (id, data) => api.put(`/admin/users/${id}/password`, data),
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),
  resetSystem: () => api.post('/admin/reset-system'),
  // Session management
  getSessions: () => api.get('/admin/sessions'),
  createSession: (data) => api.post('/admin/sessions', data),
  deleteSession: (year) => api.delete(`/admin/sessions/${year}`),
  // Approval requests
  getApprovalRequests: () => api.get('/approval-requests'),
  approveRequest: (id) => api.post(`/approval-requests/${id}/approve`),
  rejectRequest: (id) => api.post(`/approval-requests/${id}/reject`),
};

export const leadsAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return api.get(`/leads?${params.toString()}`);
  },
  getOne: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id, reason = '') => api.delete(`/leads/${id}?reason=${encodeURIComponent(reason)}`),
  getFollowups: (id) => api.get(`/leads/${id}/followups`),
};

export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadFile: (formData) => {
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getBranchWise: () => api.get('/analytics/branch-wise'),
  getMonthlyFinancial: (year) => api.get(`/analytics/financial/monthly${year ? `?year=${year}` : ''}`),
  getMonthlyAdmissions: (year) => api.get(`/analytics/admissions/monthly${year ? `?year=${year}` : ''}`),
  getBranchWiseFinancial: () => api.get('/analytics/financial/branch-wise'),
  getSuperAdminDashboard: () => api.get('/analytics/super-admin-dashboard'),
  getAILeadsInsights: () => api.get('/analytics/ai-leads-insights'),
  getFDEDashboard: () => api.get('/analytics/fde-dashboard'),
  getFDEDashboardEnhanced: () => api.get('/analytics/fde-dashboard-enhanced'),
  getCounsellorDashboard: () => api.get('/analytics/counsellor-dashboard'),
  getCounsellorDashboardEnhanced: () => api.get('/analytics/counsellor-dashboard-enhanced'),
  getSessionComparison: () => api.get('/analytics/session-comparison'),
};

export const whatsappAPI = {
  getSettings: () => api.get('/admin/whatsapp-settings'),
  updateSettings: (data) => api.put('/admin/whatsapp-settings', data),
};

export const resourcesAPI = {
  getAll: () => api.get('/resources'),
  create: (data) => api.post('/admin/resources', data),
  delete: (id) => api.delete(`/admin/resources/${id}`),
};

export const reportsAPI = {
  generateLeadsReport: (filters = {}) => {
    const params = new URLSearchParams({ ...filters, format: 'csv' });
    return api.get(`/reports/leads?${params.toString()}`, {
      responseType: 'blob'
    });
  },
  generateReport: (filters = {}) => {
    const params = new URLSearchParams({ ...filters, format: 'csv' });
    return api.get(`/reports/generate?${params.toString()}`, {
      responseType: 'blob'
    });
  },
};

export const expenseAPI = {
  createCategory: (data) => api.post('/admin/expense-categories', data),
  deleteCategory: (id) => api.delete(`/admin/expense-categories/${id}`),
  getCategories: () => api.get('/expense-categories'),
  createExpense: (data) => api.post('/expenses', data),
  getExpenses: () => api.get('/expenses'),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
};

export const leadSourceAPI = {
  getAll: () => api.get('/lead-sources'),
  create: (data) => api.post('/admin/lead-sources', data),
  delete: (id) => api.delete(`/admin/lead-sources/${id}`),
};

export const enrollmentAPI = {
  getConvertedLeads: () => api.get('/leads/converted'),
  createEnrollment: (data) => api.post('/enrollments', data),
  getEnrollments: () => api.get('/enrollments'),
  getEnrollmentPayments: (id) => api.get(`/enrollments/${id}/payments`),
  getPaymentPlan: (id) => api.get(`/enrollments/${id}/payment-plan`),
};

export const paymentAPI = {
  createPaymentPlan: (data) => api.post('/payment-plans', data),
  createPayment: (data) => api.post('/payments', data),
  generateReceipt: (paymentId) => api.get(`/payments/${paymentId}/receipt`),
  getAllPayments: (params = {}) => api.get('/payments/all', { params }),
  getPendingPayments: (params = {}) => api.get('/payments/pending', { params }),
  deletePayment: (id) => api.delete(`/payments/${id}`),
  updatePayment: (id, data) => api.put(`/payments/${id}`, data),
};

export const deletedLeadsAPI = {
  getAll: () => api.get('/leads/deleted'),
  restore: (leadId) => api.put(`/leads/${leadId}/restore`),
};

export const studentsAPI = {
  getAll: () => api.get('/students'),
  getDetails: (id) => api.get(`/students/${id}`),
  cancelEnrollment: (id, reason) => api.put(`/students/${id}/cancel`, null, { params: { reason } }),
  updateStatus: (id, status, reason) => api.put(`/students/${id}/status`, null, { params: { status, reason } }),
  updateDetails: (id, data) => api.put(`/students/${id}/update`, data),
  addAddonCourse: (enrollmentId, data) => api.post(`/enrollments/${enrollmentId}/add-on-course`, data),
  getAddonCourses: (enrollmentId) => api.get(`/enrollments/${enrollmentId}/add-on-courses`),
  getBatches: (enrollmentId) => api.get(`/students/${enrollmentId}/batches`),
};

export const organizationsAPI = {
  getAll: () => api.get('/organizations'),
  getOne: (id) => api.get(`/organizations/${id}`),
  create: (data) => api.post('/organizations', data),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  delete: (id) => api.delete(`/organizations/${id}`),
  addFollowUp: (orgId, data) => api.post(`/organizations/${orgId}/followups`, data),
  getFollowUps: (orgId) => api.get(`/organizations/${orgId}/followups`),
};

export const batchAPI = {
  getAll: () => api.get('/batches'),
  create: (data) => api.post('/batches', data),
  update: (id, data) => api.put(`/batches/${id}`, data),
  delete: (id) => api.delete(`/batches/${id}`),
  getStudents: (batchId) => api.get(`/batches/${batchId}/students`),
  assignStudent: (batchId, data) => api.post(`/batches/${batchId}/assign-student`, data),
  removeStudent: (batchId, enrollmentId) => api.delete(`/batches/${batchId}/remove-student/${enrollmentId}`),
  getTrainers: () => api.get('/trainers'),
  getTrainerStats: () => api.get('/trainer-stats'),
};

// Trainer API
export const trainerAPI = {
  getDashboard: () => api.get('/trainer/dashboard'),
  getBatches: () => api.get('/trainer/batches'),
};

// Attendance API
export const attendanceAPI = {
  mark: (data) => api.post('/attendance', data),
  markBulk: (data) => api.post('/attendance/bulk', data),
  getBatch: (batchId, date) => api.get(`/attendance/${batchId}`, { params: { date } }),
  getStudent: (enrollmentId) => api.get(`/attendance/student/${enrollmentId}`),
  getMissedInsights: () => api.get('/attendance/insights/missed'),
};

// Curriculum API
export const curriculumAPI = {
  getAll: (programId) => api.get('/curricula', { params: { program_id: programId } }),
  get: (id) => api.get(`/curricula/${id}`),
  create: (data) => api.post('/curricula', data),
  update: (id, data) => api.put(`/curricula/${id}`, data),
  delete: (id) => api.delete(`/curricula/${id}`),
};

// Course Completion API
export const courseCompletionAPI = {
  mark: (data) => api.post('/course-completion', null, { params: data }),
  getAll: (batchId) => api.get('/course-completions', { params: { batch_id: batchId } }),
};

// Financial Stats API
export const financialStatsAPI = {
  get: () => api.get('/branch-admin/financial-stats'),
};

// Campaign Management API
export const campaignAPI = {
  getAll: () => api.get('/campaigns'),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
  getAnalytics: (id) => api.get(`/campaigns/${id}/analytics`),
};

// Student Feedback API
export const feedbackAPI = {
  getList: (month) => api.get(`/feedback/list${month ? `?month=${month}` : ''}`),
  getAll: (params = {}) => api.get('/feedback/all', { params }),
  submit: (data) => api.post('/feedback', data),
  getSummary: (month) => api.get(`/feedback/summary${month ? `?month=${month}` : ''}`),
  getMonths: () => api.get('/feedback/months'),
};

export const paymentPlanAPI = {
  edit: (planId, data) => api.put(`/payment-plans/${planId}/edit`, data),
  delete: (planId) => api.delete(`/payment-plans/${planId}`),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  send: (data) => api.post('/notifications', data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const followupAPI = {
  create: (data) => api.post('/followups', data),
  getPending: () => api.get('/followups/pending'),
  getPendingCount: () => api.get('/followups/pending/count'),
  updateStatus: (id, status) => api.put(`/followups/${id}/status`, null, { params: { status } }),
  getDueSoon: () => api.get('/followups/due-soon'),
  getOverdue: () => api.get('/followups/overdue'),
  logOutcome: (id, data) => api.post(`/followups/${id}/log`, data),
  getLogs: (id) => api.get(`/followups/${id}/logs`),
  getLeadTrail: (leadId) => api.get(`/leads/${leadId}/followup-trail`),
};

export const pushSubscriptionAPI = {
  getVapidKey: () => api.get('/push-subscriptions/vapid-public-key'),
  subscribe: (data) => api.post('/push-subscriptions', data),
  unsubscribe: () => api.delete('/push-subscriptions'),
};

export const webhookAPI = {
  getBranchWebhookInfo: (branchId) => api.get(`/admin/branches/${branchId}/webhook-info`),
  regenerateWebhookKey: (branchId) => api.post(`/admin/branches/${branchId}/regenerate-webhook-key`),
};

export const certificateAPI = {
  // Public endpoints (no auth)
  getEnrollmentInfo: (enrollmentNumber) => axios.get(`${API_URL}/api/public/enrollment/${enrollmentNumber}`),
  submitRequest: (data) => axios.post(`${API_URL}/api/public/certificate-requests`, data),
  verify: (verificationId) => axios.get(`${API_URL}/api/public/verify/${verificationId}`),
  // Authenticated endpoints
  getAll: (params) => api.get('/certificate-requests', { params }),
  getOne: (id) => api.get(`/certificate-requests/${id}`),
  update: (id, data) => api.put(`/certificate-requests/${id}`, data),
  approve: (id) => api.post(`/certificate-requests/${id}/approve`),
  reject: (id, reason) => api.post(`/certificate-requests/${id}/reject`, null, { params: { reason } }),
  download: (id) => api.post(`/certificate-requests/${id}/download`),
};

export const tasksAPI = {
  getAll: () => api.get('/tasks'),
  create: (data) => api.post('/tasks', data),
  updateStatus: (id, status) => api.put(`/tasks/${id}`, { status }),
};

export const examsAPI = {
  getTypes: () => api.get('/admin/exams'),
  createType: (data) => api.post('/admin/exams', data),
  deleteType: (id) => api.delete(`/admin/exams/${id}`),
  getBookings: () => api.get('/exam-bookings'),
  createBooking: (data) => api.post('/exam-bookings', data),
  updateBookingStatus: (id, status) => api.put(`/exam-bookings/${id}/status`, null, { params: { status } }),
  markRefundProcessed: (id) => api.put(`/exam-bookings/${id}/refund`),
  markIncentivePaid: (id) => api.put(`/exam-bookings/${id}/incentive-paid`),
};

// Counsellor Incentives API
export const incentivesAPI = {
  getCounsellorIncentives: () => api.get('/counsellor/incentives'),
  getBranchIncentiveStats: () => api.get('/branch-admin/incentive-stats'),
};

export const quizAPI = {
  // Admin endpoints
  getAll: () => api.get('/quiz-exams'),
  getDetails: (id) => api.get(`/quiz-exams/${id}`),
  create: (data) => api.post('/quiz-exams', data),
  update: (id, data) => api.put(`/quiz-exams/${id}`, data),
  delete: (id) => api.delete(`/quiz-exams/${id}`),
  getQRCode: (id) => api.get(`/quiz-exams/${id}/qr-code`),
  getAttempts: (examId) => api.get('/quiz-attempts', { params: examId ? { exam_id: examId } : {} }),
  importQuestions: (formData) => api.post('/quiz-exams/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadSampleXlsx: () => api.get('/quiz-exams/import/sample.xlsx', { responseType: 'arraybuffer' }),
  // Public endpoints (no auth required for students)
  getPublicQuiz: (id) => axios.get(`${API_URL}/api/public/quiz/${id}`),
  startAttempt: (id, data) => axios.post(`${API_URL}/api/public/quiz/${id}/start`, data),
  submitAttempt: (attemptId, data) => axios.post(`${API_URL}/api/public/quiz/attempt/${attemptId}/submit`, data),
};

// Notification API
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnread: () => api.get('/notifications/unread'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  getFollowupReminders: () => api.get('/notifications/followup-reminders'),
};

// AI Analytics API
export const aiAnalyticsAPI = {
  getBranchInsights: () => api.get('/analytics/ai-branch-insights'),
  getUserEfficiency: () => api.get('/analytics/user-efficiency'),
};

// Cash Handling API
export const cashHandlingAPI = {
  getToday: () => api.get('/cash-handling/today'),
  submit: (data) => {
    const params = new URLSearchParams();
    if (data.deposit_receipt_url) params.append('deposit_receipt_url', data.deposit_receipt_url);
    if (data.remarks) params.append('remarks', data.remarks);
    if (data.manual_total) params.append('manual_total', data.manual_total);
    return api.post(`/cash-handling/submit?${params.toString()}`);
  },
  getHistory: (params) => api.get('/cash-handling/history', { params }),
};

// Meta (Facebook/Instagram) Integration API
export const metaAPI = {
  // Super Admin - Config Management
  getConfig: (branchId) => api.get(`/meta/config/${branchId}`),
  getAllConfigs: () => api.get('/meta/configs'),
  createConfig: (data) => api.post('/meta/config', data),
  updateConfig: (branchId, data) => api.put(`/meta/config/${branchId}`, data),
  // Analytics & Leads
  getAnalytics: (branchId, days = 30) => api.get(`/meta/analytics/${branchId}`, { params: { days } }),
  getLeads: (params = {}) => api.get('/meta/leads', { params }),
  getCampaigns: (branchId) => api.get(`/meta/campaigns/${branchId}`),
  syncAds: (branchId) => api.post(`/meta/sync-ads/${branchId}`),
};

// Royalty Management API
export const royaltyAPI = {
  getBranchRoyalty: (branchId, month, year) => api.get(`/royalty/branch/${branchId}`, { params: { month, year } }),
  getAllRoyalty: (month, year) => api.get('/royalty/all', { params: { month, year } }),
  markPaid: (branchId, month, year) => api.post(`/royalty/mark-paid/${branchId}`, null, { params: { month, year } }),
};

// Audit Logs API
export const auditAPI = {
  getLogs: (params = {}) => api.get('/audit-logs', { params }),
  getSummary: (days = 7) => api.get('/audit-logs/summary', { params: { days } }),
};

// Responsibilities API
export const responsibilitiesAPI = {
  getMyResponsibilities: () => api.get('/responsibilities'),
  getAll: (params = {}) => api.get('/responsibilities/all', { params }),
  create: (data) => api.post('/responsibilities', data),
  update: (id, data) => api.put(`/responsibilities/${id}`, data),
  delete: (id) => api.delete(`/responsibilities/${id}`),
};

export default api;
