import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  Users,
  Wifi,
  Radio,
  RefreshCw,
  LogOut,
  Layers,
  Clock,
  Shield,
  Server,
  ArrowDownCircle,
  ArrowUpCircle,
  Zap,
} from 'lucide-react';
import { DashboardData, ActiveSessionItem, RouterOSInfo } from '../../../shared/types';

interface DashboardViewProps {
  initialInfo: RouterOSInfo | null;
  onDisconnect: () => void;
  onNavigateToGenerator: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  initialInfo,
  onDisconnect,
  onNavigateToGenerator,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [serviceFilter, setServiceFilter] = useState<'all' | 'hotspot' | 'usermanager' | 'ppp'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const isFetchingRef = useRef(false);

  const loadDashboard = async () => {
    if (!window.netcardAPI || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const res = await window.netcardAPI.getDashboardData();
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadDashboard();
    // Auto-refresh stats every 10 seconds without overlapping requests
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const info = data?.info || initialInfo;
  const counts = data?.counts || {
    hotspotUsers: 0,
    hotspotActive: 0,
    userManagerUsers: 0,
    userManagerActive: 0,
    pppSecrets: 0,
    pppActive: 0,
  };

  // Helper calculation for CPU load number
  const cpuPercent = info?.cpuLoad ? parseInt(info.cpuLoad.replace('%', ''), 10) || 0 : 0;

  // Helper for memory usage percentage
  let memPercent = 0;
  if (info?.totalMemoryBytes && info?.freeMemoryBytes) {
    const used = info.totalMemoryBytes - info.freeMemoryBytes;
    memPercent = Math.min(100, Math.round((used / info.totalMemoryBytes) * 100));
  }

  // Helper for HDD usage percentage
  let hddPercent = 0;
  if (info?.totalHddBytes && info?.freeHddBytes) {
    const usedHdd = info.totalHddBytes - info.freeHddBytes;
    hddPercent = Math.min(100, Math.round((usedHdd / info.totalHddBytes) * 100));
  }

  // Filtered active sessions
  const filteredSessions = (data?.activeSessions || []).filter((s) => {
    const matchesService = serviceFilter === 'all' || s.service === serviceFilter;
    const matchesSearch =
      !searchTerm ||
      s.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.includes(searchTerm) ||
      (s.macAddress && s.macAddress.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesService && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto font-cairo">
      {/* Top Header & Actions Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between border border-space-border/60 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 via-pink-600 to-indigo-600 flex items-center justify-center shadow-neon-purple p-1">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white">
                {info?.identity || 'MikroTik Router'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-900/80 text-space-pink border border-pink-500/40 font-mono">
                RouterOS v{info?.version || '7.x'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-950/80 text-space-cyan border border-cyan-500/40 font-mono">
                {info?.boardName || 'RouterBOARD'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-purple-300/80 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>وقت التشغيل: </span>
                <span className="font-mono font-bold text-slate-200">{info?.uptime || '0m'}</span>
              </span>
              {info?.architecture && (
                <span>
                  المعمارية: <strong className="text-slate-200">{info.architecture}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateToGenerator}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-space-accent to-space-pink hover:opacity-95 text-white text-xs font-bold shadow-neon-purple transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>توليد كروت جديدة</span>
          </button>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-space-card/80 hover:bg-space-card border border-space-border text-purple-200 hover:text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-space-cyan' : ''}`} />
            <span>تحديث البيانات</span>
          </button>

          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-950/50"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج من الراوتر</span>
          </button>
        </div>
      </div>

      {/* 3 Main Hardware Resource Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 shrink-0">
        {/* CPU Load Card */}
        <div className="glass-card rounded-2xl p-4 border border-space-border/60 bg-gradient-to-br from-space-darkest/90 via-space-card/50 to-purple-950/20">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-space-pink" />
              <span>استهلاك المعالج (CPU Load)</span>
            </span>
            <span
              className={`text-sm font-black font-mono px-2 py-0.5 rounded-lg ${
                cpuPercent >= 85
                  ? 'bg-red-950 text-red-400 border border-red-500/50'
                  : cpuPercent >= 60
                  ? 'bg-amber-950 text-amber-400 border border-amber-500/50'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
              }`}
            >
              {info?.cpuLoad || '0%'}
            </span>
          </div>
          <div className="w-full bg-space-darkest h-3 rounded-full overflow-hidden border border-space-border/80 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                cpuPercent >= 85
                  ? 'bg-gradient-to-r from-red-600 to-rose-400'
                  : cpuPercent >= 60
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${Math.max(5, cpuPercent)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-purple-400 mt-2 font-mono">
            <span>0%</span>
            <span>طراز المعالج: {info?.architecture || 'Multi-Core'}</span>
            <span>100%</span>
          </div>
        </div>

        {/* Memory Usage Card */}
        <div className="glass-card rounded-2xl p-4 border border-space-border/60 bg-gradient-to-br from-space-darkest/90 via-space-card/50 to-indigo-950/20">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-space-cyan" />
              <span>الذاكرة العشوائية (RAM)</span>
            </span>
            <span className="text-xs font-bold font-mono text-space-cyan">
              {memPercent}% مستخدم
            </span>
          </div>
          <div className="w-full bg-space-darkest h-3 rounded-full overflow-hidden border border-space-border/80 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-space-cyan transition-all duration-700"
              style={{ width: `${Math.max(5, memPercent)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-purple-300/80 mt-2">
            <span>
              الحرة: <strong className="text-emerald-400 font-mono">{info?.freeMemory || '0 MB'}</strong>
            </span>
            <span>
              الإجمالي: <strong className="text-slate-200 font-mono">{info?.totalMemory || '0 MB'}</strong>
            </span>
          </div>
        </div>

        {/* HDD Storage Card */}
        <div className="glass-card rounded-2xl p-4 border border-space-border/60 bg-gradient-to-br from-space-darkest/90 via-space-card/50 to-pink-950/20">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-space-pink" />
              <span>مساحة التخزين (HDD Space)</span>
            </span>
            <span className="text-xs font-bold font-mono text-space-pink">
              {hddPercent}% مستخدم
            </span>
          </div>
          <div className="w-full bg-space-darkest h-3 rounded-full overflow-hidden border border-space-border/80 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400 transition-all duration-700"
              style={{ width: `${Math.max(5, hddPercent)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-purple-300/80 mt-2">
            <span>
              المتبقي: <strong className="text-emerald-400 font-mono">{info?.freeHdd || '0 MB'}</strong>
            </span>
            <span>
              الإجمالي: <strong className="text-slate-200 font-mono">{info?.totalHdd || '0 MB'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3 Service User Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 shrink-0">
        {/* Hotspot Card */}
        <div className="glass-card rounded-2xl p-4 border border-space-accent/40 bg-purple-950/30 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-space-pink flex items-center gap-1.5">
              <Wifi className="w-4 h-4" />
              <span>شبكة الهوت سبوت (Hotspot)</span>
            </span>
            <div className="text-2xl font-black text-white font-mono">
              {counts.hotspotUsers}{' '}
              <span className="text-xs font-normal text-purple-300">مستخدم مسجل</span>
            </div>
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>المتصلون حالياً (Active): {counts.hotspotActive}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-space-darkest/80 border border-space-border flex items-center justify-center text-space-accent">
            <Wifi className="w-6 h-6" />
          </div>
        </div>

        {/* User Manager Card */}
        <div className="glass-card rounded-2xl p-4 border border-space-accent/40 bg-indigo-950/30 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-space-cyan flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>اليوزر مانجر (User Manager)</span>
            </span>
            <div className="text-2xl font-black text-white font-mono">
              {counts.userManagerUsers}{' '}
              <span className="text-xs font-normal text-purple-300">مستخدم مسجل</span>
            </div>
            <div className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span>الجلسات النشطة: {counts.userManagerActive}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-space-darkest/80 border border-space-border flex items-center justify-center text-space-cyan">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Broadband PPPoE Card */}
        <div className="glass-card rounded-2xl p-4 border border-space-accent/40 bg-pink-950/30 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-purple-400" />
              <span>البرودباند (PPPoE Secrets)</span>
            </span>
            <div className="text-2xl font-black text-white font-mono">
              {counts.pppSecrets}{' '}
              <span className="text-xs font-normal text-purple-300">حساب اشتراك</span>
            </div>
            <div className="text-xs text-pink-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping inline-block" />
              <span>المتصلون حالياً: {counts.pppActive}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-space-darkest/80 border border-space-border flex items-center justify-center text-space-pink">
            <Radio className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Sessions Real-Time Table */}
      <div className="glass-card rounded-2xl p-4 border border-space-border/60 flex-1 flex flex-col min-h-[320px]">
        {/* Table Filters & Search Bar */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-space-border/50 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-space-cyan" />
            <h3 className="text-sm font-bold text-white">الجلسات والعملاء المتصلون حالياً (Active Sessions)</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-space-darkest text-purple-300 font-mono border border-space-border">
              {filteredSessions.length} متصل
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-space-darkest p-1 rounded-xl border border-space-border text-xs">
              <button
                onClick={() => setServiceFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  serviceFilter === 'all'
                    ? 'bg-space-accent text-white shadow-neon-purple'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setServiceFilter('hotspot')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  serviceFilter === 'hotspot'
                    ? 'bg-space-accent text-white shadow-neon-purple'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                هوت سبوت ({counts.hotspotActive})
              </button>
              <button
                onClick={() => setServiceFilter('usermanager')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  serviceFilter === 'usermanager'
                    ? 'bg-space-accent text-white shadow-neon-purple'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                يوزر مانجر ({counts.userManagerActive})
              </button>
              <button
                onClick={() => setServiceFilter('ppp')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  serviceFilter === 'ppp'
                    ? 'bg-space-accent text-white shadow-neon-purple'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                برودباند ({counts.pppActive})
              </button>
            </div>

            {/* Search input */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم أو IP أو الماك..."
              className="bg-space-darkest border border-space-border rounded-xl px-3 py-1 text-xs text-white placeholder-purple-400/50 focus:border-space-accent focus:outline-none w-52"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto mt-2 pr-1">
          {filteredSessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-purple-400 py-12 gap-2">
              <Users className="w-10 h-10 opacity-30 text-purple-300" />
              <p className="text-xs">لا يوجد مستخدمون متصلون حالياً في هذا القسم</p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-space-darkest/70 text-purple-300 sticky top-0 border-b border-space-border">
                <tr>
                  <th className="py-2.5 px-3 font-bold">اسم المستخدم (User)</th>
                  <th className="py-2.5 px-3 font-bold">عنوان IP</th>
                  <th className="py-2.5 px-3 font-bold">عنوان الماك (MAC Address)</th>
                  <th className="py-2.5 px-3 font-bold">الخدمة</th>
                  <th className="py-2.5 px-3 font-bold">مدة الاتصال (Uptime)</th>
                  <th className="py-2.5 px-3 font-bold">استهلاك البيانات (In / Out)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-border/30">
                {filteredSessions.map((session, idx) => (
                  <tr
                    key={session.id || idx}
                    className="hover:bg-space-card/60 transition-colors"
                  >
                    <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{session.user}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-space-cyan">{session.address}</td>
                    <td className="py-2 px-3 font-mono text-purple-300 text-[11px]">
                      {session.macAddress || '-'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          session.service === 'hotspot'
                            ? 'bg-purple-900/60 text-space-pink border border-pink-500/30'
                            : session.service === 'usermanager'
                            ? 'bg-cyan-950/60 text-space-cyan border border-cyan-500/30'
                            : 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {session.service === 'hotspot'
                          ? 'هوت سبوت'
                          : session.service === 'usermanager'
                          ? 'يوزر مانجر'
                          : 'PPPoE'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-300">{session.uptime}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-purple-300">
                      {session.bytesIn || session.bytesOut ? (
                        <span>
                          <span className="text-emerald-400">↓ {session.bytesIn || '0'}</span> /{' '}
                          <span className="text-rose-400">↑ {session.bytesOut || '0'}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
