import React from 'react';
import {
  WifiOff,
  LayoutDashboard,
  LayoutTemplate,
  CreditCard,
  Sliders,
  History,
  Store,
  ShieldAlert,
  Server,
  Cpu,
  Layers,
  LogOut,
  Users,
} from 'lucide-react';
import { RouterOSInfo } from '../../../shared/types';

export type AppView =
  | 'login'
  | 'dashboard'
  | 'usermanager'
  | 'generator'
  | 'profiles'
  | 'templates'
  | 'archive'
  | 'pos';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  isConnected: boolean;
  routerInfo: RouterOSInfo | null;
  onDisconnect: () => void;
  onOpenFirewallModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isConnected,
  routerInfo,
  onDisconnect,
  onOpenFirewallModal,
}) => {
  return (
    <header className="h-16 bg-space-darker/95 border-b border-space-border/60 px-4 flex items-center justify-between select-none z-30 shrink-0 gap-2">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 via-pink-600 to-indigo-600 flex items-center justify-center shadow-neon-purple p-1">
          <Layers className="w-5 h-5 text-white animate-pulse-slow" />
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-space-cyan">
              NetCard Manager
            </h1>
            <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-space-accent/20 text-space-accent border border-space-accent/30">
              Pro v2.0
            </span>
          </div>
          <p className="text-[10px] text-purple-300/70">إدارة كروت المايكروتك والطباعة الاحترافية</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-space-darkest/90 p-1 rounded-xl border border-space-border/50 overflow-x-auto scrollbar-none">
        {/* Toggle between Login and Dashboard based on connection status */}
        {!isConnected ? (
          <button
            onClick={() => onNavigate('login')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              currentView === 'login'
                ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
                : 'text-purple-200 hover:text-white hover:bg-space-card'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>الاتصال والأجهزة</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              currentView === 'dashboard'
                ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
                : 'text-purple-200 hover:text-white hover:bg-space-card'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>لوحة التحكم (Dashboard)</span>
          </button>
        )}

        {isConnected && routerInfo?.majorVersion === 7 && (
          <button
            onClick={() => onNavigate('usermanager')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              currentView === 'usermanager'
                ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
                : 'text-purple-200 hover:text-white hover:bg-space-card'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-space-pink" />
            <span>يوزر مانجر (User Manager v7)</span>
          </button>
        )}

        <button
          onClick={() => onNavigate('generator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            currentView === 'generator'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>توليد وطباعة الكروت</span>
        </button>

        <button
          onClick={() => onNavigate('profiles')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            currentView === 'profiles'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>إدارة الباقات</span>
        </button>

        <button
          onClick={() => onNavigate('templates')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            currentView === 'templates'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          <span>مصمم القوالب</span>
        </button>

        <button
          onClick={() => onNavigate('pos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            currentView === 'pos'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>نقاط البيع</span>
        </button>

        <button
          onClick={() => onNavigate('archive')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            currentView === 'archive'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>الأرشيف والسجل</span>
        </button>
      </nav>

      {/* Router Status & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Anti-Guessing Shield Quick Access */}
        <button
          onClick={onOpenFirewallModal}
          title="توليد قواعد حماية الهوت سبوت من التخمين"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60 text-xs font-bold transition-all shadow-neon-emerald whitespace-nowrap shrink-0"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>حماية التخمين</span>
        </button>

        {isConnected && routerInfo ? (
          <div className="flex items-center gap-2 bg-space-card/90 border border-space-borderLight px-2.5 py-1 rounded-xl whitespace-nowrap shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-emerald-400">متصل</span>
            </div>

            <div className="h-3 w-px bg-space-border" />

            <div className="flex items-center gap-1.5 text-[11px] text-purple-200 font-mono">
              <span className="px-1 py-0.2 rounded bg-purple-900/80 text-space-pink font-bold border border-pink-500/40 text-[10px]">
                v{routerInfo.version}
              </span>
              <span className="text-space-cyan font-bold max-w-[130px] truncate" title={routerInfo.boardName}>
                {routerInfo.boardName}
              </span>
              <span className="hidden lg:flex items-center gap-0.5 text-slate-300 text-[10px]">
                <Cpu className="w-3 h-3 text-purple-400" />
                {routerInfo.cpuLoad}
              </span>
            </div>

            <button
              onClick={onDisconnect}
              title="تسجيل الخروج من الراوتر"
              className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 px-2.5 py-1 rounded-xl text-red-400 text-xs font-bold whitespace-nowrap shrink-0">
            <WifiOff className="w-3.5 h-3.5" />
            <span>غير متصل</span>
          </div>
        )}
      </div>
    </header>
  );
};
