import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import LeadsPage from '@/pages/LeadsPage';
import LeadWorkspacePage from '@/pages/LeadWorkspacePage';
import LeadsPipelinePage from '@/pages/LeadsPipelinePage';
import LostLeadsPage from '@/pages/LostLeadsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import PendingFollowups from '@/pages/PendingFollowups';
import AdminPanel from '@/pages/AdminPanel';
import ReportsPage from '@/pages/ReportsPage';
import ExpensesPage from '@/pages/ExpensesPage';
import EnrollmentsPage from '@/pages/EnrollmentsPage';
import ResourcesPage from '@/pages/ResourcesPage';
import AllPaymentsPage from '@/pages/AllPaymentsPage';
import PendingPaymentsPage from '@/pages/PendingPaymentsPage';
import DeletedLeadsPage from '@/pages/DeletedLeadsPage';
import StudentsPage from '@/pages/StudentsPage';
import DroppedStudentsPage from '@/pages/DroppedStudentsPage';
import InternationalExamsPage from '@/pages/InternationalExamsPage';
import TasksPage from '@/pages/TasksPage';
import QuizExamsPage from '@/pages/QuizExamsPage';
import PublicExamPage from '@/pages/PublicExamPage';
import CertificateRequestPage from '@/pages/CertificateRequestPage';
import CertificateManagementPage from '@/pages/CertificateManagementPage';
import CertificateVerifyPage from '@/pages/CertificateVerifyPage';
import OrganizationsPage from '@/pages/OrganizationsPage';
import BatchManagementPage from '@/pages/BatchManagementPage';
import TrainerDashboard from '@/pages/TrainerDashboard';
import CurriculumPage from '@/pages/CurriculumPage';
import CampaignManagement from '@/pages/CampaignManagement';
import StudentFeedbackPage from '@/pages/StudentFeedbackPage';
import CashHandlingPage from '@/pages/CashHandlingPage';
import FinancesPage from '@/pages/FinancesPage';
import AIAnalyticsPage from '@/pages/AIAnalyticsPage';
import UserEfficiencyPage from '@/pages/UserEfficiencyPage';
import AttendanceInsightsPage from '@/pages/AttendanceInsightsPage';
import MetaSettingsPage from '@/pages/MetaSettingsPage';
import MetaAnalyticsPage from '@/pages/MetaAnalyticsPage';
import RoyaltyCollectionPage from '@/pages/RoyaltyCollectionPage';
import AuditLogsPage from '@/pages/AuditLogsPage';
import InsightsPage from '@/pages/InsightsPage';
import ResponsibilitiesPage from '@/pages/ResponsibilitiesPage';
import StreakTargetsPage from '@/pages/StreakTargetsPage';
import StudentLogin from '@/pages/StudentLogin';
import StudentDashboard from '@/pages/StudentDashboard';
import WizbangDashboard from '@/pages/WizbangDashboard';
import WizbangTransactionsPage from '@/pages/WizbangTransactionsPage';
import WizbangClients from '@/pages/WizbangClients';
import WizbangCredits from '@/pages/WizbangCredits';
import WizbangInvoices from '@/pages/WizbangInvoices';
import WizbangAgreements from '@/pages/WizbangAgreements';
import BrandManagerDashboard from '@/pages/BrandManagerDashboard';
import BrandClientDetail from '@/pages/BrandClientDetail';
import BrandPlanEditor from '@/pages/BrandPlanEditor';
import BrandReports from '@/pages/BrandReports';
import BrandReportNew from '@/pages/BrandReportNew';
import PublicBrandPlan from '@/pages/PublicBrandPlan';
import PlacementDashboard from '@/pages/PlacementDashboard';
import PlacementStudentsPage from '@/pages/PlacementStudentsPage';
import PlacementInterviewsPage from '@/pages/PlacementInterviewsPage';
import PlacedStudentsPage from '@/pages/PlacedStudentsPage';
import DemosTodayPage from '@/pages/DemosTodayPage';
import BranchMetaSheetPage from '@/pages/BranchMetaSheetPage';
import PublicInvoiceView from '@/pages/PublicInvoiceView';
import PublicAgreementView from '@/pages/PublicAgreementView';
import Layout from '@/components/Layout';
import ActivityTracker from '@/components/ActivityTracker';
import { Toaster } from '@/components/ui/sonner';

const PrivateRoute = ({ children, adminOnly = false, fdaOnly = false, branchAdminAllowed = false, certManagerAllowed = false, adminPanelAccess = false, trainerOnly = false, academicControllerOnly = false, branchAdminOnly = false, wizbangAllowed = false, placementAllowed = false, brandAllowed = false }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) return <Navigate to="/login" />;
  
  // Placement Manager routes - allow Placement Manager and Admin
  if (placementAllowed) {
    const allowedRoles = ['Placement Manager', 'Admin'];
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  }
  
  // Wizbang routes - allow Wizbang and Admin
  if (wizbangAllowed) {
    const allowedRoles = ['Wizbang', 'Admin'];
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  }

  // Brand Manager routes - allow Brand Manager, Wizbang Admin, and Admin
  if (brandAllowed) {
    const allowedRoles = ['Wizbang Brand Manager', 'Wizbang', 'Admin'];
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  }
  
  // Branch Admin only routes (e.g., AI Analytics, User Efficiency)
  if (branchAdminOnly && user.role !== 'Branch Admin' && user.role !== 'Admin') return <Navigate to="/" />;
  
  // Trainer-only routes
  if (trainerOnly && user.role !== 'Trainer') return <Navigate to="/" />;
  
  // Academic Controller only routes
  if (academicControllerOnly && user.role !== 'Academic Controller') return <Navigate to="/" />;
  
  // Admin-only routes (Super Admin only)
  if (adminOnly && user.role !== 'Admin') return <Navigate to="/" />;
  
  // Admin Panel access - Super Admin and Branch Admin
  if (adminPanelAccess) {
    const allowedRoles = ['Admin', 'Branch Admin'];
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  }
  
  // FDA routes - also allow Branch Admin
  if (fdaOnly) {
    const allowedRoles = ['Front Desk Executive', 'Admin', 'Branch Admin'];
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  }
  
  // Certificate Manager routes — Front Desk Executive and Certificate Manager can access (+ Admin)
  if (certManagerAllowed) {
    const allowedRoles = ['Certificate Manager', 'Admin', 'Front Desk Executive'];
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  }
  
  return children;
};

// Home redirect based on role
const HomeRedirect = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Wizbang goes to finance dashboard
  if (user.role === 'Wizbang') {
    return <Navigate to="/wizbang" replace />;
  }

  // Wizbang Brand Manager goes to brand dashboard
  if (user.role === 'Wizbang Brand Manager') {
    return <Navigate to="/wizbang/brand" replace />;
  }
  
  // Placement Manager goes to placement dashboard
  if (user.role === 'Placement Manager') {
    return <Navigate to="/placement" replace />;
  }
  
  // Certificate Manager goes directly to certificates page
  if (user.role === 'Certificate Manager') {
    return <Navigate to="/certificates" replace />;
  }
  
  // Trainer goes to their dedicated dashboard
  if (user.role === 'Trainer') {
    return <Navigate to="/trainer" replace />;
  }
  
  // Academic Controller goes to curriculum page
  if (user.role === 'Academic Controller') {
    return <Navigate to="/curriculum" replace />;
  }
  
  // Everyone else goes to Dashboard
  return <Layout><Dashboard /></Layout>;
};

function App() {
  return (
    <BrowserRouter>
      <div className="App noise-texture">
        <Toaster position="top-right" />
        <ActivityTracker />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <HomeRedirect />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout><Dashboard /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <PrivateRoute>
                <Layout><LeadsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/leads/pipeline"
            element={
              <PrivateRoute>
                <Layout><LeadsPipelinePage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/leads/lost"
            element={
              <PrivateRoute branchAdminOnly>
                <Layout><LostLeadsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/leads/:leadId"
            element={
              <PrivateRoute>
                <Layout><LeadWorkspacePage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Layout><AnalyticsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/followups"
            element={
              <PrivateRoute>
                <Layout><PendingFollowups /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <PrivateRoute>
                <Layout><TasksPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Layout><ReportsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/finances"
            element={
              <PrivateRoute fdaOnly>
                <Layout><FinancesPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/expenses"
            element={<Navigate to="/finances" replace />}
          />
          <Route
            path="/campaigns"
            element={
              <PrivateRoute branchAdminAllowed>
                <Layout><CampaignManagement /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/enrollments"
            element={
              <PrivateRoute fdaOnly>
                <Layout><EnrollmentsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/students"
            element={
              <PrivateRoute fdaOnly>
                <Layout><StudentsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/dropped-students"
            element={
              <PrivateRoute branchAdminOnly>
                <Layout><DroppedStudentsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/international-exams"
            element={
              <PrivateRoute>
                <Layout><InternationalExamsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/manage-exams"
            element={<Navigate to="/international-exams" replace />}
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute adminPanelAccess>
                <Layout><AdminPanel /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <PrivateRoute>
                <Layout><ResourcesPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/all-payments"
            element={
              <PrivateRoute fdaOnly>
                <Layout><AllPaymentsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/pending-payments"
            element={
              <PrivateRoute fdaOnly>
                <Layout><PendingPaymentsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/deleted-leads"
            element={
              <PrivateRoute fdaOnly>
                <Layout><DeletedLeadsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/lost-leads"
            element={
              <PrivateRoute branchAdminOnly>
                <Layout><LostLeadsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/quiz-exams"
            element={
              <PrivateRoute>
                <Layout><QuizExamsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <PrivateRoute certManagerAllowed>
                <CertificateManagementPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/organizations"
            element={
              <PrivateRoute>
                <Layout><OrganizationsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/batches"
            element={
              <PrivateRoute>
                <Layout><BatchManagementPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/trainer"
            element={
              <PrivateRoute trainerOnly>
                <Layout><TrainerDashboard /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/curriculum"
            element={
              <PrivateRoute academicControllerOnly>
                <Layout><CurriculumPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/student-feedback"
            element={
              <PrivateRoute>
                <Layout><StudentFeedbackPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/cash-handling"
            element={<Navigate to="/finances" replace />}
          />
          <Route
            path="/insights"
            element={
              <PrivateRoute branchAdminOnly>
                <Layout><InsightsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/ai-analytics"
            element={
              <PrivateRoute branchAdminOnly>
                <Layout><AIAnalyticsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/user-efficiency"
            element={
              <PrivateRoute branchAdminOnly>
                <Layout><UserEfficiencyPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/attendance-insights"
            element={
              <PrivateRoute branchAdminOnly>
                <Layout><AttendanceInsightsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/meta-settings"
            element={
              <PrivateRoute adminOnly>
                <Layout><MetaSettingsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/meta-analytics"
            element={
              <PrivateRoute branchAdminOnly>
                <Layout><MetaAnalyticsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/royalty-collection"
            element={
              <PrivateRoute adminOnly>
                <Layout><RoyaltyCollectionPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <PrivateRoute branchAdminAllowed>
                <Layout><AuditLogsPage /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/responsibilities"
            element={
              <PrivateRoute>
                <Layout><ResponsibilitiesPage /></Layout>
              </PrivateRoute>
            }
          />
          {/* Wizbang (Finance) routes */}
          <Route
            path="/wizbang"
            element={
              <PrivateRoute wizbangAllowed>
                <Layout><WizbangDashboard /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/wizbang/income"
            element={
              <PrivateRoute wizbangAllowed>
                <Layout><WizbangTransactionsPage type="income" /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/wizbang/expenses"
            element={
              <PrivateRoute wizbangAllowed>
                <Layout><WizbangTransactionsPage type="expense" /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/wizbang/clients"
            element={
              <PrivateRoute wizbangAllowed>
                <Layout><WizbangClients /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/wizbang/credits"
            element={
              <PrivateRoute wizbangAllowed>
                <Layout><WizbangCredits /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/wizbang/invoices"
            element={
              <PrivateRoute wizbangAllowed>
                <Layout><WizbangInvoices /></Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/wizbang/agreements"
            element={
              <PrivateRoute wizbangAllowed>
                <Layout><WizbangAgreements /></Layout>
              </PrivateRoute>
            }
          />
          {/* Wizbang Brand Manager routes */}
          <Route path="/wizbang/brand" element={
            <PrivateRoute brandAllowed><Layout><BrandManagerDashboard /></Layout></PrivateRoute>
          } />
          <Route path="/wizbang/brand/clients/:clientId" element={
            <PrivateRoute brandAllowed><Layout><BrandClientDetail /></Layout></PrivateRoute>
          } />
          <Route path="/wizbang/brand/plans/new" element={
            <PrivateRoute brandAllowed><Layout><BrandPlanEditor /></Layout></PrivateRoute>
          } />
          <Route path="/wizbang/brand/plans/:planId" element={
            <PrivateRoute brandAllowed><Layout><BrandPlanEditor /></Layout></PrivateRoute>
          } />
          <Route path="/wizbang/brand/reports" element={
            <PrivateRoute brandAllowed><Layout><BrandReports /></Layout></PrivateRoute>
          } />
          <Route path="/wizbang/brand/reports/new" element={
            <PrivateRoute brandAllowed><Layout><BrandReportNew /></Layout></PrivateRoute>
          } />
          {/* Placement Manager routes */}
          <Route path="/placement" element={
            <PrivateRoute placementAllowed><Layout><PlacementDashboard /></Layout></PrivateRoute>
          } />
          <Route path="/placement/students" element={
            <PrivateRoute placementAllowed><Layout><PlacementStudentsPage /></Layout></PrivateRoute>
          } />
          <Route path="/placement/interviews" element={
            <PrivateRoute placementAllowed><Layout><PlacementInterviewsPage /></Layout></PrivateRoute>
          } />
          <Route path="/placement/placed" element={
            <PrivateRoute placementAllowed><Layout><PlacedStudentsPage /></Layout></PrivateRoute>
          } />
          {/* Demos today (Branch Admin / Counsellor / Admin) */}
          <Route path="/demos-today" element={
            <PrivateRoute><Layout><DemosTodayPage /></Layout></PrivateRoute>
          } />
          {/* Streak Targets — Super Admin only */}
          <Route path="/streak-targets" element={
            <PrivateRoute><Layout><StreakTargetsPage /></Layout></PrivateRoute>
          } />
          {/* Branch Meta Ads Google Sheet settings */}
          <Route path="/branch-meta-sheet" element={
            <PrivateRoute><Layout><BranchMetaSheetPage /></Layout></PrivateRoute>
          } />
          {/* Public Wizbang share pages (no auth) */}
          <Route path="/i/:token" element={<PublicInvoiceView />} />
          <Route path="/a/:token" element={<PublicAgreementView />} />
          <Route path="/public/brand-plan/:token" element={<PublicBrandPlan />} />
          {/* Public routes - no auth required */}
          <Route path="/exam/:examId" element={<PublicExamPage />} />
          <Route path="/certificate-request" element={<CertificateRequestPage />} />
          <Route path="/verify/:verificationId" element={<CertificateVerifyPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
