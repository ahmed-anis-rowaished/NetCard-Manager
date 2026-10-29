import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  UserCheck,
  UserX,
  Clock,
  Wifi,
  Radio,
  FileSpreadsheet,
  Edit2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  X,
  Check,
  Zap,
  HardDrive,
  Activity,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from 'lucide-react';
import { UserManagerV7UserItem, UserManagerProfile } from '../../../shared/types';

interface UserManagerV7ViewProps {
  isConnected: boolean;
}

export const UserManagerV7View: React.FC<UserManagerV7ViewProps> = ({ isConnected }) => {
  // Data State
  const [users, setUsers] = useState<UserManagerV7UserItem[]>([]);
  const [profiles, setProfiles] = useState<UserManagerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Selection & UI Filters
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [showPasswords, setShowPasswords] = useState(false);

  // Sorting & Pagination
  const [sortField, setSortField] = useState<keyof UserManagerV7UserItem>('username');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ids: string[]; count: number }>({
    open: false,
    ids: [],
    count: 0,
  });

  // Modal Form States
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    profile: '',
    sharedUsers: 1,
    callerId: '',
    comment: '',
    group: '',
  });

  const [editingUser, setEditingUser] = useState<UserManagerV7UserItem | null>(null);
  const [selectedProfileToAssign, setSelectedProfileToAssign] = useState<string>('');

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Initial Local Data
  useEffect(() => {
    loadCachedUsers();
    loadRouterProfiles();
  }, []);

  const loadCachedUsers = async () => {
    setIsLoading(true);
    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.getCachedUserManagerV7Users();
        if (res.success && res.users) {
          setUsers(res.users);
          if (res.users.length > 0 && res.users[0].updatedAt) {
            setLastSyncTime(new Date(res.users[0].updatedAt).toLocaleTimeString('ar-EG'));
          }
        }
      }
    } catch (e: any) {
      console.error('Failed to load cached users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRouterProfiles = async () => {
    try {
      if (window.netcardAPI) {
        const profs = await window.netcardAPI.getUserManagerProfiles();
        setProfiles(profs || []);
      }
    } catch (e) {
      console.warn('Could not load profiles:', e);
    }
  };

  // Sync snapshot from physical MikroTik Router
  const handleSyncFromRouter = async () => {
    if (!isConnected) {
      showToast('الراوتر غير متصل! يرجى التأكد من الاتصال بالراوتر أولاً.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.syncUserManagerV7Users();
        if (res.success && res.users) {
          setUsers(res.users);
          setLastSyncTime(new Date().toLocaleTimeString('ar-EG'));
          showToast(`تمت مزامنة ${res.count || res.users.length} مستخدم من الراوتر وحفظهم محلياً بنجاح ⚡`, 'success');
        } else {
          showToast(res.error || 'فشلت المزامنة من الراوتر', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'خطأ أثناء الاتصال بالراوتر', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper formatting
  const formatBytes = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filtered & Sorted Users (Calculated instantly via in-memory search)
  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return users.filter((u) => {
      // Status filter
      if (statusFilter === 'active' && u.state !== 'running-active') return false;
      if (statusFilter === 'waiting' && u.state !== 'waiting') return false;
      if (statusFilter === 'running' && u.state !== 'running') return false;
      if (statusFilter === 'used' && u.state !== 'used') return false;
      if (statusFilter === 'disabled' && !u.disabled) return false;
      if (statusFilter === 'enabled' && u.disabled) return false;

      // Profile filter
      if (profileFilter !== 'all' && u.profile !== profileFilter) return false;

      // Search term (username, callerId, comment, activeAddress)
      if (q) {
        const matchName = u.username.toLowerCase().includes(q);
        const matchCaller = u.callerId?.toLowerCase().includes(q);
        const matchComment = u.comment?.toLowerCase().includes(q);
        const matchIp = u.activeAddress?.toLowerCase().includes(q);
        const matchProfile = u.profile?.toLowerCase().includes(q);
        if (!matchName && !matchCaller && !matchComment && !matchIp && !matchProfile) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchTerm, statusFilter, profileFilter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        return sortAsc ? cmp : -cmp;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredUsers, sortField, sortAsc]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, currentPage, pageSize]);

  // Adjust page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Summary Metrics Bar
  const metrics = useMemo(() => {
    let total = users.length;
    let active = 0;
    let waiting = 0;
    let used = 0;
    let disabled = 0;

    for (const u of users) {
      if (u.disabled) disabled++;
      else if (u.state === 'running-active') active++;
      else if (u.state === 'waiting') waiting++;
      else if (u.state === 'used') used++;
    }

    return { total, active, waiting, used, disabled };
  }, [users]);

  // Selection handlers
  const handleSelectAllCurrentPage = () => {
    const allPageIds = paginatedUsers.map((u) => u.id);
    const isAllSelected = allPageIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: keyof UserManagerV7UserItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Single / Batch Actions
  const handleToggleDisabled = async (ids: string[], newDisabledState: boolean) => {
    if (!isConnected) {
      showToast('الراوتر غير متصل!', 'error');
      return;
    }
    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.setUserManagerV7UserDisabled(ids, newDisabledState);
        if (res.success) {
          setUsers((prev) =>
            prev.map((u) =>
              ids.includes(u.id)
                ? {
                    ...u,
                    disabled: newDisabledState,
                    state: newDisabledState ? 'disabled' : u.state === 'disabled' ? 'waiting' : u.state,
                  }
                : u
            )
          );
          showToast(`تم ${newDisabledState ? 'تعطيل' : 'تفعيل'} ${ids.length} مستخدم بنجاح`, 'success');
        } else {
          showToast(res.error || 'فشلت العملية', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDisconnectSession = async (user: UserManagerV7UserItem) => {
    if (!isConnected) {
      showToast('الراوتر غير متصل!', 'error');
      return;
    }
    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.disconnectUserManagerV7Session(user.username, user.id);
        if (res.success) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === user.id ? { ...u, state: 'waiting', activeAddress: '', activeUptime: '' } : u
            )
          );
          showToast(`تم فصل جلسة المستخدم "${user.username}" بنجاح`, 'success');
        } else {
          showToast(res.error || 'فشل فصل الجلسة', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!isConnected) {
      showToast('الراوتر غير متصل!', 'error');
      return;
    }
    const ids = deleteConfirm.ids;
    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.deleteUserManagerV7Users(ids);
        if (res.success) {
          setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
          showToast(`تم حذف ${ids.length} مستخدم من الراوتر بنجاح`, 'success');
        } else {
          showToast(res.error || 'فشل حذف المستخدمين', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setDeleteConfirm({ open: false, ids: [], count: 0 });
    }
  };

  // Add User submit
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim()) {
      showToast('يرجى إدخال اسم المستخدم', 'error');
      return;
    }
    if (!isConnected) {
      showToast('الراوتر غير متصل!', 'error');
      return;
    }

    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.addUserManagerV7User(newUser);
        if (res.success && res.user) {
          setUsers((prev) => [res.user!, ...prev]);
          setIsAddModalOpen(false);
          setNewUser({
            username: '',
            password: '',
            profile: '',
            sharedUsers: 1,
            callerId: '',
            comment: '',
            group: '',
          });
          showToast(`تمت إضافة المستخدم "${res.user.username}" للراوتر بنجاح`, 'success');
        } else {
          showToast(res.error || 'فشلت إضافة المستخدم', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Edit User submit
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!isConnected) {
      showToast('الراوتر غير متصل!', 'error');
      return;
    }

    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.updateUserManagerV7User(
          editingUser.id,
          editingUser.username,
          {
            password: editingUser.password,
            profile: editingUser.profile,
            sharedUsers: editingUser.sharedUsers,
            callerId: editingUser.callerId,
            comment: editingUser.comment,
            disabled: editingUser.disabled,
            group: editingUser.groupName,
          }
        );
        if (res.success) {
          setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? editingUser : u)));
          setIsEditModalOpen(false);
          showToast(`تم تحديث بيانات المستخدم "${editingUser.username}" بنجاح`, 'success');
        } else {
          showToast(res.error || 'فشل تحديث البيانات', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Assign Profile batch
  const handleAssignProfileSubmit = async () => {
    if (!selectedProfileToAssign) {
      showToast('يرجى اختيار الباقة المراد تعيينها', 'error');
      return;
    }
    if (!isConnected) {
      showToast('الراوتر غير متصل!', 'error');
      return;
    }

    const targetUsers = users
      .filter((u) => selectedIds.has(u.id))
      .map((u) => ({ id: u.id, username: u.username }));

    if (targetUsers.length === 0) {
      showToast('يرجى تحديد مستخدم واحد على الأقل', 'error');
      return;
    }

    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.assignUserManagerV7Profile(
          targetUsers,
          selectedProfileToAssign
        );
        if (res.success) {
          setUsers((prev) =>
            prev.map((u) =>
              selectedIds.has(u.id) ? { ...u, profile: selectedProfileToAssign } : u
            )
          );
          setIsAssignModalOpen(false);
          showToast(`تم تعيين الباقة "${selectedProfileToAssign}" لـ ${targetUsers.length} مستخدم`, 'success');
        } else {
          showToast(res.error || 'فشل تعيين الباقة', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (sortedUsers.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'info');
      return;
    }

    const headers = [
      'اسم المستخدم',
      'كلمة المرور',
      'الباقة',
      'الحالة',
      'الماك أدرس',
      'عنوان IP',
      'وقت الاتصال',
      'إجمالي الاستهلاك (بايت)',
      'تاريخ الانتهاء',
      'الملاحظات',
    ];

    const rows = sortedUsers.map((u) => [
      `"${u.username}"`,
      `"${u.password || ''}"`,
      `"${u.profile || ''}"`,
      `"${u.state}"`,
      `"${u.callerId || ''}"`,
      `"${u.activeAddress || ''}"`,
      `"${u.uptime || ''}"`,
      `"${u.totalBytes || 0}"`,
      `"${u.endTime || ''}"`,
      `"${(u.comment || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `userman_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير ملف البيانات بنجاح', 'success');
  };

  // Helper badge for state
  const renderStateBadge = (user: UserManagerV7UserItem) => {
    if (user.disabled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/70 text-red-400 border border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          معطل
        </span>
      );
    }
    if (user.state === 'running-active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shadow-neon-emerald">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          متصل أونلاين
        </span>
      );
    }
    if (user.state === 'running') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/70 text-blue-400 border border-blue-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          نشط
        </span>
      );
    }
    if (user.state === 'used') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/70 text-purple-400 border border-purple-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
          منتهي
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        قيد الانتظار
      </span>
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 gap-2.5 select-none overflow-hidden bg-space-darkest text-slate-100 font-cairo">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 left-5 z-50 px-4 py-2.5 rounded-xl border text-xs font-bold shadow-xl flex items-center gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300 shadow-neon-emerald'
              : toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/50 text-red-300'
              : 'bg-purple-950/90 border-purple-500/50 text-purple-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Metrics Bar */}
      <div className="glass-panel rounded-2xl p-3.5 border border-space-border/80 bg-space-darker/80 shrink-0 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Description */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-neon-purple p-2">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-wide">
                  إدارة مستخدمي اليوزر مانجر (User Manager v7)
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900/60 border border-purple-500/30 text-purple-300 font-bold">
                  نسخة v6 المطورة لنظام v7
                </span>
              </div>
              <p className="text-[11px] text-purple-300/80">
                لوحة تحكم محلية فائقة السرعة (0ms) مع التخزين الذكي وتحديث الأوامر المباشرة على الراوتر
              </p>
            </div>
          </div>

          {/* Sync Button & Local Cache Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex flex-col text-left text-[10px] text-purple-300/80 font-mono">
              <span>قاعدة البيانات: <strong className="text-emerald-400">محفوظة محلياً</strong></span>
              <span>{lastSyncTime ? `آخر مزامنة: ${lastSyncTime}` : 'لم تتم المزامنة بعد'}</span>
            </div>

            <button
              onClick={handleSyncFromRouter}
              disabled={isSyncing || !isConnected}
              title="سحب لقطة كاملة ومحدثة من الراوتر لقاعدة البيانات المحلية"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
                isSyncing
                  ? 'bg-purple-800 text-purple-200 cursor-wait'
                  : isConnected
                  ? 'bg-gradient-to-r from-space-accent to-space-pink hover:opacity-90 text-white shadow-neon-purple active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة من الراوتر ⚡'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-space-border/50">
          <div className="bg-space-card/70 border border-space-border/40 rounded-xl p-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-purple-300/80 font-medium">إجمالي المستخدمين</div>
              <div className="text-base font-black text-white font-mono">{metrics.total}</div>
            </div>
            <Users className="w-5 h-5 text-space-pink opacity-80" />
          </div>

          <div className="bg-space-card/70 border border-emerald-500/20 rounded-xl p-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-emerald-400/90 font-medium">متصلين أونلاين</div>
              <div className="text-base font-black text-emerald-400 font-mono">{metrics.active}</div>
            </div>
            <Wifi className="w-5 h-5 text-emerald-400 opacity-80" />
          </div>

          <div className="bg-space-card/70 border border-amber-500/20 rounded-xl p-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-amber-300/90 font-medium">قيد الانتظار</div>
              <div className="text-base font-black text-amber-300 font-mono">{metrics.waiting}</div>
            </div>
            <Clock className="w-5 h-5 text-amber-400 opacity-80" />
          </div>

          <div className="bg-space-card/70 border border-purple-500/20 rounded-xl p-2 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-purple-300/90 font-medium">منتهي / مستخدم</div>
              <div className="text-base font-black text-purple-300 font-mono">{metrics.used}</div>
            </div>
            <Activity className="w-5 h-5 text-purple-400 opacity-80" />
          </div>

          <div className="bg-space-card/70 border border-red-500/20 rounded-xl p-2 flex items-center justify-between col-span-2 sm:col-span-1">
            <div>
              <div className="text-[10px] text-red-400/90 font-medium">معطل</div>
              <div className="text-base font-black text-red-400 font-mono">{metrics.disabled}</div>
            </div>
            <PowerOff className="w-5 h-5 text-red-400 opacity-80" />
          </div>
        </div>
      </div>

      {/* Search, Filter & Action Toolbar */}
      <div className="glass-panel rounded-2xl p-2.5 border border-space-border/80 bg-space-darker/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Search & Select Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
          {/* Instant Search Bar */}
          <div className="flex items-center bg-space-darkest/90 rounded-xl px-3 py-1.5 border border-space-border/80 focus-within:border-space-pink transition-all w-64 lg:w-72">
            <Search className="w-4 h-4 text-purple-400 ml-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="بحث بالاسم، الماك، IP، الملاحظة..."
              className="bg-transparent text-xs text-white placeholder-purple-300/40 focus:outline-none w-full"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-purple-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Profile Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-space-darkest/90 rounded-xl px-2.5 py-1.5 border border-space-border/80 text-xs">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={profileFilter}
              onChange={(e) => {
                setProfileFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-purple-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-space-darkest text-white">كل الباقات</option>
              {profiles.map((p) => (
                <option key={p.id || p.name} value={p.name} className="bg-space-darkest text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-space-darkest/90 rounded-xl p-0.5 border border-space-border/80 text-[11px] overflow-x-auto">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'active', label: 'متصل' },
              { id: 'waiting', label: 'انتظار' },
              { id: 'used', label: 'منتهي' },
              { id: 'disabled', label: 'معطل' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-sm'
                    : 'text-purple-300/70 hover:text-white hover:bg-space-card'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Operation Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowPasswords(!showPasswords)}
            title="إظهار / إخفاء كلمات المرور"
            className="p-2 rounded-xl bg-space-card border border-space-border hover:bg-space-card/80 text-purple-300 hover:text-white transition-colors text-xs flex items-center gap-1"
          >
            {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleExportCsv}
            title="تصدير القائمة المعروضة إلى CSV"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-space-card border border-space-border hover:bg-space-card/80 text-purple-300 hover:text-white text-xs font-bold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>تصدير CSV</span>
          </button>

          {/* Selected Actions Dropdown or Buttons */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 bg-purple-950/60 border border-purple-500/40 rounded-xl p-0.5">
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-bold transition-colors"
              >
                <span>تعيين باقة ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => handleToggleDisabled(Array.from(selectedIds), false)}
                title="تفعيل المستخدمين المحددين"
                className="p-1.5 rounded-lg hover:bg-emerald-900/50 text-emerald-400 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleToggleDisabled(Array.from(selectedIds), true)}
                title="تعطيل المستخدمين المحددين"
                className="p-1.5 rounded-lg hover:bg-amber-900/50 text-amber-400 transition-colors"
              >
                <UserX className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() =>
                  setDeleteConfirm({
                    open: true,
                    ids: Array.from(selectedIds),
                    count: selectedIds.size,
                  })
                }
                title="حذف المستخدمين المحددين"
                className="p-1.5 rounded-lg hover:bg-red-900/50 text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* New User Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-space-accent to-space-pink hover:opacity-90 text-white text-xs font-black shadow-neon-purple transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>مستخدم جديد</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 glass-panel rounded-2xl border border-space-border/80 bg-space-darker/60 overflow-hidden flex flex-col shadow-inner">
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-purple-900/60 scrollbar-track-transparent">
          <table className="w-full text-right border-collapse text-xs">
            {/* Table Header */}
            <thead className="bg-space-darkest/95 text-purple-300 font-bold sticky top-0 z-10 border-b border-space-border/80">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedUsers.length > 0 &&
                      paginatedUsers.every((u) => selectedIds.has(u.id))
                    }
                    onChange={handleSelectAllCurrentPage}
                    className="w-4 h-4 rounded bg-space-card border-space-border text-space-pink focus:ring-0 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort('state')}
                  className="p-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>الحالة</span>
                    <ArrowUpDown className="w-3 h-3 text-purple-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('username')}
                  className="p-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>اسم المستخدم</span>
                    <ArrowUpDown className="w-3 h-3 text-purple-400" />
                  </div>
                </th>
                <th className="p-3">كلمة المرور</th>
                <th
                  onClick={() => handleSort('profile')}
                  className="p-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>الباقة</span>
                    <ArrowUpDown className="w-3 h-3 text-purple-400" />
                  </div>
                </th>
                <th className="p-3">الماك / Caller ID</th>
                <th className="p-3">عنوان IP</th>
                <th
                  onClick={() => handleSort('uptime')}
                  className="p-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>مدة الاتصال</span>
                    <ArrowUpDown className="w-3 h-3 text-purple-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalBytes')}
                  className="p-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>الاستهلاك</span>
                    <ArrowUpDown className="w-3 h-3 text-purple-400" />
                  </div>
                </th>
                <th className="p-3">تاريخ الانتهاء</th>
                <th className="p-3">ملاحظات</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-space-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-purple-300">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-space-pink" />
                    <span>جاري تحميل مستخدمي اليوزر مانجر من قاعدة البيانات...</span>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-purple-300/70">
                    <Users className="w-10 h-10 mx-auto mb-2 text-purple-500/40" />
                    <p className="text-sm font-bold text-white">لا يوجد مستخدمون يطابقون خيارات البحث</p>
                    <p className="text-xs text-purple-300/60 mt-1">
                      {users.length === 0
                        ? 'انقر على زر "مزامنة من الراوتر ⚡" لتحميل قاعدة بيانات اليوزر مانجر'
                        : 'جرب تغيير شروط البحث أو الفلترة أعلاه'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isSelected = selectedIds.has(user.id);
                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-purple-900/20 transition-colors ${
                        isSelected ? 'bg-purple-900/30' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(user.id)}
                          className="w-4 h-4 rounded bg-space-card border-space-border text-space-pink focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="p-3 whitespace-nowrap">{renderStateBadge(user)}</td>

                      <td className="p-3 font-mono font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{user.username}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(user.username);
                              showToast('تم نسخ اسم المستخدم', 'info');
                            }}
                            title="نسخ اسم المستخدم"
                            className="opacity-40 hover:opacity-100 text-purple-300 transition-opacity"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3 font-mono text-purple-200">
                        {showPasswords ? (
                          user.password || <span className="text-purple-400/40">-</span>
                        ) : (
                          <span className="tracking-widest">••••••</span>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {user.profile ? (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 font-bold">
                            {user.profile}
                          </span>
                        ) : (
                          <span className="text-purple-400/40">بدون باقة</span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-purple-300 whitespace-nowrap">
                        {user.callerId || <span className="text-purple-400/40">-</span>}
                      </td>

                      <td className="p-3 font-mono text-space-cyan whitespace-nowrap">
                        {user.activeAddress || <span className="text-purple-400/40">-</span>}
                      </td>

                      <td className="p-3 font-mono text-purple-200 whitespace-nowrap">
                        {user.activeUptime || user.uptime || <span className="text-purple-400/40">-</span>}
                      </td>

                      <td className="p-3 font-mono text-purple-300 whitespace-nowrap">
                        {user.totalBytes ? formatBytes(user.totalBytes) : <span className="text-purple-400/40">0 B</span>}
                      </td>

                      <td className="p-3 font-mono text-purple-300 whitespace-nowrap text-[11px]">
                        {user.endTime || <span className="text-purple-400/40">-</span>}
                      </td>

                      <td className="p-3 text-purple-300 max-w-[140px] truncate" title={user.comment}>
                        {user.comment || <span className="text-purple-400/40">-</span>}
                      </td>

                      {/* Row Actions */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Disconnect if Active */}
                          {user.state === 'running-active' && (
                            <button
                              onClick={() => handleDisconnectSession(user)}
                              title="فصل جلسة المستخدم"
                              className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle Disabled */}
                          <button
                            onClick={() => handleToggleDisabled([user.id], !user.disabled)}
                            title={user.disabled ? 'تفعيل المستخدم' : 'تعطيل المستخدم'}
                            className={`p-1 rounded-lg transition-colors ${
                              user.disabled
                                ? 'hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300'
                                : 'hover:bg-red-500/20 text-red-400 hover:text-red-300'
                            }`}
                          >
                            {user.disabled ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => {
                              setEditingUser({ ...user });
                              setIsEditModalOpen(true);
                            }}
                            title="تعديل المستخدم"
                            className="p-1 rounded-lg hover:bg-space-accent/20 text-space-cyan hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                open: true,
                                ids: [user.id],
                                count: 1,
                              })
                            }
                            title="حذف المستخدم"
                            className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination & Record Count */}
        <div className="bg-space-darkest/95 border-t border-space-border/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 text-purple-300">
            <span>
              عرض{' '}
              <strong className="text-white">
                {sortedUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              إلى{' '}
              <strong className="text-white">
                {Math.min(currentPage * pageSize, sortedUsers.length)}
              </strong>{' '}
              من إجمالي <strong className="text-space-pink">{sortedUsers.length}</strong> مستخدم
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1 bg-space-card/80 border border-space-border/60 rounded-lg px-2 py-0.5">
              <span>لكل صفحة:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value={25} className="bg-space-darkest text-white">25</option>
                <option value={50} className="bg-space-darkest text-white">50</option>
                <option value={100} className="bg-space-darkest text-white">100</option>
                <option value={200} className="bg-space-darkest text-white">200</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-space-card border border-space-border text-purple-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="الصفحة الأولى"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-space-card border border-space-border text-purple-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <span className="px-3 py-1 font-mono text-purple-200">
              صفحة <strong className="text-white">{currentPage}</strong> من {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-space-card border border-space-border text-purple-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-space-card border border-space-border text-purple-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="الصفحة الأخيرة"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Modal: Add User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-darker border border-space-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-space-border flex items-center justify-between bg-space-darkest/60">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-space-pink" />
                <h3 className="text-sm font-bold text-white">إضافة مستخدم يوزر مانجر جديد</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-purple-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">اسم المستخدم *</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="مثال: user123"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">كلمة المرور</label>
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="اتركها فارغة للمطابقة أو كلمة محددة"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">الباقة (Profile)</label>
                  <select
                    value={newUser.profile}
                    onChange={(e) => setNewUser({ ...newUser, profile: e.target.value })}
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink cursor-pointer"
                  >
                    <option value="">بدون باقة</option>
                    {profiles.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">عدد الأجهزة (Shared)</label>
                  <input
                    type="number"
                    min="1"
                    value={newUser.sharedUsers}
                    onChange={(e) => setNewUser({ ...newUser, sharedUsers: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">قفل الماك (Caller ID / MAC)</label>
                <input
                  type="text"
                  value={newUser.callerId}
                  onChange={(e) => setNewUser({ ...newUser, callerId: e.target.value })}
                  placeholder="اكتب bind للربط التلقائي بأول جهاز، أو ماك محدد"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">الملاحظة (Comment)</label>
                <input
                  type="text"
                  value={newUser.comment}
                  onChange={(e) => setNewUser({ ...newUser, comment: e.target.value })}
                  placeholder="مثال: NetCard_Manual"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-space-border/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-space-card text-purple-300 hover:text-white text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-space-accent to-space-pink hover:opacity-90 text-white text-xs font-black shadow-neon-purple transition-all"
                >
                  إضافة للراوتر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-darker border border-space-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-space-border flex items-center justify-between bg-space-darkest/60">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-space-cyan" />
                <h3 className="text-sm font-bold text-white">تعديل بيانات المستخدم: {editingUser.username}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-purple-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  disabled
                  value={editingUser.username}
                  className="w-full bg-space-darkest/60 border border-space-border/60 rounded-xl px-3 py-2 text-xs text-purple-400 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">كلمة المرور</label>
                <input
                  type="text"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="كلمة المرور"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">الباقة (Profile)</label>
                  <select
                    value={editingUser.profile || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, profile: e.target.value })}
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink cursor-pointer"
                  >
                    <option value="">بدون باقة</option>
                    {profiles.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">عدد الأجهزة (Shared)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingUser.sharedUsers || 1}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, sharedUsers: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">الماك أدرس / Caller ID</label>
                <input
                  type="text"
                  value={editingUser.callerId || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, callerId: e.target.value })}
                  placeholder="مثال: bind أو عنوان MAC"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">الملاحظات (Comment)</label>
                <input
                  type="text"
                  value={editingUser.comment || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, comment: e.target.value })}
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userDisabledCheck"
                  checked={editingUser.disabled}
                  onChange={(e) => setEditingUser({ ...editingUser, disabled: e.target.checked })}
                  className="w-4 h-4 rounded bg-space-card border-space-border text-space-pink focus:ring-0 cursor-pointer"
                />
                <label htmlFor="userDisabledCheck" className="text-xs text-purple-200 cursor-pointer font-bold">
                  تعطيل هذا الحساب (Disabled)
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-space-border/60">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-space-card text-purple-300 hover:text-white text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-space-accent to-space-pink hover:opacity-90 text-white text-xs font-black shadow-neon-purple transition-all"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Profile to Selected Users */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-darker border border-space-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-space-border flex items-center justify-between bg-space-darkest/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-space-pink" />
                <h3 className="text-sm font-bold text-white">تعيين باقة لـ {selectedIds.size} مستخدم</h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-purple-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-purple-300">
                اختر الباقة التي ترغب في ربطها بجميع المستخدمين المحددين ({selectedIds.size} مستخدم):
              </p>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">اختر الباقة</label>
                <select
                  value={selectedProfileToAssign}
                  onChange={(e) => setSelectedProfileToAssign(e.target.value)}
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-space-pink cursor-pointer"
                >
                  <option value="">-- اختر الباقة --</option>
                  {profiles.map((p) => (
                    <option key={p.id || p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-space-border/60">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-space-card text-purple-300 hover:text-white text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAssignProfileSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-space-accent to-space-pink hover:opacity-90 text-white text-xs font-black shadow-neon-purple transition-all"
                >
                  تطبيق وتعيين
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-darker border border-red-500/50 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 bg-red-950/40 border-b border-red-500/30 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-bold text-white">تأكيد حذف المستخدمين</h3>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-purple-200 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف{' '}
                <strong className="text-red-400">{deleteConfirm.count}</strong> مستخدم نهائياً من الراوتر
                وقاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-space-border/60">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ open: false, ids: [], count: 0 })}
                  className="px-4 py-2 rounded-xl bg-space-card text-purple-300 hover:text-white text-xs font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-lg"
                >
                  نعم، احذف نهائياً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
