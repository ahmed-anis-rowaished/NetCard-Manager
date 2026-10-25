import React, { useState, useEffect } from 'react';
import { Store, Plus, Trash2, Edit2, X, Check, Phone, MapPin, User, Percent } from 'lucide-react';
import { POSLocation } from '../../../shared/types';

interface PosManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPosUpdated: () => void;
}

export const PosManagementModal: React.FC<PosManagementModalProps> = ({
  isOpen,
  onClose,
  onPosUpdated,
}) => {
  const [locations, setLocations] = useState<POSLocation[]>([]);
  const [editingPos, setEditingPos] = useState<Partial<POSLocation> | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPos();
    }
  }, [isOpen]);

  const loadPos = async () => {
    if (window.netcardAPI) {
      const list = await window.netcardAPI.getPosLocations();
      setLocations(list);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPos?.name || !window.netcardAPI) return;

    await window.netcardAPI.savePosLocation(editingPos as POSLocation);
    setEditingPos(null);
    await loadPos();
    onPosUpdated();
  };

  const handleDelete = async (id?: number) => {
    if (!id || !window.netcardAPI) return;
    if (confirm('هل أنت متأكد من حذف نقطة البيع؟')) {
      await window.netcardAPI.deletePosLocation(id);
      await loadPos();
      onPosUpdated();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-space-dark border border-space-border/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-space-border/60 flex items-center justify-between bg-space-darkest/60">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-space-pink" />
            <h3 className="text-sm font-bold text-white">إدارة نقاط البيع والموزعين (POS Management)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-400 hover:text-white hover:bg-space-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Add / Edit Form */}
          {editingPos ? (
            <form onSubmit={handleSave} className="bg-space-darkest/80 p-4 rounded-xl border border-space-accent/40 space-y-3">
              <h4 className="text-xs font-bold text-space-cyan">
                {editingPos.id ? 'تعديل بيانات نقطة البيع' : 'إضافة نقطة بيع جديدة'}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-purple-300 block mb-1">اسم نقطة البيع:</span>
                  <input
                    type="text"
                    required
                    value={editingPos.name || ''}
                    onChange={(e) => setEditingPos({ ...editingPos, name: e.target.value })}
                    placeholder="بقالة النصر - المحطة"
                    className="w-full bg-space-dark border border-space-border rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-purple-300 block mb-1">اسم المسؤول:</span>
                  <input
                    type="text"
                    value={editingPos.ownerName || ''}
                    onChange={(e) => setEditingPos({ ...editingPos, ownerName: e.target.value })}
                    placeholder="محمد علي"
                    className="w-full bg-space-dark border border-space-border rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-purple-300 block mb-1">رقم الهاتف:</span>
                  <input
                    type="text"
                    value={editingPos.phone || ''}
                    onChange={(e) => setEditingPos({ ...editingPos, phone: e.target.value })}
                    placeholder="777123456"
                    className="w-full bg-space-dark border border-space-border rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-purple-300 block mb-1">نسبة العمولة (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingPos.commissionRate || 0}
                    onChange={(e) =>
                      setEditingPos({
                        ...editingPos,
                        commissionRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-space-dark border border-space-border rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <span className="text-[11px] text-purple-300 block mb-1">العنوان والموقع:</span>
                  <input
                    type="text"
                    value={editingPos.address || ''}
                    onChange={(e) => setEditingPos({ ...editingPos, address: e.target.value })}
                    placeholder="الشارع العام - بجانب الصيدلية"
                    className="w-full bg-space-dark border border-space-border rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPos(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-300 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-space-accent text-white shadow-neon-purple hover:bg-purple-500"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-300">قائمة نقاط البيع المسجلة في النظام:</span>
              <button
                type="button"
                onClick={() =>
                  setEditingPos({
                    name: '',
                    ownerName: '',
                    phone: '',
                    address: '',
                    commissionRate: 5,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-space-accent text-white text-xs font-bold shadow-neon-purple"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نقطة بيع جديدة</span>
              </button>
            </div>
          )}

          {/* POS Table */}
          <div className="overflow-x-auto rounded-xl border border-space-border/60">
            <table className="w-full text-right text-xs">
              <thead className="bg-space-darkest text-purple-300 font-bold border-b border-space-border">
                <tr>
                  <th className="py-2.5 px-3">الاسم</th>
                  <th className="py-2.5 px-3">المسؤول</th>
                  <th className="py-2.5 px-3">الهاتف</th>
                  <th className="py-2.5 px-3">العنوان</th>
                  <th className="py-2.5 px-3">العمولة</th>
                  <th className="py-2.5 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-border/40">
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-purple-400">
                      لا توجد نقاط بيع مسجلة حالياً
                    </td>
                  </tr>
                ) : (
                  locations.map((pos) => (
                    <tr key={pos.id} className="hover:bg-purple-900/20">
                      <td className="py-2.5 px-3 font-bold text-white">{pos.name}</td>
                      <td className="py-2.5 px-3 text-purple-200">{pos.ownerName || '---'}</td>
                      <td className="py-2.5 px-3 font-mono text-space-cyan">{pos.phone || '---'}</td>
                      <td className="py-2.5 px-3 text-slate-300">{pos.address || '---'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-space-pink">
                        {pos.commissionRate}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingPos(pos)}
                            className="p-1 rounded text-purple-300 hover:text-white hover:bg-space-card"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(pos.id)}
                            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
