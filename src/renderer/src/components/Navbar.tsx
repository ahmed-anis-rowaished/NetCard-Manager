import React from 'react';
import {
  Wifi,
  WifiOff,
  LayoutTemplate,
  CreditCard,
  History,
  Store,
  ShieldAlert,
  Server,
  Cpu,
  Layers,
  LogOut,
} from 'lucide-react';
import { RouterOSInfo } from '../../../shared/types';

interface NavbarProps {
  currentView: 'login' | 'generator' | 'templates' | 'archive' | 'pos';
  onNavigate: (view: 'login' | 'generator' | 'templates' | 'archive' | 'pos') => void;
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
    <header className="h-16 bg-space-darker/90 border-b border-space-border/60 px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 via-pink-600 to-indigo-600 flex items-center justify-center shadow-neon-purple p-1">
          <Layers className="w-6 h-6 text-white animate-pulse-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-space-cyan">
              NetCard Manager
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-space-accent/20 text-space-accent border border-space-accent/30">
              Pro v2.0
            </span>
          </div>
          <p className="text-[11px] text-purple-300/70">مدير كروت المايكروتك والطباعة الذكية</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1.5 bg-space-darkest/80 p-1 rounded-xl border border-space-border/50">
        <button
          onClick={() => onNavigate('login')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentView === 'login'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>الاتصال والأجهزة</span>
        </button>

        <button
          onClick={() => onNavigate('generator')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentView === 'generator'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>توليد وطباعة الكروت</span>
        </button>

        <button
          onClick={() => onNavigate('templates')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentView === 'templates'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          <span>مصمم القوالب</span>
        </button>

        <button
          onClick={() => onNavigate('pos')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentView === 'pos'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>نقاط البيع</span>
        </button>

        <button
          onClick={() => onNavigate('archive')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentView === 'archive'
              ? 'bg-gradient-to-r from-space-accent to-space-pink text-white shadow-neon-purple'
              : 'text-purple-200 hover:text-white hover:bg-space-card'
          }`}
        >
          <History className="w-4 h-4" />
          <span>الأرشيف والسجل</span>
        </button>
      </nav>

      {/* Router Status & Actions */}
      <div className="flex items-center gap-3">
        {/* Anti-Guessing Shield Quick Access */}
        <button
          onClick={onOpenFirewallModal}
          title="توليد قواعد حماية الهوت سبوت من التخمين"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-900/60 text-xs font-bold transition-all shadow-neon-emerald"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>حماية التخمين</span>
        </button>

        {isConnected && routerInfo ? (
          <div className="flex items-center gap-2.5 bg-space-card/80 border border-space-borderLight px-3 py-1 rounded-xl">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-400">متصل بالراوتر</span>
            </div>

            <div className="h-4 w-px bg-space-border" />

            <div className="flex items-center gap-1.5 text-xs text-purple-200 font-mono">
              <span className="px-1.5 py-0.2 rounded bg-purple-900/80 text-space-pink font-bold border border-pink-500/40">
                v{routerInfo.version}
              </span>
              <span className="text-space-cyan font-bold">{routerInfo.boardName}</span>
              <span className="flex items-center gap-0.5 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                {routerInfo.cpuLoad}
              </span>
            </div>

            <button
              onClick={onDisconnect}
              title="قطع الاتصال"
              className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 px-3 py-1 rounded-xl text-red-400 text-xs font-bold">
            <WifiOff className="w-4 h-4" />
            <span>غير متصل</span>
          </div>
        )}
      </div>
    </header>
  );
};
