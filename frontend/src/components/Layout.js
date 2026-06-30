import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, LogOut, Menu, X, Bell, FileText, Settings, Folder, CreditCard, Clock, Trash2, Wallet, FileSpreadsheet, GraduationCap, Globe, ClipboardList, CheckSquare, BookOpen, Award, Building2, UsersRound, Target, MessageSquare, Banknote, Brain, DollarSign, History, Facebook, Shield, Calendar, Ban, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { followupAPI, authAPI } from '@/api/api';
import NotificationCenter from './NotificationCenter';
import NotificationsBell from './NotificationsBell';
import NewLeadNotifier from './NewLeadNotifier';

const ETI_LOGO = 'https://customer-assets.emergentagent.com/job_4e0bdddc-c844-4374-a91a-dfbddecb14b1/artifacts/4ane8ulw_eti%20.png';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(localStorage.getItem('session') || '');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Role-based navigation flags
  const isSuperAdmin = user.role === 'Admin';
  const isBranchAdmin = user.role === 'Branch Admin';
  const isFDE = user.role === 'Front Desk Executive';
  const isCounsellor = user.role === 'Counsellor';
  const isCertManager = user.role === 'Certificate Manager';
  const isTrainer = user.role === 'Trainer';
  const isAcademicController = user.role === 'Academic Controller';
  const isWizbang = user.role === 'Wizbang';
  const isBrandManager = user.role === 'Wizbang Brand Manager';
  const isPlacementManager = user.role === 'Placement Manager';

  useEffect(() => {
    // Only Counsellors and Branch Admins need pending followup count
    if (isCounsellor || isBranchAdmin) {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  // Fetch available sessions for ALL users (not just Super Admin)
  // Header switcher shows both sessions for switching after login
  useEffect(() => {
    const allSessions = [
      { value: '2024', label: '2024-2025' },
      { value: '2025', label: '2025-2026' },
      { value: '2026', label: '2026-2027' }
    ];
    
    if (isSuperAdmin) {
      setSessions([
        { value: 'all', label: 'All Sessions' },
        ...allSessions
      ]);
    } else {
      setSessions(allSessions);
    }
  }, [isSuperAdmin]);

  const fetchPendingCount = async () => {
    try {
      const response = await followupAPI.getPendingCount();
      setPendingCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch pending count');
    }
  };

  const handleSessionChange = (value) => {
    localStorage.setItem('session', value);
    setCurrentSession(value);
    toast.success(`Switched to session: ${value === 'all' ? 'All Sessions' : `${value}-${parseInt(value) + 1}`}`);
    // Reload the page to refresh data with new session
    window.location.reload();
  };

  const getSessionLabel = () => {
    if (!currentSession) return '';
    if (currentSession === 'all') return 'All Sessions';
    return `${currentSession}-${parseInt(currentSession) + 1}`;
  };

  // Sidebar menu ordered as per user specification:
  // Dashboard, Leads, Enrollments, Students, All Payments, Pending Payments, 
  // International Exams, Manage Exams, Quiz Exams, Tasks, Analytics, Reports, Resources
  const navItems = isPlacementManager
    ? [
        { icon: LayoutDashboard, label: 'Placement Dashboard', path: '/placement', show: true },
        { icon: GraduationCap, label: 'Students', path: '/placement/students', show: true },
        { icon: Calendar, label: 'Interviews', path: '/placement/interviews', show: true },
        { icon: Award, label: 'Placed Students', path: '/placement/placed', show: true },
      ]
    : isBrandManager
    ? [
        { icon: LayoutDashboard, label: 'Brand Dashboard', path: '/wizbang/brand', show: true },
        { icon: ClipboardList, label: 'New Content Plan', path: '/wizbang/brand/plans/new', show: true },
        { icon: FileText, label: 'Monthly Reports', path: '/wizbang/brand/reports', show: true },
      ]
    : isWizbang
    ? [
        { icon: LayoutDashboard, label: 'Finance Dashboard', path: '/wizbang', show: true },
        { icon: TrendingUp, label: 'Income', path: '/wizbang/income', show: true },
        { icon: TrendingDown, label: 'Expenses', path: '/wizbang/expenses', show: true },
        { icon: UsersRound, label: 'Clients', path: '/wizbang/clients', show: true },
        { icon: Banknote, label: 'Credits', path: '/wizbang/credits', show: true },
        { icon: FileText, label: 'Invoices', path: '/wizbang/invoices', show: true },
        { icon: ClipboardList, label: 'Agreements', path: '/wizbang/agreements', show: true },
      ]
    : [
    // 1. Dashboard - NOT for Certificate Manager, Trainer, or Academic Controller
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', show: !isCertManager && !isTrainer && !isAcademicController },
    // 2. Leads - NOT for Certificate Manager, Trainer, or Academic Controller
    { icon: Users, label: 'Leads', path: '/leads', show: !isCertManager && !isTrainer && !isAcademicController },
    // 2.5 Lost Leads - For Admin, Branch Admin only (Counsellors don't have access)
    { icon: Ban, label: 'Lost Leads', path: '/lost-leads', show: isSuperAdmin || isBranchAdmin },
    // 3. Enrollments - For Branch Admin and FDE
    { icon: FileSpreadsheet, label: 'Enrollments', path: '/enrollments', show: isBranchAdmin || isFDE },
    // 4. Students - For Branch Admin and FDE
    { icon: GraduationCap, label: 'Students', path: '/students', show: isSuperAdmin || isBranchAdmin || isFDE },
    // 5. All Payments - For Branch Admin and FDE
    { icon: CreditCard, label: 'All Payments', path: '/all-payments', show: isBranchAdmin || isFDE },
    // 6. Pending Payments - For Branch Admin and FDE
    { icon: Clock, label: 'Pending Payments', path: '/pending-payments', show: isBranchAdmin || isFDE },
    // 7. International Exams - For Branch Admin, Counsellor and FDE
    { icon: Globe, label: 'International Exams', path: '/international-exams', show: isBranchAdmin || isCounsellor || isFDE },
    // 8. Quiz Exams - For Branch Admin, Trainer, Academic Controller
    // 9. Quiz Exams - For Academic Controller and FDE (to view)
    { icon: BookOpen, label: 'Quiz Exams', path: '/quiz-exams', show: isAcademicController || isFDE },
    // 10. Tasks - For Branch Admin, Counsellor, FDE and Trainer
    { icon: CheckSquare, label: 'Tasks', path: '/tasks', show: isBranchAdmin || isCounsellor || isFDE || isTrainer },
    // 11. Reports - Access controlled per role (Counsellor: leads, FDE: income/student/leads, Branch Admin: all)
    { icon: FileText, label: 'Reports', path: '/reports', show: isBranchAdmin || isCounsellor || isFDE },
    // 12. Resources - NOT for Certificate Manager, Trainer, or Academic Controller
    { icon: Folder, label: 'Resources', path: '/resources', show: !isCertManager && !isTrainer && !isAcademicController },
    // --- Additional items below the main navigation ---
    // Pending Follow-ups - For Counsellors only (Branch Admin sees it in Insights)
    { icon: Bell, label: 'Pending Follow-ups', path: '/followups', show: isCounsellor },
    // Student Feedback - For Counsellors only (Branch Admin sees it in Insights)
    { icon: MessageSquare, label: 'Student Feedback', path: '/student-feedback', show: isCounsellor },
    // Finances - For Branch Admin and FDE (combines Expenses & Cash Handling)
    { icon: Wallet, label: 'Finances', path: '/finances', show: isBranchAdmin || isFDE },
    // Insights - Consolidated AI Analytics for Branch Admin only (includes Follow-ups, Feedback, Campaigns, Activity Logs)
    { icon: Brain, label: 'Insights', path: '/insights', show: isBranchAdmin },
    // Audit Logs - For Super Admin only (Branch Admin sees it in Insights)
    { icon: History, label: 'Activity Logs', path: '/audit-logs', show: isSuperAdmin },
    // My Responsibilities - For all roles
    { icon: Shield, label: 'My Responsibilities', path: '/responsibilities', show: true },
    // Schools/Colleges Outreach - Only for Branch Admin and Super Admin
    { icon: Building2, label: 'Schools/Colleges', path: '/organizations', show: isBranchAdmin },
    // Batch Management - For Branch Admin, Super Admin, Front Desk, Counsellor
    { icon: UsersRound, label: 'Batches', path: '/batches', show: isBranchAdmin || isSuperAdmin || isFDE || isCounsellor },
    // Curriculum Management - For Academic Controller only (removed from Trainer)
    { icon: BookOpen, label: 'Curriculum', path: '/curriculum', show: isAcademicController },
    // Certificates - For Super Admin, Front Desk Executive (view & download approved)
    { icon: Award, label: 'Certificates', path: '/certificates', show: isSuperAdmin || isFDE },
    // Royalty Collection - For Super Admin only
    { icon: DollarSign, label: 'Royalty Collection', path: '/royalty-collection', show: isSuperAdmin },
    // Meta Settings - For Super Admin only
    { icon: Facebook, label: 'Meta Settings', path: '/meta-settings', show: isSuperAdmin },
    // Streak Targets - For Super Admin only
    { icon: Flame, label: 'Streak Targets', path: '/streak-targets', show: isSuperAdmin },
    // Attendance Insights - HR view for Branch Admin & Super Admin (trainer attendance compliance)
    { icon: ClipboardList, label: 'Attendance (HR)', path: '/attendance-insights', show: isSuperAdmin || isBranchAdmin },
    // Demos Today - For Branch Admin & Counsellor (live schedule for the day)
    { icon: Calendar, label: "Today's Demos", path: '/demos-today', show: isBranchAdmin || isCounsellor },
    // Branch Settings (Meta Ads Sheet URL) - For Branch Admin only
    { icon: Facebook, label: 'Ads Lead Sheet', path: '/branch-meta-sheet', show: isBranchAdmin },
    // Admin Panel - For Super Admin and Branch Admin (Branch Admin only sees limited tabs)
    { icon: Settings, label: 'Admin Panel', path: '/admin', show: isSuperAdmin || isBranchAdmin },
    // Wizbang (Finance) — visible to Super Admin for monitoring
    { icon: Wallet, label: 'Finance (Wizbang)', path: '/wizbang', show: isSuperAdmin },
    // Certificate Manager sees only these two tabs
    { icon: FileText, label: 'Certificate Requests', path: '/certificates', show: isCertManager },
    { icon: Award, label: 'Ready Certificates', path: '/certificates?status=Ready', show: isCertManager },
    // Trainer Dashboard - For Trainers only
    { icon: GraduationCap, label: 'My Dashboard', path: '/trainer', show: isTrainer },
  ].filter(item => item.show);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="glassmorphism sticky top-0 z-50 h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
            data-testid="menu-toggle"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <img src={ETI_LOGO} alt="ETI Educom" className="h-10 object-contain" />
          <span className="text-lg font-semibold text-slate-700 hidden md:block">Branch Management System</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Session Switcher - Available for ALL users */}
          <Select value={currentSession} onValueChange={handleSessionChange}>
            <SelectTrigger className="w-[140px] h-9 text-xs" data-testid="session-switcher">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.value} value={session.value}>
                  {session.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NotificationCenter />
          {user.role === 'Counsellor' && <NotificationsBell />}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-slate-600">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            data-testid="logout-button"
            className="hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="p-4 space-y-2" data-testid="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <Badge className="bg-red-500 text-white">{item.badge}</Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Real-time new-lead toast popups (active for Branch Admin & Counsellor) */}
      <NewLeadNotifier />
    </div>
  );
};

export default Layout;
