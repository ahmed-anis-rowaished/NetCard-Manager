import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, X, Terminal, AlertTriangle } from 'lucide-react';

interface FirewallScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirewallScriptModal: React.FC<FirewallScriptModalProps> = ({ isOpen, onClose }) => {
  const [script, setScript] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && window.netcardAPI) {
      window.netcardAPI.getFirewallProtectionScript().then((s) => {
        setScript(s);
      });
    }
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-space-dark border border-emerald-500/60 rounded-2xl w-full max-w-2xl overflow-hidden shadow-neon-emerald flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-space-border/60 flex items-center justify-between bg-emerald-950/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-300">
              سكربت حماية الهوت سبوت من التخمين (MikroTik Anti-Bruteforce Rules)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-purple-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-emerald-200 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>طريقة الاستخدام:</strong> انسخ السكربت أدناه والصقه في Terminal داخل برنامج
              WinBox على المايكروتك. يقوم السكربت بمراقبة محاولات تسجيل الدخول الخاطئة وإدراج عنوان
              IP المتطفل في قائمة الحظر (Blacklist) لمدة 60 دقيقة بعد 3 محاولات فاشلة.
            </div>
          </div>

          <div className="relative">
            <pre className="w-full bg-space-darkest border border-space-border rounded-xl p-4 text-xs font-mono text-purple-200 overflow-x-auto select-text leading-relaxed">
              {script}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-neon-emerald"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ للحافظة ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ السكربت</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-space-border/60 flex justify-end bg-space-darkest/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-space-card hover:bg-space-border text-white text-xs font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
