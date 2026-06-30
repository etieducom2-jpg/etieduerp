import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { wizbangAPI } from '@/api/api';
import { toast } from 'sonner';
import { Wallet, TrendingUp, TrendingDown, IndianRupee, Lock, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

const fmtINR = (n) =>
  '₹' +
  (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const StatCard = ({ icon: Icon, label, value, accent, testId, sub }) => (
  <Card
    className={`border-l-4 ${accent} shadow-sm hover:shadow-md transition-shadow`}
    data-testid={testId}
  >
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className="p-3 rounded-full bg-slate-100">
          <Icon className="w-6 h-6 text-slate-700" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const WizbangDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await wizbangAPI.getDashboard();
        setData(res.data);
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Failed to load Wizbang dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500" data-testid="wizbang-dashboard-loading">
        Loading Wizbang dashboard…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-rose-600" data-testid="wizbang-dashboard-error">
        Could not load dashboard. Please contact the Super Admin.
      </div>
    );
  }

  const { account, current_balance, outstanding_credit, totals, this_month, chart_12_months, recent_transactions, breakdown } = data;

  const opening = breakdown?.opening_balance ?? account?.opening_balance ?? 0;
  const regIn = breakdown?.regular_income ?? 0;
  const credIn = breakdown?.credit_repaid_in ?? 0;
  const regOut = breakdown?.regular_expense ?? 0;
  const credOut = breakdown?.credit_given_out ?? 0;

  return (
    <div className="space-y-6" data-testid="wizbang-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
        <p className="text-sm text-slate-500">Wizbang — global income &amp; expense ledger</p>
      </div>

      {/* Opening balance — locked */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white" data-testid="wizbang-opening-balance-card">
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300 flex items-center gap-2">
              <Lock className="w-3 h-3" /> Opening Bank Balance (Locked)
            </p>
            <p className="text-3xl font-bold mt-1" data-testid="wizbang-opening-balance">
              {fmtINR(account?.opening_balance)}
            </p>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{' '}
              Set on{' '}
              {account?.opening_balance_set_at
                ? new Date(account.opening_balance_set_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-300">Current Bank Balance</p>
            <p className="text-3xl font-bold mt-1" data-testid="wizbang-current-balance">
              {fmtINR(current_balance)}
            </p>
            <p className="text-xs text-slate-300 mt-1">Opening + Income − Expense</p>
          </div>
        </CardContent>
      </Card>

      {/* Cashbook breakdown — explicit math */}
      <Card data-testid="wizbang-cashbook-card" className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-600" /> Cashbook — How your balance is calculated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm divide-y divide-slate-100">
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 flex items-center gap-2"><Lock className="w-3 h-3" /> Opening Bank Balance</span>
              <span className="font-semibold text-slate-900" data-testid="cashbook-opening">{fmtINR(opening)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-emerald-700">+ Income added</span>
              <span className="font-semibold text-emerald-700" data-testid="cashbook-reg-income">+ {fmtINR(regIn)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-emerald-700">+ Credit repaid back (returned to bank)</span>
              <span className="font-semibold text-emerald-700" data-testid="cashbook-credit-in">+ {fmtINR(credIn)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-rose-700">− Expenses paid</span>
              <span className="font-semibold text-rose-700" data-testid="cashbook-reg-expense">− {fmtINR(regOut)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-rose-700">− Credit given out (treated as expense)</span>
              <span className="font-semibold text-rose-700" data-testid="cashbook-credit-out">− {fmtINR(credOut)}</span>
            </div>
            <div className="flex items-center justify-between py-3 mt-1 bg-slate-50 -mx-6 px-6 rounded-b">
              <span className="font-semibold text-slate-900">= Current Bank Balance</span>
              <span className="text-xl font-bold text-slate-900" data-testid="cashbook-current-balance">{fmtINR(current_balance)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Note: When you give credit to someone it is deducted from the bank as an expense. When they repay you, the amount is added back to the bank as income. Outstanding credit (still to be returned) is shown separately and is NOT part of your current balance.
          </p>
        </CardContent>
      </Card>

      {/* Month + lifetime stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="This Month — Income"
          value={fmtINR(this_month?.income)}
          accent="border-emerald-500"
          testId="stat-month-income"
        />
        <StatCard
          icon={TrendingDown}
          label="This Month — Expense"
          value={fmtINR(this_month?.expense)}
          accent="border-rose-500"
          testId="stat-month-expense"
        />
        <StatCard
          icon={IndianRupee}
          label="This Month — Net"
          value={fmtINR(this_month?.net)}
          accent={this_month?.net >= 0 ? 'border-emerald-500' : 'border-rose-500'}
          testId="stat-month-net"
          sub={this_month?.month}
        />
        <StatCard
          icon={Wallet}
          label="Lifetime Net"
          value={fmtINR(totals?.net)}
          accent="border-indigo-500"
          testId="stat-lifetime-net"
          sub={`In: ${fmtINR(totals?.total_income)} • Out: ${fmtINR(totals?.total_expense)}`}
        />
      </div>

      {/* Outstanding credit — money still owed to us */}
      {(outstanding_credit ?? 0) > 0 && (
        <Card className="border-l-4 border-amber-500 bg-amber-50/60" data-testid="outstanding-credit-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-800 font-semibold">
                Outstanding Credit (money given but not yet returned)
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{fmtINR(outstanding_credit)}</p>
            </div>
            <a
              href="/wizbang/credits"
              className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
            >
              Manage credits →
            </a>
          </CardContent>
        </Card>
      )}

      {/* 12-month chart */}
      <Card data-testid="wizbang-12m-chart-card">
        <CardHeader>
          <CardTitle>Income vs Expense — Last 12 months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart_12_months}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                data-testid="wizbang-bar-chart"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                />
                <Tooltip formatter={(v) => fmtINR(v)} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card data-testid="wizbang-recent-card">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent_transactions?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="wizbang-recent-table">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Vendor</th>
                    <th className="text-left px-4 py-3">Mode</th>
                    <th className="text-right px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">{tx.date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            tx.type === 'income'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {tx.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{tx.category}</td>
                      <td className="px-4 py-3 text-slate-700">{tx.vendor_name}</td>
                      <td className="px-4 py-3 text-slate-700">{tx.payment_mode}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '−'} {fmtINR(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-6 text-center text-slate-500" data-testid="wizbang-recent-empty">
              No transactions yet. Add income or expenses from the sidebar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WizbangDashboard;
