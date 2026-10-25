import React, { useState } from 'react';
import { Layers, Plus, X, Zap, Check } from 'lucide-react';
import { MikroTikServiceMode } from '../../../shared/types';

interface ProfileManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: MikroTikServiceMode;
  onProfileCreated: () => void;
}

export const ProfileManagementModal: React.FC<ProfileManagementModalProps> = ({
  isOpen,
  onClose,
  mode,
  onProfileCreated,
}) => {
  const [profileName, setProfileName] = useState('');
  const [rateLimit, setRateLimit] = useState('2M/5M');
  const [sharedUsers, setSharedUsers] = useState(1);
  const [validity, setValidity] = useState('3d');
  const [price, setPrice] = useState(200);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName) return;

    // Send or register
    onProfileCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-space-dark border border-space-border/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-space-border/60 flex items-center justify-between bg-space-darkest/60">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-space-accent" />
            <h3 className="text-sm font-bold text-white">إضافة باقة جديدة (Create Profile)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-purple-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <span className="text-[11px] text-purple-300 block mb-1">اسم الباقة (Profile Name):</span>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="مثال: 1GB_3Days"
              className="w-full bg-space-darkest border border-space-border rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-purple-300 block mb-1">معدل السرعة (Rate Limit):</span>
              <input
                type="text"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                placeholder="2M/4M"
                className="w-full bg-space-darkest border border-space-border rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <span className="text-[11px] text-purple-300 block mb-1">المستخدمين (Shared Users):</span>
              <input
                type="number"
                min="1"
                max="10"
                value={sharedUsers}
                onChange={(e) => setSharedUsers(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-space-darkest border border-space-border rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <span className="text-[11px] text-purple-300 block mb-1">الصلاحية (Validity):</span>
              <input
                type="text"
                value={validity}
                onChange={(e) => setValidity(e.target.value)}
                placeholder="3d أو 30d"
                className="w-full bg-space-darkest border border-space-border rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <span className="text-[11px] text-purple-300 block mb-1">السعر:</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                placeholder="200"
                className="w-full bg-space-darkest border border-space-border rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-space-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-300 hover:text-white"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-space-accent text-white shadow-neon-purple hover:bg-purple-500"
            >
              حفظ الباقة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
