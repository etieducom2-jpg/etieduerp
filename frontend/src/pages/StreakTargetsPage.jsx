import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Flame, Save, Trash2, UserCog } from 'lucide-react';
import { streakTargetsAPI, adminAPI } from '@/api/api';

const ROLE_LABEL = {
  'Counsellor': 'Counsellor',
  'Branch Admin': 'Branch Admin',
  'Front Desk Executive': 'Front Desk Executive',
  'Placement Manager': 'Placement Manager',
};

export default function StreakTargetsPage() {
  const [targets, setTargets] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState({}); // {role: target_days}
  const [newOverride, setNewOverride] = useState({ user_id: '', streak_target_days: 7 });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tRes, oRes, uRes] = await Promise.all([
        streakTargetsAPI.list(),
        streakTargetsAPI.listOverrides(),
        adminAPI.getUsers(),
      ]);
      setTargets(tRes.data.targets || []);
      setOverrides(oRes.data.overrides || []);
      setUsers((uRes.data || []).filter(u => ['Counsellor', 'Branch Admin', 'Front Desk Executive', 'Placement Manager'].includes(u.role)));
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load streak targets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const saveRoleTarget = async (role) => {
    const tgt = edits[role];
    if (!tgt || tgt < 1) { toast.error('Target must be at least 1 day'); return; }
    try {
      await streakTargetsAPI.updateRole(role, { target_days: parseInt(tgt, 10), longest_target: 30 });
      toast.success(`${ROLE_LABEL[role]} target updated to ${tgt} days`);
      setEdits(prev => ({ ...prev, [role]: undefined }));
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save target');
    }
  };

  const addOverride = async () => {
    if (!newOverride.user_id) { toast.error('Pick a user first'); return; }
    if (!newOverride.streak_target_days || newOverride.streak_target_days < 1) { toast.error('Target must be >= 1'); return; }
    try {
      await streakTargetsAPI.setUserOverride(newOverride.user_id, { streak_target_days: parseInt(newOverride.streak_target_days, 10) });
      toast.success('User streak override saved');
      setNewOverride({ user_id: '', streak_target_days: 7 });
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save override');
    }
  };

  const removeOverride = async (userId) => {
    if (!window.confirm('Remove streak target override for this user?')) return;
    try {
      await streakTargetsAPI.setUserOverride(userId, { streak_target_days: null });
      toast.success('Override removed');
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to remove override');
    }
  };

  return (
    <div className="space-y-6 p-1" data-testid="streak-targets-page">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-md">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Streak Targets</h1>
          <p className="text-sm text-slate-500">Set role-default activity-streak targets and individual user overrides.</p>
        </div>
      </div>

      {/* Role-level targets */}
      <Card data-testid="role-targets-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" />
            Role defaults
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targets.map(t => (
              <div key={t.role} className="border rounded-xl p-4 bg-slate-50/60 hover:bg-white transition-colors" data-testid={`role-target-${t.role.replace(/\s+/g,'-')}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-800">{ROLE_LABEL[t.role] || t.role}</h3>
                  <Badge variant="outline" className="bg-white">{t.target_days} days</Badge>
                </div>
                {t.updated_by_name && (
                  <p className="text-[11px] text-slate-400 mb-2">Last updated by {t.updated_by_name}</p>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Target days</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={edits[t.role] ?? t.target_days}
                      onChange={(e) => setEdits(prev => ({ ...prev, [t.role]: e.target.value }))}
                      data-testid={`role-target-input-${t.role.replace(/\s+/g,'-')}`}
                    />
                  </div>
                  <Button
                    onClick={() => saveRoleTarget(t.role)}
                    disabled={loading || edits[t.role] === undefined || parseInt(edits[t.role], 10) === t.target_days}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    data-testid={`save-role-target-${t.role.replace(/\s+/g,'-')}`}
                  >
                    <Save className="w-4 h-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-user overrides */}
      <Card data-testid="user-overrides-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserCog className="w-4 h-4 text-indigo-600" />
            Per-user overrides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl p-4 mb-4 bg-indigo-50/30">
            <p className="text-xs text-slate-600 mb-3">Set a custom target for a specific user. Overrides the role default.</p>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-7">
                <Label className="text-xs">User</Label>
                <Select value={newOverride.user_id} onValueChange={(v) => setNewOverride(prev => ({ ...prev, user_id: v }))}>
                  <SelectTrigger data-testid="override-user-select"><SelectValue placeholder="Pick a user..." /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.role} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">Target days</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={newOverride.streak_target_days}
                  onChange={(e) => setNewOverride(prev => ({ ...prev, streak_target_days: e.target.value }))}
                  data-testid="override-days-input"
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  onClick={addOverride}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  data-testid="add-override-btn"
                >
                  Add override
                </Button>
              </div>
            </div>
          </div>

          {overrides.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No per-user overrides set yet.</p>
          ) : (
            <div className="space-y-2">
              {overrides.map(o => (
                <div key={o.id} className="flex items-center justify-between border rounded-lg px-4 py-3 bg-white hover:bg-slate-50 transition-colors" data-testid={`override-row-${o.id}`}>
                  <div>
                    <p className="font-semibold text-slate-800">{o.name}</p>
                    <p className="text-xs text-slate-500">{o.email} · {o.role}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200">{o.streak_target_days} days</Badge>
                    <Button
                      onClick={() => removeOverride(o.id)}
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50"
                      data-testid={`remove-override-${o.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
