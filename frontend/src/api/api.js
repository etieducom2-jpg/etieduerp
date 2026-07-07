import axios from 'axios';

// Normalize the backend URL - ensure it has a protocol (https://)
// This prevents "404 Not Found" errors when the env var is set without a scheme
const normalizeUrl = (url) => {
  if (!url) return '';
  let u = String(url).trim().replace(/\/+$/, ''); // strip trailing slashes
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u;
};

const API_URL = normalizeUrl(process.env.REACT_APP_BACKEND_URL);
export const BACKEND_URL = API_URL;

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

export const wizbangAPI = {
  getAccount: () => api.get('/wizbang/account'),
  getDashboard: () => api.get('/wizbang/dashboard'),
  listTransactions: (type) => api.get('/wizbang/transactions', { params: type ? { type } : {} }),
  createTransaction: (data) => api.post('/wizbang/transactions', data),
  deleteTransaction: (id) => api.delete(`/wizbang/transactions/${id}`),
  // Clients
  listClients: () => api.get('/wizbang/clients'),
  createClient: (data) => api.post('/wizbang/clients', data),
  updateClient: (id, data) => api.put(`/wizbang/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/wizbang/clients/${id}`),
  // Credits
  listCredits: (status) => api.get('/wizbang/credits', { params: status ? { status } : {} }),
  createCredit: (data) => api.post('/wizbang/credits', data),
  repayCredit: (id, payload = {}) => api.post(`/wizbang/credits/${id}/repay`, null, { params: payload }),
  deleteCredit: (id) => api.delete(`/wizbang/credits/${id}`),
  // Invoices
  listInvoices: () => api.get('/wizbang/invoices'),
  getInvoice: (id) => api.get(`/wizbang/invoices/${id}`),
  createInvoice: (data) => api.post('/wizbang/invoices', data),
  updateInvoice: (id, data) => api.put(`/wizbang/invoices/${id}`, data),
  recordInvoicePayment: (id, data) => api.post(`/wizbang/invoices/${id}/record-payment`, data),
  deleteInvoice: (id) => api.delete(`/wizbang/invoices/${id}`),
  // Agreements
  listAgreements: () => api.get('/wizbang/agreements'),
  getAgreement: (id) => api.get(`/wizbang/agreements/${id}`),
  createAgreement: (data) => api.post('/wizbang/agreements', data),
  deleteAgreement: (id) => api.delete(`/wizbang/agreements/${id}`),
};

export const brandAPI = {
  // Clients (read-only mirror of Wizbang clients)
  listClients: () => api.get('/wizbang/brand/clients'),
  getClient: (id) => api.get(`/wizbang/brand/clients/${id}`),
  setProfiles: (id, profiles) => api.put(`/wizbang/brand/clients/${id}/profiles`, { profiles }),
  // Content Plans
  listPlans: (clientId) => api.get('/wizbang/brand/plans', { params: clientId ? { client_id: clientId } : {} }),
  getPlan: (id) => api.get(`/wizbang/brand/plans/${id}`),
  createPlan: (data) => api.post('/wizbang/brand/plans', data),
  updatePlan: (id, data) => api.put(`/wizbang/brand/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/wizbang/brand/plans/${id}`),
  sharePlan: (id) => api.post(`/wizbang/brand/plans/${id}/share`),
  // Reports
  listReports: (clientId) => api.get('/wizbang/brand/reports', { params: clientId ? { client_id: clientId } : {} }),
  getReport: (id) => api.get(`/wizbang/brand/reports/${id}`),
  createReport: (data) => api.post('/wizbang/brand/reports', data),
  deleteReport: (id) => api.delete(`/wizbang/brand/reports/${id}`),
};

// Public (no-auth) endpoints used by clients to view shared content plans.
// Uses axios directly with no Authorization header.
const PUBLIC_BASE = `${API_URL}/api`;
export const publicBrandAPI = {
  getPlan: (token) => axios.get(`${PUBLIC_BASE}/public/brand-plan/${token}`),
  respond: (token, payload) => axios.post(`${PUBLIC_BASE}/public/brand-plan/${token}/respond`, payload),
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
  getTimeline: (id) => api.get(`/leads/${id}/timeline`),
  getBranchCounsellors: () => api.get('/branch/counsellors'),
  getBranchLeadOwners: () => api.get('/branch/lead-owners'),
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
  getCounsellorLeaderboard: (period = 'month', metric = 'admissions') =>
    api.get(`/analytics/counsellor-leaderboard?period=${period}&metric=${metric}`),
  universalSearchLeads: (q, limit = 20) =>
    api.get(`/leads-search/universal?q=${encodeURIComponent(q)}&limit=${limit}`),
  getLeadsKanban: (counsellor_id) =>
    api.get(`/leads-kanban/board${counsellor_id ? `?counsellor_id=${counsellor_id}` : ''}`),
  transitionLeadStage: (lead_id, target_stage, fields = {}, note = '') =>
    api.post(`/leads/${lead_id}/transition`, { target_stage, fields, note }),
  getLeadTimeline: (lead_id) => api.get(`/leads/${lead_id}/timeline`),
  getLeadById: (lead_id) => api.get(`/leads/${lead_id}`),
  getLeadSuggestions: (lead_id) => api.get(`/leads/${lead_id}/suggestions`),
  listLostLeads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/leads-search/lost${qs ? `?${qs}` : ''}`);
  },
  reengageLostLead: (lead_id, { reason = '', assign_to = null, target_stage = 'New' } = {}) =>
    api.post(`/leads/${lead_id}/reengage`, { reason, assign_to, target_stage }),
  getSessionComparison: () => api.get('/analytics/session-comparison'),
};

export const whatsappAPI = {
  getSettings: () => api.get('/admin/whatsapp-settings'),
  updateSettings: (data) => api.put('/admin/whatsapp-settings', data),
  sendTestMessage: ({ event_type = 'enquiry_saved' } = {}) =>
    api.post('/admin/whatsapp-test', null, { params: { event_type } }),
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

export const lostLeadsAPI = {
  getAll: () => api.get('/leads/lost'),
  restore: (leadId, newStatus = 'New') =>
    api.put(`/leads/${leadId}/restore-from-lost`, null, { params: { new_status: newStatus } }),
};

export const branchAdminAPI = {
  getDemosToday: () => api.get('/branch-admin/demos-today'),
  getTrainerHeatmap: () => api.get('/branch-admin/trainer-heatmap'),
  getStudentFeedback: (onlyUnread = false) =>
    api.get('/branch-admin/student-feedback', { params: { only_unread: onlyUnread } }),
  markFeedbackRead: (id) => api.put(`/branch-admin/student-feedback/${id}/read`),
};

export const studentAuthAPI = {
  login: (enrollment_number, password) =>
    axios.post(`${API_URL}/api/student-auth/login`, { enrollment_number, password }),
};

// Separate axios instance for student API calls — uses student_token + redirects to /student/login on 401
const studentApi = axios.create({ baseURL: `${API_URL}/api` });
studentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('student_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
studentApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('student_token');
      localStorage.removeItem('student');
      if (!window.location.pathname.startsWith('/student/login')) {
        window.location.href = '/student/login';
      }
    }
    return Promise.reject(err);
  }
);

export const studentAPI = {
  me: () => studentApi.get('/student/me'),
  myCurricula: () => studentApi.get('/student/my-curricula'),
  markTopic: (data) => studentApi.post('/student/topic-progress', data),
  submitFeedback: (data) => studentApi.post('/student/feedback', data),
};

export const studentsAPI = {
  getAll: () => api.get('/students'),
  getDetails: (id) => api.get(`/students/${id}`),
  cancelEnrollment: (id, reason) => api.put(`/students/${id}/cancel`, null, { params: { reason } }),
  updateStatus: (id, status, reason) => api.put(`/students/${id}/status`, null, { params: { status, reason } }),
  updateDetails: (id, data) => api.put(`/students/${id}/update`, data),
  permanentDelete: (id, reason = '') => api.delete(`/students/${id}/permanent`, { params: { reason } }),
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
  delete: (id) =>
    api.delete(`/certificate-requests/${id}`).catch((err) => {
      // Some CDNs/proxies strip DELETE — fall back to POST alias
      if (err.response?.status === 405 || err.response?.status === 501) {
        return api.post(`/certificate-requests/${id}/delete`);
      }
      throw err;
    }),
  download: (id) => api.post(`/certificate-requests/${id}/download`),
  markPrinted: (id) => api.post(`/certificate-requests/${id}/mark-printed`),
  handOver: (id) => api.post(`/certificate-requests/${id}/hand-over`),
  createManual: (data) => api.post(`/certificate-requests/manual`, data),
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

// Placement Manager API
export const placementAPI = {
  stats: () => api.get('/placement/dashboard-stats'),
  listStudents: (params = {}) => api.get('/placement/students', { params }),
  studentDetail: (id) => api.get(`/placement/students/${id}`),
  generateResume: (data) => api.post('/placement/resume/generate', data),
  createInterview: (data) => api.post('/placement/interview', data),
  listInterviews: (params = {}) => api.get('/placement/interviews', { params }),
  updateInterview: (id, data) => api.put(`/placement/interview/${id}`, data),
  addRemark: (data) => api.post('/placement/remark', data),
  markPlaced: (data) => api.post('/placement/mark-placed', data),
  listPlacements: () => api.get('/placement/placements'),
};

// Meta Ads Google Sheet sync API
export const metaSheetAPI = {
  // Legacy (single sheet) — kept for backwards compat
  setUrl: (branchId, url) => api.put(`/branches/${branchId}/meta-sheet`, { meta_ads_sheet_url: url }),
  syncNow: (branchId) => api.post(`/branches/${branchId}/meta-sheet/sync`),
  listBranches: () => api.get('/admin/branches'),
  // Multi-sheet
  list: (branchId) => api.get(`/branches/${branchId}/meta-sheets`),
  preview: (branchId, url) => api.post(`/branches/${branchId}/meta-sheets/preview`, { url }),
  add: (branchId, payload) => api.post(`/branches/${branchId}/meta-sheets`, payload),
  update: (branchId, sheetId, payload) => api.put(`/branches/${branchId}/meta-sheets/${sheetId}`, payload),
  remove: (branchId, sheetId) => api.delete(`/branches/${branchId}/meta-sheets/${sheetId}`),
  syncOne: (branchId, sheetId) => api.post(`/branches/${branchId}/meta-sheets/${sheetId}/sync`),
};

// Recent leads polling (for new-lead toast popup on Branch Admin / Counsellor dashboards)
export const recentLeadsAPI = {
  fetch: (since) => api.get('/leads/recent', { params: since ? { since } : {} }),
};

// Today's demos API
export const demosAPI = {
  today: () => api.get('/branch-admin/demos-today'),
};

// Streak Targets API — Super Admin
export const streakTargetsAPI = {
  list: () => api.get('/admin/streak-targets'),
  updateRole: (role, data) => api.put(`/admin/streak-targets/${encodeURIComponent(role)}`, data),
  listOverrides: () => api.get('/admin/users/streak-overrides'),
  setUserOverride: (userId, data) => api.put(`/admin/users/${userId}/streak-target`, data),
};

// Counsellor Notifications & Suggestions API (Phase E)
export const counsellorNotifAPI = {
  list: () => api.get('/counsellor/notifications'),
  markRead: (notificationId) => api.post(`/counsellor/notifications/${notificationId}/read`),
  markAllRead: () => api.post('/counsellor/notifications/mark-all-read'),
};

export const leadSuggestionsAPI = {
  forLead: (leadId) => api.get(`/leads/${leadId}/suggestions`),
};

export default api;
