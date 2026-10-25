import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { GeneratedCard } from '../../../shared/types';

export const CardArchiveView: React.FC = () => {
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'printed' | 'unprinted'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadArchive();
  }, []);

  const loadArchive = async () => {
    setIsLoading(true);
    try {
      if (window.netcardAPI) {
        const list = await window.netcardAPI.getCardsArchive();
        setCards(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePrinted = async (card: GeneratedCard) => {
    if (!card.id || !window.netcardAPI) return;
    const newStatus = !card.isPrinted;
    await window.netcardAPI.updateCardPrintedStatus([card.id], newStatus);
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, isPrinted: newStatus } : c))
    );
  };

  const filteredCards = cards.filter((c) => {
    const matchesSearch =
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.profile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.batchId.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'printed') return matchesSearch && c.isPrinted;
    if (filterStatus === 'unprinted') return matchesSearch && !c.isPrinted;
    return matchesSearch;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 gap-3 select-none overflow-hidden">
      {/* Header & Filter Bar */}
      <div className="glass-panel rounded-xl px-4 py-2.5 flex items-center justify-between border border-space-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-space-pink" />
            <h2 className="text-xs font-bold text-white">سجل وأرشيف الكروت المولدة</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-space-card text-purple-300">
              {filteredCards.length} كرت
            </span>
          </div>

          {/* Search box */}
          <div className="flex items-center bg-space-darkest rounded-lg px-2.5 py-1 border border-space-border">
            <Search className="w-3.5 h-3.5 text-purple-400 ml-1.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالرمز أو السيريال أو الباقة..."
              className="bg-transparent text-xs text-white focus:outline-none w-56"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-space-darkest rounded-lg p-0.5 border border-space-border text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterStatus === 'all' ? 'bg-space-accent text-white font-bold' : 'text-purple-300'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterStatus('printed')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterStatus === 'printed' ? 'bg-space-accent text-white font-bold' : 'text-purple-300'
              }`}
            >
              المطبوع
            </button>
            <button
              onClick={() => setFilterStatus('unprinted')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterStatus === 'unprinted' ? 'bg-space-accent text-white font-bold' : 'text-purple-300'
              }`}
            >
              غير المطبوع
            </button>
          </div>
        </div>

        <button
          onClick={loadArchive}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-space-card hover:bg-space-border text-white text-xs font-bold transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Cards Table */}
      <div className="glass-card rounded-2xl p-3 flex-1 overflow-x-auto overflow-y-auto border border-space-border/60">
        <table className="w-full text-right text-xs">
          <thead className="bg-space-darkest text-purple-300 font-bold border-b border-space-border sticky top-0">
            <tr>
              <th className="py-2.5 px-3">الدفعة (Batch)</th>
              <th className="py-2.5 px-3">الرقم التسلسلي</th>
              <th className="py-2.5 px-3">اسم المستخدم</th>
              <th className="py-2.5 px-3">كلمة السر</th>
              <th className="py-2.5 px-3">الباقة</th>
              <th className="py-2.5 px-3">السعر</th>
              <th className="py-2.5 px-3">النوع</th>
              <th className="py-2.5 px-3">تاريخ الإنشاء</th>
              <th className="py-2.5 px-3 text-center">حالة الطباعة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-border/30">
            {filteredCards.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-purple-400">
                  لا توجد كروت في السجل تطابق البحث الحالي
                </td>
              </tr>
            ) : (
              filteredCards.map((card) => (
                <tr key={card.id || card.username} className="hover:bg-purple-900/20">
                  <td className="py-2 px-3 font-mono text-purple-400 text-[11px]">{card.batchId}</td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-300">{card.serial}</td>
                  <td className="py-2 px-3 font-mono font-bold text-space-cyan">{card.username}</td>
                  <td className="py-2 px-3 font-mono text-white">{card.password || '---'}</td>
                  <td className="py-2 px-3 font-bold text-space-pink">{card.profile}</td>
                  <td className="py-2 px-3 font-mono font-bold text-white">
                    {card.price} {card.currency}
                  </td>
                  <td className="py-2 px-3 text-purple-300">
                    {card.mode === 'hotspot' ? 'هوت سبوت' : card.mode === 'usermanager' ? 'يوزر مانجر' : 'برودباند'}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-purple-400">
                    {new Date(card.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => handleTogglePrinted(card)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        card.isPrinted
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {card.isPrinted ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>مطبوع</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>غير مطبوع</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
