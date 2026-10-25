import React, { useState, useEffect } from 'react';
import {
  Server,
  User,
  Lock,
  Eye,
  EyeOff,
  Zap,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Network,
  Radio,
  Sliders,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { OctetInput } from '../components/OctetInput';
import {
  ConnectionConfig,
  SavedDevice,
  MndpDevice,
  RouterOSInfo,
} from '../../../shared/types';
import { DEFAULT_CONNECTION_CONFIG } from '../../../shared/defaults';

interface LoginViewProps {
  onLoginSuccess: (info: RouterOSInfo, config: ConnectionConfig) => void;
  isConnected: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, isConnected }) => {
  const [config, setConfig] = useState<ConnectionConfig>(DEFAULT_CONNECTION_CONFIG);
  const [showPassword, setShowPassword] = useState(false);
  const [customPortEnabled, setCustomPortEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'discovered' | 'saved'>('discovered');
  const [discoveredDevices, setDiscoveredDevices] = useState<MndpDevice[]>([]);
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load saved devices & MNDP devices on mount
  useEffect(() => {
    loadSavedDevices();
    startMndpDiscovery();
  }, []);

  const loadSavedDevices = async () => {
    try {
      if (window.netcardAPI) {
        const devs = await window.netcardAPI.getSavedDevices();
        setSavedDevices(devs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startMndpDiscovery = async () => {
    try {
      if (window.netcardAPI) {
        const initial = await window.netcardAPI.startMndp();
        if (initial) setDiscoveredDevices(initial);

        window.netcardAPI.onMndpDevicesUpdated((devices) => {
          setDiscoveredDevices(devices);
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanNow = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      if (window.netcardAPI) {
        const devs = await window.netcardAPI.scanMndp();
        setDiscoveredDevices(devs);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeviceRowClick = (dev: MndpDevice) => {
    const parts = dev.ip.split('.');
    if (parts.length === 4) {
      setConfig((prev) => ({
        ...prev,
        type: 'ip',
        octets: parts as [string, string, string, string],
        comment: dev.identity ? `${dev.identity} (${dev.boardName})` : prev.comment,
      }));
    }
    setSuccessMsg(`تم تحديد الجهاز: ${dev.identity || dev.ip}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSavedDeviceClick = (dev: SavedDevice) => {
    if (dev.connectionType === 'ip' && dev.ip) {
      const parts = dev.ip.split('.');
      if (parts.length === 4) {
        setConfig((prev) => ({
          ...prev,
          type: 'ip',
          octets: parts as [string, string, string, string],
          username: dev.username,
          password: dev.passwordEncrypted || '',
          comment: dev.comment || dev.name,
          port: dev.port,
          useSsl: dev.useSsl,
          fastLogin: dev.fastLogin,
          turboMode: dev.turboMode,
        }));
      }
    } else if (dev.domain) {
      setConfig((prev) => ({
        ...prev,
        type: 'domain',
        domain: dev.domain,
        username: dev.username,
        password: dev.passwordEncrypted || '',
        comment: dev.comment || dev.name,
        port: dev.port,
        useSsl: dev.useSsl,
        fastLogin: dev.fastLogin,
        turboMode: dev.turboMode,
      }));
    }
    setSuccessMsg(`تم استرجاع بيانات الراوتر: ${dev.name}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeleteSavedDevice = async (e: React.MouseEvent, id?: number) => {
    e.stopPropagation();
    if (!id || !window.netcardAPI) return;
    if (confirm('هل أنت متأكد من حذف هذا الجهاز المحفوظ؟')) {
      await window.netcardAPI.deleteDevice(id);
      loadSavedDevices();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!window.netcardAPI) {
        throw new Error('API غير متاح');
      }

      const res = await window.netcardAPI.connectMikroTik(config);
      if (res.success && res.info) {
        setSuccessMsg(`تم الاتصال بنجاح بالراوتر (إصدار ${res.info.version} - ${res.info.boardName})`);
        loadSavedDevices();
        setTimeout(() => {
          onLoginSuccess(res.info!, config);
        }, 600);
      } else {
        setErrorMsg(res.error || 'فشل الاتصال بالمايكروتك، تحقق من البيانات والشبكة');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء محاولة الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto p-4 flex flex-col gap-4 max-w-7xl mx-auto select-none">
      {/* Top Section: Space Gate Login Box */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-space-border/80 shadow-card-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-space-border/40 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-600 to-space-pink flex items-center justify-center text-white shadow-neon-purple">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                بيانات الاتصال بجهاز المايكروتك (MikroTik Connection)
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-space-card text-purple-300 border border-purple-500/20">
                  RouterOS v6 & v7
                </span>
              </h2>
              <p className="text-xs text-purple-300/70">
                أدخل عنوان IP أو Domain للراوتر، وبيانات تسجيل الدخول للبدء بإدارة الكروت
              </p>
            </div>
          </div>

          {/* Connection Type Switcher */}
          <div className="flex items-center bg-space-darkest/90 p-1 rounded-xl border border-space-border">
            <button
              type="button"
              onClick={() => setConfig({ ...config, type: 'ip' })}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                config.type === 'ip'
                  ? 'bg-gradient-to-r from-space-accent to-purple-600 text-white shadow-neon-purple'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>عنوان IP (Octets)</span>
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, type: 'domain' })}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                config.type === 'domain'
                  ? 'bg-gradient-to-r from-space-accent to-purple-600 text-white shadow-neon-purple'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>اسم النطاق (Domain)</span>
            </button>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Host Address (IP or Domain) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-200 flex items-center justify-between">
                <span>{config.type === 'ip' ? 'عنوان الآي بي (IP Address)' : 'اسم النطاق (Domain / Host)'}</span>
                <span className="text-[10px] text-purple-400">
                  {config.type === 'ip' ? 'انتقال بالـ Tab أو النقطة (.)' : 'مثال: mikrotik.lan'}
                </span>
              </label>
              {config.type === 'ip' ? (
                <OctetInput
                  value={config.octets}
                  onChange={(octets) => setConfig({ ...config, octets })}
                />
              ) : (
                <div className="flex items-center bg-space-darkest/70 border border-space-border hover:border-space-accent focus-within:border-space-accent rounded-lg px-3 py-2 text-white">
                  <input
                    type="text"
                    dir="ltr"
                    value={config.domain}
                    onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                    placeholder="router.mynetwork.com"
                    className="w-full bg-transparent text-space-cyan font-mono font-bold focus:outline-none text-sm"
                  />
                </div>
              )}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-space-accent" />
                  <span>اسم المستخدم (Username)</span>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-purple-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.saveUsername}
                    onChange={(e) => setConfig({ ...config, saveUsername: e.target.checked })}
                    className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                  />
                  <span>حفظ</span>
                </label>
              </div>
              <div className="flex items-center bg-space-darkest/70 border border-space-border hover:border-space-accent focus-within:border-space-accent rounded-lg px-3 py-2 text-white">
                <input
                  type="text"
                  dir="ltr"
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-transparent text-white font-medium focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-space-pink" />
                  <span>كلمة السر (Password)</span>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-purple-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.savePassword}
                    onChange={(e) => setConfig({ ...config, savePassword: e.target.checked })}
                    className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                  />
                  <span>حفظ</span>
                </label>
              </div>
              <div className="flex items-center bg-space-darkest/70 border border-space-border hover:border-space-accent focus-within:border-space-accent rounded-lg px-3 py-2 text-white">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-white font-medium focus:outline-none text-sm tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-purple-400 hover:text-white p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Inputs: Comment & Port */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Comment / Name */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-purple-200">
                تعليق أو تسمية الراوتر (Comment / Label)
              </label>
              <input
                type="text"
                value={config.comment}
                onChange={(e) => setConfig({ ...config, comment: e.target.value })}
                placeholder="راوتر الشبكة الرئيسية - برج الاتصالات"
                className="w-full bg-space-darkest/70 border border-space-border hover:border-space-accent focus:border-space-accent rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              />
            </div>

            {/* Port & SSL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-200">المنفذ (API Port)</label>
                <label className="flex items-center gap-1.5 text-[11px] text-purple-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customPortEnabled}
                    onChange={(e) => {
                      setCustomPortEnabled(e.target.checked);
                      if (!e.target.checked) {
                        setConfig((prev) => ({ ...prev, port: prev.useSsl ? 8729 : 8728 }));
                      }
                    }}
                    className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                  />
                  <span>تغيير البرت</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  dir="ltr"
                  disabled={!customPortEnabled}
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 8728 })}
                  className="w-24 text-center bg-space-darkest/70 border border-space-border hover:border-space-accent focus:border-space-accent rounded-lg px-2 py-2 text-space-cyan font-mono font-bold text-sm disabled:opacity-40 focus:outline-none"
                />
                <label className="flex items-center gap-1.5 text-xs text-purple-300 bg-space-darkest/50 px-3 py-2 rounded-lg border border-space-border cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.useSsl}
                    onChange={(e) => {
                      const ssl = e.target.checked;
                      setConfig((prev) => ({
                        ...prev,
                        useSsl: ssl,
                        port: !customPortEnabled ? (ssl ? 8729 : 8728) : prev.port,
                      }));
                    }}
                    className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                  />
                  <span>API-SSL (مشفر)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Performance Toggles & Login Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-space-border/40">
            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Fast Login Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-purple-200 cursor-pointer bg-space-card/40 px-3 py-1.5 rounded-lg border border-space-border/60 hover:border-space-accent/50 transition-all">
                <input
                  type="checkbox"
                  checked={config.fastLogin}
                  onChange={(e) => setConfig({ ...config, fastLogin: e.target.checked })}
                  className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0 w-4 h-4"
                />
                <span>دخول سريع بدون تحميل الجلسات والمدفوعات</span>
              </label>

              {/* Turbo Mode Toggle */}
              <label className="flex items-center gap-2 text-xs font-bold text-pink-300 cursor-pointer bg-pink-950/20 px-3 py-1.5 rounded-lg border border-pink-500/40 hover:border-pink-500 transition-all shadow-sm">
                <input
                  type="checkbox"
                  checked={config.turboMode}
                  onChange={(e) => setConfig({ ...config, turboMode: e.target.checked })}
                  className="rounded border-pink-500 bg-space-darkest text-space-pink focus:ring-0 w-4 h-4"
                />
                <Zap className="w-3.5 h-3.5 text-space-pink animate-pulse" />
                <span>فتح مع توربو (Turbo Mode - إضافة فائقة السرعة)</span>
              </label>
            </div>

            {/* Login Button with Space Gate Gradient */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 min-w-[200px] px-6 py-2.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 active:scale-[0.98] transition-all shadow-neon-purple disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الاتصال والتحقق...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تسجيل الدخول (Connect)</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-950/60 border border-red-500/50 rounded-xl p-3 text-red-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-3 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </form>
      </div>

      {/* Bottom Section: Devices Table Tabs (Discovered & Saved) */}
      <div className="glass-panel rounded-2xl p-4 flex-1 flex flex-col min-h-[300px] border border-space-border/80">
        <div className="flex items-center justify-between border-b border-space-border/50 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('discovered')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'discovered'
                  ? 'bg-space-accent text-white shadow-neon-purple'
                  : 'text-purple-300 hover:text-white hover:bg-space-card'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>أجهزة الميكروتك في الشبكة (MNDP Discovery)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-space-darkest text-[11px] font-mono text-space-cyan">
                {discoveredDevices.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('saved');
                loadSavedDevices();
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'saved'
                  ? 'bg-space-accent text-white shadow-neon-purple'
                  : 'text-purple-300 hover:text-white hover:bg-space-card'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>أجهزة الميكروتك المحفوظة (Saved Routers)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-space-darkest text-[11px] font-mono text-space-pink">
                {savedDevices.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'discovered' ? (
              <button
                type="button"
                onClick={handleScanNow}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-space-card hover:bg-purple-900 border border-space-borderLight text-purple-200 text-xs font-bold transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>فحص الشبكة الآن (MNDP Scan)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={loadSavedDevices}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-space-card hover:bg-purple-900 border border-space-borderLight text-purple-200 text-xs font-bold transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث القائمة</span>
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          {activeTab === 'discovered' ? (
            <table className="w-full text-right text-xs">
              <thead className="bg-space-darkest/90 text-purple-300 border-b border-space-border sticky top-0 font-bold">
                <tr>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">MAC Address</th>
                  <th className="py-2.5 px-3">Identity (اسم الراوتر)</th>
                  <th className="py-2.5 px-3">Platform</th>
                  <th className="py-2.5 px-3">RouterOS Version</th>
                  <th className="py-2.5 px-3">Board Name</th>
                  <th className="py-2.5 px-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-border/30">
                {discoveredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-purple-400">
                      <div className="flex flex-col items-center gap-2">
                        <Network className="w-8 h-8 opacity-40 animate-pulse" />
                        <span>جاري الاستماع لرسائل MNDP عبر منفذ UDP 5678 في الشبكة المحلية...</span>
                        <span className="text-[11px] text-purple-500">
                          (إذا كان الراوتر على IP محدد، يمكنك إدخاله يدوياً في خانات IP بالأعلى)
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  discoveredDevices.map((dev, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleDeviceRowClick(dev)}
                      className="hover:bg-purple-900/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-space-cyan">{dev.ip}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{dev.mac}</td>
                      <td className="py-2.5 px-3 font-bold text-white group-hover:text-space-accent">
                        {dev.identity || 'MikroTik'}
                      </td>
                      <td className="py-2.5 px-3 text-purple-300">{dev.platform || 'MikroTik'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-space-pink font-mono font-bold">
                          v{dev.version}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono">{dev.boardName}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-space-accent font-bold group-hover:underline">
                          تعبئة
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-space-darkest/90 text-purple-300 border-b border-space-border sticky top-0 font-bold">
                <tr>
                  <th className="py-2.5 px-3">الاسم / التعليق</th>
                  <th className="py-2.5 px-3">العنوان (IP / Domain)</th>
                  <th className="py-2.5 px-3">المستخدم</th>
                  <th className="py-2.5 px-3">المنفذ</th>
                  <th className="py-2.5 px-3">التوربو</th>
                  <th className="py-2.5 px-3">آخر اتصال</th>
                  <th className="py-2.5 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-border/30">
                {savedDevices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-purple-400">
                      لا توجد أجهزة محفوظة حتى الآن. عند تسجيل الدخول مع تفعيل "حفظ"، سيتم تخزين الجهاز تلقائياً هنا.
                    </td>
                  </tr>
                ) : (
                  savedDevices.map((dev) => (
                    <tr
                      key={dev.id}
                      onClick={() => handleSavedDeviceClick(dev)}
                      className="hover:bg-purple-900/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-bold text-white group-hover:text-space-accent">
                        {dev.name || dev.comment || 'راوتر مايكروتك'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-space-cyan">
                        {dev.connectionType === 'ip' ? dev.ip : dev.domain}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono">{dev.username}</td>
                      <td className="py-2.5 px-3 font-mono text-purple-300">{dev.port}</td>
                      <td className="py-2.5 px-3">
                        {dev.turboMode ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-950/60 text-space-pink border border-pink-500/30 font-bold">
                            Turbo
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">عادي</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-purple-300">
                        {dev.lastConnected ? new Date(dev.lastConnected).toLocaleDateString('ar-EG') : '---'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedDevice(e, dev.id)}
                          title="حذف الجهاز المحفوظ"
                          className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
