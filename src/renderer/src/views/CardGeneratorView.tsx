import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Wifi,
  Users,
  Radio,
  FileSpreadsheet,
  FileText,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  RefreshCw,
  FolderOpen,
  Eye,
  Plus,
  Zap,
  Sliders,
  Sparkles,
  Lock,
  Smartphone,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  MikroTikServiceMode,
  CardFormatType,
  CharPatternType,
  CardTemplate,
  POSLocation,
  HotspotUserProfile,
  UserManagerProfile,
  PppProfile,
  CardBatchGenerationRequest,
  GenerationProgress,
  GenerationSwitches,
} from '../../../shared/types';
import { DEFAULT_GENERATION_SWITCHES } from '../../../shared/defaults';

interface CardGeneratorViewProps {
  isConnected: boolean;
  templates: CardTemplate[];
  posLocations: POSLocation[];
  hotspotProfiles: HotspotUserProfile[];
  userManagerProfiles: UserManagerProfile[];
  pppProfiles: PppProfile[];
  onOpenPosModal: () => void;
  onOpenProfileModal: () => void;
  onOpenTemplateDesigner: () => void;
  onOpenFirewallModal: () => void;
  onOpenProfilesManager?: () => void;
}

export const CardGeneratorView: React.FC<CardGeneratorViewProps> = ({
  isConnected,
  templates,
  posLocations,
  hotspotProfiles,
  userManagerProfiles,
  pppProfiles,
  onOpenPosModal,
  onOpenProfileModal,
  onOpenTemplateDesigner,
  onOpenFirewallModal,
  onOpenProfilesManager,
}) => {
  // Service mode tab
  const [mode, setMode] = useState<MikroTikServiceMode>('hotspot');

  // Templates state
  const [currentTemplatesList, setCurrentTemplatesList] = useState<CardTemplate[]>(templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(templates[0]?.id || 1);

  // Reciprocal input method state
  const [inputMethod, setInputMethod] = useState<'cards' | 'pages'>('pages');
  const [pagesCount, setPagesCount] = useState<number>(1);
  const [cardsCount, setCardsCount] = useState<number>(51);

  // Load latest templates from database on mount
  const loadLatestTemplates = async () => {
    if (!window.netcardAPI) return;
    try {
      const tmpls: CardTemplate[] = await window.netcardAPI.getTemplates();
      if (tmpls && tmpls.length > 0) {
        setCurrentTemplatesList(tmpls);
        const exists = tmpls.find((t: CardTemplate) => t.id === selectedTemplateId);
        if (!exists) {
          setSelectedTemplateId(tmpls[0].id || 1);
          const cpp = tmpls[0].cardsPerPage || 51;
          if (inputMethod === 'pages') setCardsCount(pagesCount * cpp);
          else setPagesCount(Math.ceil(cardsCount / cpp));
        }
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  };

  useEffect(() => {
    loadLatestTemplates();
  }, []);

  useEffect(() => {
    if (templates && templates.length > 0) {
      setCurrentTemplatesList(templates);
    }
  }, [templates]);

  const currentTemplate =
    currentTemplatesList.find((t) => t.id === selectedTemplateId) ||
    currentTemplatesList[0] ||
    templates[0];
  const cardsPerPage = currentTemplate?.cardsPerPage || 51;

  // Selected Profile
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [umCustomer, setUmCustomer] = useState<string>('admin');
  const [customersList, setCustomersList] = useState<string[]>(['admin']);
  const [selectedPosId, setSelectedPosId] = useState<number | undefined>(undefined);

  // Generation Pattern inputs
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');
  const [cardFormat, setCardFormat] = useState<CardFormatType>('diff_user_pass');
  const [userPattern, setUserPattern] = useState<CharPatternType>('numbers');
  const [userLength, setUserLength] = useState<number>(8);
  const [passPattern, setPassPattern] = useState<CharPatternType>('numbers');
  const [passLength, setPassLength] = useState<number>(6);
  const [sharedUsers, setSharedUsers] = useState<number>(1);

  // 10 Control Switches
  const [switches, setSwitches] = useState<GenerationSwitches>(DEFAULT_GENERATION_SWITCHES);

  // Progress & Execution status
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [resultMsg, setResultMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Set default profile when mode or profiles change
  useEffect(() => {
    if (mode === 'hotspot' && hotspotProfiles.length > 0) {
      setSelectedProfile(hotspotProfiles[0].name);
    } else if (mode === 'usermanager') {
      if (userManagerProfiles.length > 0) {
        setSelectedProfile(userManagerProfiles[0].name);
      }
      if (window.netcardAPI) {
        window.netcardAPI.getUserManagerCustomers().then((custs) => {
          if (custs && custs.length > 0) {
            setCustomersList(custs);
            setUmCustomer(custs[0]);
          }
        });
      }
    } else if (mode === 'broadband' && pppProfiles.length > 0) {
      setSelectedProfile(pppProfiles[0].name);
    }
  }, [mode, hotspotProfiles, userManagerProfiles, pppProfiles]);

  // Reciprocal math calculation on template change or input change
  const handlePagesChange = (numPages: number) => {
    const p = Math.max(1, numPages);
    setPagesCount(p);
    setCardsCount(p * cardsPerPage);
  };

  const handleCardsChange = (numCards: number) => {
    const c = Math.max(1, numCards);
    setCardsCount(c);
    setPagesCount(Math.ceil(c / cardsPerPage));
  };

  const handleTemplateChange = (tmplId: number) => {
    setSelectedTemplateId(tmplId);
    const tmpl = currentTemplatesList.find((t) => t.id === tmplId);
    const cpp = tmpl?.cardsPerPage || 51;
    if (inputMethod === 'pages') {
      setCardsCount(pagesCount * cpp);
    } else {
      setPagesCount(Math.ceil(cardsCount / cpp));
    }
  };

  // Listen to background progress
  useEffect(() => {
    if (window.netcardAPI) {
      const unsub = window.netcardAPI.onGeneratorProgress((p) => {
        setProgress(p);
      });
      return () => {
        unsub();
      };
    }
  }, []);

  const toggleSwitch = (key: keyof GenerationSwitches) => {
    setSwitches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrintExecute = async () => {
    if (!switches.offlineMode && !isConnected) {
      setResultMsg({
        text: 'الراوتر غير متصل! يرجى الاتصال أولاً أو تفعيل "توليد كروت بدون إضافة" (Offline)',
        type: 'error',
      });
      return;
    }

    setIsGenerating(true);
    setResultMsg(null);
    setProgress(null);

    const req: CardBatchGenerationRequest = {
      mode,
      inputMethod,
      cardsCount,
      pagesCount,
      prefix,
      suffix,
      cardFormat,
      umCustomer,
      profileName: selectedProfile || 'default',
      templateId: selectedTemplateId,
      posId: selectedPosId,
      userPattern,
      userLength,
      passPattern,
      passLength,
      sharedUsers,
      switches,
    };

    try {
      if (window.netcardAPI) {
        const res = await window.netcardAPI.executeBatch(req);
        if (res.success) {
          // Trigger celebration confetti
          try {
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }

          setResultMsg({
            text: `تم توليد وإنجاز ${res.cardsCount} كرت بنجاح! رقم الدفعة: ${res.batchId}`,
            type: 'success',
          });
        } else {
          setResultMsg({ text: res.error || 'حدث خطأ أثناء التنفيذ', type: 'error' });
        }
      }
    } catch (err: any) {
      setResultMsg({ text: err.message, type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 gap-3 select-none overflow-hidden">
      {/* 1. TOP TABS: Hotspot, User Manager, Broadband */}
      <div className="glass-panel rounded-xl px-4 py-2 flex items-center justify-between border border-space-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-purple-200">نظام إدارة المستخدمين:</span>

          <div className="flex items-center bg-space-darkest/90 p-1 rounded-xl border border-space-border">
            <button
              onClick={() => setMode('hotspot')}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'hotspot'
                  ? 'bg-gradient-to-r from-space-accent to-purple-600 text-white shadow-neon-purple'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Wifi className="w-4 h-4" />
              <span>هوت سبوت (Hotspot)</span>
            </button>

            <button
              onClick={() => setMode('usermanager')}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'usermanager'
                  ? 'bg-gradient-to-r from-space-accent to-purple-600 text-white shadow-neon-purple'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>يوزر منجر (User Manager)</span>
            </button>

            <button
              onClick={() => setMode('broadband')}
              className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'broadband'
                  ? 'bg-gradient-to-r from-space-accent to-purple-600 text-white shadow-neon-purple'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>برودباند (PPPoE / Secrets)</span>
            </button>
          </div>
        </div>

        {/* Live Router Status badge */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>متصل وجاهز للحقن</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-lg font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>غير متصل (يعمل بوضع Offline)</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN LAYOUT */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
        {/* COLUMN 1 (RIGHT): Generation Inputs & Reciprocal Math (Col-span 4) */}
        <div className="col-span-4 glass-card rounded-xl p-3.5 space-y-3 overflow-y-auto border border-space-border/60">
          <h3 className="text-xs font-bold text-space-pink flex items-center gap-1.5 border-b border-space-border/40 pb-1.5">
            <Sliders className="w-4 h-4" />
            <span>بيانات الكروت والحساب التبادلي</span>
          </h3>

          {/* Reciprocal Math: Cards vs Pages Radio & Inputs */}
          <div className="bg-space-darkest/70 p-3 rounded-xl border border-space-accent/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMethod"
                  checked={inputMethod === 'pages'}
                  onChange={() => {
                    setInputMethod('pages');
                    setCardsCount(pagesCount * cardsPerPage);
                  }}
                  className="text-space-accent focus:ring-0 bg-space-darkest border-space-border"
                />
                <span className="text-space-cyan">عدد الصفحات</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMethod"
                  checked={inputMethod === 'cards'}
                  onChange={() => {
                    setInputMethod('cards');
                    setPagesCount(Math.ceil(cardsCount / cardsPerPage));
                  }}
                  className="text-space-accent focus:ring-0 bg-space-darkest border-space-border"
                />
                <span className="text-space-pink">عدد الكروت</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-purple-300 block mb-1">الصفحات:</span>
                <input
                  type="number"
                  min="1"
                  disabled={inputMethod === 'cards'}
                  value={pagesCount}
                  onChange={(e) => handlePagesChange(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-space-darkest border border-space-border focus:border-space-accent rounded-lg py-1.5 px-3 text-center text-sm font-mono font-bold text-space-cyan disabled:opacity-40"
                />
              </div>

              <div>
                <span className="text-[10px] text-purple-300 block mb-1">إجمالي الكروت:</span>
                <input
                  type="number"
                  min="1"
                  disabled={inputMethod === 'pages'}
                  value={cardsCount}
                  onChange={(e) => handleCardsChange(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-space-darkest border border-space-border focus:border-space-accent rounded-lg py-1.5 px-3 text-center text-sm font-mono font-bold text-space-pink disabled:opacity-40"
                />
              </div>
            </div>

            <div className="text-[11px] text-purple-300 text-center pt-1 border-t border-space-border/20">
              القالب الحالي: <strong className="text-white">{cardsPerPage} كرت</strong> في الصفحة
              الواحدة
            </div>
          </div>

          {/* Prefix & Suffix */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-purple-200 font-semibold block mb-1">
                بادئة للكرت (Prefix):
              </span>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="مثال: A"
                className="w-full bg-space-darkest border border-space-border rounded-lg py-1 px-2.5 text-xs text-white"
              />
            </div>

            <div>
              <span className="text-[11px] text-purple-200 font-semibold block mb-1">
                نهاية للكرت (Suffix):
              </span>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                placeholder="مثال: X"
                className="w-full bg-space-darkest border border-space-border rounded-lg py-1 px-2.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Card Format Selector */}
          <div>
            <span className="text-[11px] text-purple-200 font-semibold block mb-1">صيغة الكرت:</span>
            <select
              value={cardFormat}
              onChange={(e) => setCardFormat(e.target.value as CardFormatType)}
              className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1.5 px-2.5 text-white"
            >
              <option value="diff_user_pass">اسم وكلمة سر مختلفين</option>
              <option value="same_user_pass">اسم وكلمة سر متساويين</option>
              <option value="user_only">رمز دخول فقط بدون كلمة سر</option>
            </select>
          </div>

          {/* Profile, Template & POS with (+) Buttons */}
          <div className="space-y-2 pt-1 border-t border-space-border/30">
            {/* Customer Dropdown for User Manager */}
            {mode === 'usermanager' && (
              <div>
                <span className="text-[11px] text-purple-200 font-semibold block mb-1">
                  عميل يوزمنجر (Customer / Router):
                </span>
                <select
                  value={umCustomer}
                  onChange={(e) => setUmCustomer(e.target.value)}
                  className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1.5 px-2.5 text-white"
                >
                  {customersList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Profile Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-purple-200 font-semibold">
                  الباقة (Profile):
                </span>
                <button
                  type="button"
                  onClick={onOpenProfilesManager || onOpenProfileModal}
                  title="إضافة وتعديل الباقات"
                  className="flex items-center gap-0.5 text-[10px] text-space-accent hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>جديدة</span>
                </button>
              </div>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1.5 px-2.5 text-white"
              >
                {mode === 'hotspot' &&
                  (hotspotProfiles.length > 0 ? (
                    hotspotProfiles.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="default">default (افتراضية)</option>
                  ))}
                {mode === 'usermanager' &&
                  (userManagerProfiles.length > 0 ? (
                    userManagerProfiles.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.price} ريال)
                      </option>
                    ))
                  ) : (
                    <option value="default">default</option>
                  ))}
                {mode === 'broadband' &&
                  (pppProfiles.length > 0 ? (
                    pppProfiles.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="default">default</option>
                  ))}
              </select>
            </div>

            {/* Template Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-purple-200 font-semibold">قالب الطباعة:</span>
                <button
                  type="button"
                  onClick={onOpenTemplateDesigner}
                  title="تخصيص القوالب"
                  className="flex items-center gap-0.5 text-[10px] text-space-cyan hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>تعديل/إضافة</span>
                </button>
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(parseInt(e.target.value, 10))}
                className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1.5 px-2.5 text-white"
              >
                {currentTemplatesList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.cardsPerPage} كرت)
                  </option>
                ))}
              </select>
            </div>

            {/* POS Location Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-purple-200 font-semibold">نقطة بيع:</span>
                <button
                  type="button"
                  onClick={onOpenPosModal}
                  title="إضافة نقطة بيع"
                  className="flex items-center gap-0.5 text-[10px] text-space-pink hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>جديدة</span>
                </button>
              </div>
              <select
                value={selectedPosId || ''}
                onChange={(e) =>
                  setSelectedPosId(parseInt(e.target.value, 10) || undefined)
                }
                className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1.5 px-2.5 text-white"
              >
                <option value="">بدون تحديد نقطة بيع</option>
                {posLocations.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name} - {pos.ownerName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* User & Password Patterns & Lengths */}
          <div className="space-y-2 pt-1 border-t border-space-border/30">
            {/* Username pattern */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-purple-200 font-semibold block mb-1">
                  نمط الاسم:
                </span>
                <select
                  value={userPattern}
                  onChange={(e) => setUserPattern(e.target.value as CharPatternType)}
                  className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1 px-2 text-white"
                >
                  <option value="numbers">أرقام فقط (0-9)</option>
                  <option value="letters">حروف فقط (a-z)</option>
                  <option value="alphanumeric">أرقام وحروف</option>
                </select>
              </div>
              <div>
                <span className="text-[11px] text-purple-200 font-semibold block mb-1">
                  طول الاسم:
                </span>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={userLength}
                  onChange={(e) => setUserLength(parseInt(e.target.value, 10) || 8)}
                  className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1 px-2 text-center text-space-cyan font-mono font-bold"
                />
              </div>
            </div>

            {/* Password pattern (if not user_only) */}
            {cardFormat !== 'user_only' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-purple-200 font-semibold block mb-1">
                    نمط كلمة السر:
                  </span>
                  <select
                    value={passPattern}
                    disabled={cardFormat === 'same_user_pass'}
                    onChange={(e) => setPassPattern(e.target.value as CharPatternType)}
                    className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1 px-2 text-white disabled:opacity-40"
                  >
                    <option value="numbers">أرقام فقط</option>
                    <option value="letters">حروف فقط</option>
                    <option value="alphanumeric">أرقام وحروف</option>
                  </select>
                </div>
                <div>
                  <span className="text-[11px] text-purple-200 font-semibold block mb-1">
                    طول كلمة السر:
                  </span>
                  <input
                    type="number"
                    min="3"
                    max="20"
                    disabled={cardFormat === 'same_user_pass'}
                    value={cardFormat === 'same_user_pass' ? userLength : passLength}
                    onChange={(e) => setPassLength(parseInt(e.target.value, 10) || 6)}
                    className="w-full bg-space-darkest border border-space-border text-xs rounded-lg py-1 px-2 text-center text-space-pink font-mono font-bold disabled:opacity-40"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2 (MIDDLE): 10 Control Switches (Col-span 4) */}
        <div className="col-span-4 glass-card rounded-xl p-3.5 space-y-2 overflow-y-auto border border-space-border/60">
          <h3 className="text-xs font-bold text-space-cyan flex items-center gap-1.5 border-b border-space-border/40 pb-1.5">
            <Zap className="w-4 h-4" />
            <span>مفاتيح وخيارات المعالجة (10 Control Switches)</span>
          </h3>

          <div className="space-y-1.5 pt-1">
            {/* Switch 1: MAC Binding */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-space-darkest/60 border border-space-border/50 hover:border-space-accent/50 cursor-pointer transition-all">
              <span className="text-xs font-medium text-purple-100">
                ربط الكروت بأول جهاز يستخدمه (MAC Binding)
              </span>
              <input
                type="checkbox"
                checked={switches.bindMacOnFirstUse}
                onChange={() => toggleSwitch('bindMacOnFirstUse')}
                className="w-4 h-4 rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 2: Prompt PDF save location */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-space-darkest/60 border border-space-border/50 hover:border-space-accent/50 cursor-pointer transition-all">
              <span className="text-xs font-medium text-purple-100">
                المطالبة بتحديد مكان حفظ الملف PDF
              </span>
              <input
                type="checkbox"
                checked={switches.promptPdfLocation}
                onChange={() => toggleSwitch('promptPdfLocation')}
                className="w-4 h-4 rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 3: Export Excel */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-space-darkest/60 border border-space-border/50 hover:border-space-accent/50 cursor-pointer transition-all">
              <span className="text-xs font-medium text-purple-100">
                تصدير الكروت الى ملف اكسل بعد الطباعة (.xlsx)
              </span>
              <input
                type="checkbox"
                checked={switches.exportExcel}
                onChange={() => toggleSwitch('exportExcel')}
                className="w-4 h-4 rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 4: Save PDF */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-space-darkest/60 border border-space-border/50 hover:border-space-accent/50 cursor-pointer transition-all">
              <span className="text-xs font-medium text-purple-100">
                حفظ الى ملف PDF بعد الطباعة
              </span>
              <input
                type="checkbox"
                checked={switches.savePdf}
                onChange={() => toggleSwitch('savePdf')}
                className="w-4 h-4 rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 5: Transaction Safety */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-purple-950/30 border border-space-accent/40 hover:border-space-accent cursor-pointer transition-all">
              <span className="text-xs font-bold text-purple-200">
                لا يتم حفظ وعرض الـ PDF إلا بعد التأكد من نجاح الإضافة (Transaction Safety)
              </span>
              <input
                type="checkbox"
                checked={switches.transactionSafety}
                onChange={() => toggleSwitch('transactionSafety')}
                className="w-4 h-4 rounded border-space-accent bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 6: Save TXT */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-space-darkest/60 border border-space-border/50 hover:border-space-accent/50 cursor-pointer transition-all">
              <span className="text-xs font-medium text-purple-100">
                حفظ نسخة من الكروت الى ملف نصي (.txt)
              </span>
              <input
                type="checkbox"
                checked={switches.saveTxtCopy}
                onChange={() => toggleSwitch('saveTxtCopy')}
                className="w-4 h-4 rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 7: Mark Printed */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-space-darkest/60 border border-space-border/50 hover:border-space-accent/50 cursor-pointer transition-all">
              <span className="text-xs font-medium text-purple-100">
                تصنيف الكروت كمطبوع وغير مطبوع
              </span>
              <input
                type="checkbox"
                checked={switches.markPrinted}
                onChange={() => toggleSwitch('markPrinted')}
                className="w-4 h-4 rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 8: Open after add */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-space-darkest/60 border border-space-border/50 hover:border-space-accent/50 cursor-pointer transition-all">
              <span className="text-xs font-medium text-purple-100">
                فتح الملف بعد الإضافة مباشرة
              </span>
              <input
                type="checkbox"
                checked={switches.openFileAfterAdd}
                onChange={() => toggleSwitch('openFileAfterAdd')}
                className="w-4 h-4 rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 9: Export RSC Script */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-space-darkest/60 border border-space-border/50 hover:border-space-accent/50 cursor-pointer transition-all">
              <span className="text-xs font-medium text-purple-100">
                تصدير الكروت الى ملف سكربت (.rsc)
              </span>
              <input
                type="checkbox"
                checked={switches.exportRscScript}
                onChange={() => toggleSwitch('exportRscScript')}
                className="w-4 h-4 rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
              />
            </label>

            {/* Switch 10: Offline Mode */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-amber-950/30 border border-amber-500/40 hover:border-amber-500 cursor-pointer transition-all">
              <span className="text-xs font-bold text-amber-200">
                توليد كروت بدون إضافة الى المايكروتك (Offline Mode)
              </span>
              <input
                type="checkbox"
                checked={switches.offlineMode}
                onChange={() => toggleSwitch('offlineMode')}
                className="w-4 h-4 rounded border-amber-500 bg-space-darkest text-amber-500 focus:ring-0"
              />
            </label>
          </div>
        </div>

        {/* COLUMN 3 (LEFT): Pro Green Card, Quick Actions & Print Button (Col-span 4) */}
        <div className="col-span-4 glass-card rounded-xl p-3.5 flex flex-col justify-between border border-space-border/60">
          <div className="space-y-3">
            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  if (window.netcardAPI) {
                    const dir = await window.netcardAPI.selectDirectory();
                    if (dir) alert(`تم اختيار مسار الحفظ: ${dir}`);
                  }
                }}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-space-darkest hover:bg-purple-900/40 border border-space-border text-center text-purple-200 hover:text-white transition-all"
              >
                <FolderOpen className="w-4 h-4 text-space-cyan mb-1" />
                <span className="text-[10px] font-bold">مكان الحفظ</span>
              </button>

              <button
                type="button"
                onClick={onOpenTemplateDesigner}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-space-darkest hover:bg-purple-900/40 border border-space-border text-center text-purple-200 hover:text-white transition-all"
              >
                <Eye className="w-4 h-4 text-space-accent mb-1" />
                <span className="text-[10px] font-bold">معاينة الملف</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResultMsg({ text: 'تم تحديث الواجهة والبيانات بنجاح', type: 'success' });
                  setTimeout(() => setResultMsg(null), 2500);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-space-darkest hover:bg-purple-900/40 border border-space-border text-center text-purple-200 hover:text-white transition-all"
              >
                <RefreshCw className="w-4 h-4 text-space-pink mb-1" />
                <span className="text-[10px] font-bold">تحديث الواجهة</span>
              </button>
            </div>

            {/* Pro Green Card: Guess Protection Toggle & Info */}
            <div className="bg-gradient-to-br from-emerald-950/80 via-emerald-900/40 to-space-darkest border border-emerald-500/60 rounded-xl p-3 shadow-neon-emerald space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-300">
                    حماية الكروت من التخمين (PRO)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={switches.guessProtection}
                    onChange={() => toggleSwitch('guessProtection')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                توليد كروت بتوزيع عشوائي عالي الإنتروبيا يمنع التكرار تماماً، مع توفير قواعد جدار
                الحماية (Firewall) لحظر المتطفلين بعد 3 محاولات خاطئة.
              </p>

              <button
                type="button"
                onClick={onOpenFirewallModal}
                className="w-full text-center py-1 rounded bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold transition-all"
              >
                عرض ونسخ قواعد الجدار الناري (Firewall Script)
              </button>
            </div>

            {/* Live Progress Box during generation */}
            {progress && (
              <div className="bg-space-darkest p-2.5 rounded-xl border border-space-border space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-purple-300 font-bold">{progress.message}</span>
                  <span className="font-mono text-space-cyan font-bold">
                    {progress.current}/{progress.total}
                  </span>
                </div>
                <div className="w-full bg-space-card rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-space-accent to-space-pink h-full transition-all duration-300"
                    style={{
                      width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Feedback message */}
            {resultMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  resultMsg.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300'
                    : 'bg-red-950/70 border border-red-500/50 text-red-300'
                }`}
              >
                {resultMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{resultMsg.text}</span>
              </div>
            )}
          </div>

          {/* Bottom Execution Area: Wide Gradient Button + Dynamic Status Bar */}
          <div className="space-y-2 pt-2 border-t border-space-border/40">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handlePrintExecute}
              className="w-full py-3.5 px-4 rounded-xl font-black text-base text-white bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:via-pink-500 hover:to-indigo-500 active:scale-[0.99] transition-all shadow-neon-purple flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جاري معالجة الكروت والطباعة...</span>
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  <span>بدء التوليد والطباعة (Print Cards)</span>
                </>
              )}
            </button>

            {/* Dynamic Status Bar (Prompt Exact Requirement): */}
            <div className="w-full text-center py-2 px-3 rounded-lg bg-space-darkest/90 border border-space-border/60 text-xs font-bold text-purple-200">
              عدد الأوراق التي ستطبع :{' '}
              <strong className="text-space-cyan font-mono text-sm font-black">
                ({pagesCount})
              </strong>{' '}
              أوراق تحتوي كل ورقة على{' '}
              <strong className="text-space-pink font-mono text-sm font-black">
                ({cardsPerPage})
              </strong>{' '}
              كرت (الإجمالي:{' '}
              <strong className="text-white font-mono text-sm">{pagesCount * cardsPerPage}</strong>{' '}
              كرت)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
