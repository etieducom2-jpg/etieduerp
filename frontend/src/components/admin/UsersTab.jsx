import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Key, UserX, UserCheck, Trash2 } from 'lucide-react';

const UsersTab = ({ 
  users,
  branches,
  isSuperAdmin,
  isBranchAdmin,
  currentUser,
  onAddUser,
  onChangePassword,
  onToggleStatus,
  onDeleteUser
}) => {
  const filteredUsers = users.filter(user => {
    if (isBranchAdmin) {
      return user.role === 'Trainer' && user.branch_id === currentUser.branch_id;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Users</h2>
        <Button onClick={onAddUser} className="bg-slate-900 hover:bg-slate-800" data-testid="add-user-btn">
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>
      
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Photo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Branch</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-slate-50 ${user.is_active === false ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    {user.photo_url ? (
                      <img src={user.photo_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="text-slate-600 font-semibold text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.designation || user.role}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600">{user.email}</p>
                    <p className="text-xs text-slate-500">{user.phone || 'No phone'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge className="bg-blue-100 text-blue-800">{user.role}</Badge>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {branches.find(b => b.id === user.branch_id)?.name || 'All'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {user.is_active === false ? (
                      <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onChangePassword(user)}
                        title="Change Password"
                        data-testid={`change-password-${user.id}`}
                      >
                        <Key className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleStatus(user)}
                        title={user.is_active === false ? 'Activate User' : 'Deactivate User'}
                        data-testid={`toggle-status-${user.id}`}
                      >
                        {user.is_active === false ? (
                          <UserCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <UserX className="w-4 h-4 text-orange-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteUser(user.id)}
                        title="Delete User"
                        data-testid={`delete-user-${user.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-8 text-slate-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersTab;
