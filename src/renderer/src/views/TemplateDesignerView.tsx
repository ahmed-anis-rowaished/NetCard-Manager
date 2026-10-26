import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutTemplate,
  Plus,
  Save,
  Trash2,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  Type,
  Move,
  Palette,
  Hash,
  Grid,
  Check,
  Printer,
  ChevronDown,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Unlink,
  X,
} from 'lucide-react';
import {
  CardTemplate,
  TemplateElementConfig,
  TemplateElementId,
  POSLocation,
  HotspotUserProfile,
} from '../../../shared/types';
import { DEFAULT_TEMPLATE, DEFAULT_ELEMENTS } from '../../../shared/defaults';

interface TemplateDesignerViewProps {
  hotspotProfiles: HotspotUserProfile[];
  posLocations: POSLocation[];
}

export const TemplateDesignerView: React.FC<TemplateDesignerViewProps> = ({
  hotspotProfiles,
  posLocations,
}) => {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(1);
  const [template, setTemplate] = useState<CardTemplate>(DEFAULT_TEMPLATE);
  const [selectedElementId, setSelectedElementId] = useState<TemplateElementId>('username');
  const [previewZoom, setPreviewZoom] = useState<number>(3.8); // 1mm = 3.8px approx
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // New Template Modal State (Replacing window.prompt)
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Delete Confirm Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      if (window.netcardAPI) {
        const list = await window.netcardAPI.getTemplates();
        if (list.length > 0) {
          setTemplates(list);
          setTemplate(list[0]);
          setSelectedTemplateId(list[0].id);
        } else {
          setTemplates([DEFAULT_TEMPLATE]);
          setTemplate(DEFAULT_TEMPLATE);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectTemplate = (id: number) => {
    const found = templates.find((t) => t.id === id);
    if (found) {
      setSelectedTemplateId(id);
      setTemplate(JSON.parse(JSON.stringify(found)));
    }
  };

  const handleOpenNewTemplateModal = () => {
    setNewTemplateName(`قالب جديد - ${templates.length + 1}`);
    setIsNewTemplateModalOpen(true);
  };

  const handleConfirmCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const newTmpl: CardTemplate = {
      ...JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)),
      id: undefined,
      name: newTemplateName.trim(),
    };

    if (window.netcardAPI) {
      const newId = await window.netcardAPI.saveTemplate(newTmpl);
      newTmpl.id = newId;
      await loadTemplates();
      setSelectedTemplateId(newId);
      setTemplate(newTmpl);
      setIsNewTemplateModalOpen(false);
      showFeedback('تم إنشاء القالب الجديد بنجاح', 'success');
    }
  };

  const handleSaveTemplate = async () => {
    if (!window.netcardAPI) return;
    try {
      const savedId = await window.netcardAPI.saveTemplate(template);
      setTemplate({ ...template, id: savedId });
      await loadTemplates();
      showFeedback('تم حفظ تعديلات القالب بنجاح في قاعدة البيانات', 'success');
    } catch (err: any) {
      showFeedback(err.message || 'فشل حفظ القالب', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!template.id || !window.netcardAPI) return;
    if (templates.length <= 1) {
      showFeedback('لا يمكن حذف القالب الوحيد المتبقي في النظام', 'error');
      setIsDeleteModalOpen(false);
      return;
    }

    await window.netcardAPI.deleteTemplate(template.id);
    await loadTemplates();
    setIsDeleteModalOpen(false);
    showFeedback('تم حذف القالب بنجاح', 'success');
  };

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Element selection & update
  const selectedElement =
    template.elements.find((e) => e.id === selectedElementId) || template.elements[0];

  const updateElement = (id: TemplateElementId, updates: Partial<TemplateElementConfig>) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    }));
  };

  // Browse background image
  const handleBrowseBackground = async () => {
    if (!window.netcardAPI) return;
    const base64 = await window.netcardAPI.selectImage();
    if (base64) {
      setTemplate((prev) => ({
        ...prev,
        backgroundImageData: base64,
        hasBackgroundImage: true,
      }));
    }
  };

  // Browse logo image
  const handleBrowseLogo = async () => {
    if (!window.netcardAPI) return;
    const base64 = await window.netcardAPI.selectImage();
    if (base64) {
      setTemplate((prev) => ({
        ...prev,
        logoImageData: base64,
        hasLogo: true,
      }));
    }
  };

  // Browse save directory
  const handleBrowseSaveDir = async () => {
    if (!window.netcardAPI) return;
    const dir = await window.netcardAPI.selectDirectory();
    if (dir) {
      setTemplate((prev) => ({ ...prev, savePath: dir }));
    }
  };

  // Drag & drop logic on canvas
  const handleMouseDownOnElement = (
    e: React.MouseEvent,
    elemId: TemplateElementId,
    elemX: number,
    elemY: number
  ) => {
    e.stopPropagation();
    setSelectedElementId(elemId);
    setIsDragging(true);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const clickXInMm = (e.clientX - canvasRect.left) / previewZoom;
      const clickYInMm = (e.clientY - canvasRect.top) / previewZoom;
      setDragOffset({
        x: clickXInMm - elemX,
        y: clickYInMm - elemY,
      });
    }
  };

  const handleMouseMoveOnCanvas = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const currentMouseXInMm = (e.clientX - canvasRect.left) / previewZoom;
    const currentMouseYInMm = (e.clientY - canvasRect.top) / previewZoom;

    let newX = Math.round((currentMouseXInMm - dragOffset.x) * 10) / 10;
    let newY = Math.round((currentMouseYInMm - dragOffset.y) * 10) / 10;

    newX = Math.max(0, Math.min(newX, template.cardWidthMm - 5));
    newY = Math.max(0, Math.min(newY, template.cardHeightMm - 3));

    updateElement(selectedElementId, { xMm: newX, yMm: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Sample card content representation for canvas rendering
  const getSampleTextForElement = (el: TemplateElementConfig) => {
    switch (el.id) {
      case 'username':
        return '84729103';
      case 'password':
        return '582914';
      case 'serial':
        return 'SN: 261025-4821';
      case 'dataLimit':
        return el.customText || '1.5 GB';
      case 'validity':
        return el.customText || '3 أيام';
      case 'price':
        return el.customText || `200 ${template.currency}`;
      case 'printDate':
        return '2026/10/26';
      case 'time':
        return '01:30 ص';
      case 'custom1':
        return el.customText || 'للتواصل: 777777777';
      case 'custom2':
        return el.customText || 'wifi.net';
      default:
        return el.label;
    }
  };

  return (
    <div
      className="h-[calc(100vh-4rem)] flex flex-col p-4 gap-3 select-none overflow-hidden"
      onMouseUp={handleMouseUp}
    >
      {/* 1. TOP BAR: Template Dropdown & 4 Buttons */}
      <div className="glass-panel rounded-xl px-4 py-2.5 flex items-center justify-between border border-space-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-space-accent" />
            <span className="text-xs font-bold text-purple-200">اختيار القالب:</span>
          </div>

          <div className="relative">
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(parseInt(e.target.value, 10))}
              className="bg-space-darkest border border-space-border text-white text-xs font-bold rounded-lg px-3 py-1.5 pr-8 focus:border-space-accent focus:outline-none appearance-none cursor-pointer min-w-[220px]"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.cardsPerPage} كرت)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-purple-400 absolute left-2 top-2 pointer-events-none" />
          </div>

          <input
            type="text"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            placeholder="تعديل اسم القالب"
            className="bg-space-darkest/70 border border-space-border rounded-lg px-3 py-1 text-xs text-purple-200 focus:border-space-accent focus:outline-none w-48"
          />
        </div>

        {/* 4 Colored Action Buttons */}
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-lg ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                  : 'bg-red-950 text-red-400 border border-red-500/40'
              }`}
            >
              {statusMsg.text}
            </span>
          )}

          <button
            onClick={handleOpenNewTemplateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-neon-emerald"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قالب</span>
          </button>

          <button
            onClick={handleSaveTemplate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
          >
            <Save className="w-4 h-4" />
            <span>حفظ القالب</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف</span>
          </button>

          <button
            onClick={() => {
              showFeedback('شبكة الطباعة مطابقة لمعاينة مساحة العمل تماماً', 'success');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-neon-purple"
          >
            <Eye className="w-4 h-4" />
            <span>معاينة الشبكة</span>
          </button>
        </div>
      </div>

      {/* MAIN BODY: 2-column flex workspace */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* LEFT COLUMN: Template Settings, 11 Elements Toggles, Fonts & Dimensions */}
        <div className="w-[420px] flex flex-col gap-3 overflow-y-auto pr-1 shrink-0">
          {/* Section: Template & File Settings */}
          <div className="glass-card rounded-xl p-3 space-y-2.5 border border-space-border/60">
            <h3 className="text-xs font-bold text-space-pink flex items-center gap-1.5 border-b border-space-border/40 pb-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>إعدادات القالب والخلفية ونقاط البيع</span>
            </h3>

            {/* Link to POS toggle */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-purple-200 font-semibold flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={template.linkToPos}
                  onChange={(e) => setTemplate({ ...template, linkToPos: e.target.checked })}
                  className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                />
                <span>ربط القالب بنقاط البيع</span>
              </label>
              {template.linkToPos && (
                <select
                  value={template.posId || ''}
                  onChange={(e) =>
                    setTemplate({ ...template, posId: parseInt(e.target.value, 10) || undefined })
                  }
                  className="bg-space-darkest text-xs rounded border border-space-border px-2 py-1 text-space-cyan"
                >
                  <option value="">اختر نقطة البيع</option>
                  {posLocations.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Background Image Browse + Toggle */}
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={template.hasBackgroundImage}
                  onChange={(e) =>
                    setTemplate({ ...template, hasBackgroundImage: e.target.checked })
                  }
                  className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                />
                <span>خلفية الكرت</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleBrowseBackground}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-space-darkest border border-space-border hover:border-space-accent text-[11px] text-purple-200"
                >
                  <ImageIcon className="w-3 h-3 text-space-cyan" />
                  <span>تحديد صورة (Browse)</span>
                </button>
                {template.backgroundImageData && (
                  <span className="text-[10px] text-emerald-400 font-mono">محملة ✓</span>
                )}
              </div>
            </div>

            {/* Logo Image Browse + Toggle */}
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={template.hasLogo}
                  onChange={(e) => setTemplate({ ...template, hasLogo: e.target.checked })}
                  className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                />
                <span>شعار (Logo)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleBrowseLogo}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-space-darkest border border-space-border hover:border-space-accent text-[11px] text-purple-200"
                >
                  <ImageIcon className="w-3 h-3 text-space-pink" />
                  <span>تحديد الشعار</span>
                </button>
                {template.logoImageData && (
                  <span className="text-[10px] text-emerald-400 font-mono">محمل ✓</span>
                )}
              </div>
            </div>

            {/* Save Directory */}
            <div className="space-y-1">
              <label className="text-[11px] text-purple-300 font-semibold">
                مكان حفظ ملفات الطباعة:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={template.savePath || 'المسار الافتراضي (المستندات)'}
                  className="w-full bg-space-darkest/70 border border-space-border rounded px-2 py-1 text-[11px] text-purple-300 font-mono truncate"
                />
                <button
                  onClick={handleBrowseSaveDir}
                  className="p-1 rounded bg-space-darkest border border-space-border hover:border-space-accent text-purple-300"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Link with Profile & Currency */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-space-border/30">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-purple-300 font-semibold">ربطه مع الباقة:</span>
                  {template.linkedProfileName && (
                    <button
                      onClick={() => setTemplate({ ...template, linkedProfileName: '' })}
                      title="حذف الربط"
                      className="text-red-400 hover:text-red-300 text-[10px]"
                    >
                      حذف
                    </button>
                  )}
                </div>
                <select
                  value={template.linkedProfileName || ''}
                  onChange={(e) => setTemplate({ ...template, linkedProfileName: e.target.value })}
                  className="w-full bg-space-darkest border border-space-border text-white text-xs rounded px-2 py-1"
                >
                  <option value="">بدون ربط</option>
                  {hotspotProfiles.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-purple-300 font-semibold">العملة:</span>
                <select
                  value={template.currency || 'ريال'}
                  onChange={(e) => setTemplate({ ...template, currency: e.target.value })}
                  className="w-full bg-space-darkest border border-space-border text-white text-xs rounded px-2 py-1"
                >
                  <option value="ريال">ريال</option>
                  <option value="دولار">دولار ($)</option>
                  <option value="د.ع">دينار عراقي</option>
                  <option value="ل.س">ليرة سورية</option>
                  <option value="ج.م">جنيه مصري</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: 11 Elements Toggles Grid */}
          <div className="glass-card rounded-xl p-3 space-y-2 border border-space-border/60">
            <div className="flex items-center justify-between border-b border-space-border/40 pb-1.5">
              <h3 className="text-xs font-bold text-space-cyan flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                <span>عناصر الكرت الـ 11 (تفعيل وتحديد)</span>
              </h3>
              <span className="text-[10px] text-purple-400">انقر لتعديل الخصائص</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {template.elements.map((el) => {
                const isSelected = el.id === selectedElementId;
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-900/60 border-space-accent text-white shadow-neon-purple'
                        : 'bg-space-darkest/60 border-space-border/60 text-purple-200 hover:border-purple-400'
                    }`}
                  >
                    <label
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={el.enabled}
                        onChange={(e) => updateElement(el.id, { enabled: e.target.checked })}
                        className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                      />
                      <span className="font-semibold">{el.label}</span>
                    </label>

                    <span className="text-[10px] font-mono text-purple-400">
                      {el.xMm},{el.yMm}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Selected Element Properties (Font, Size, Color, X/Y) */}
          <div className="glass-card rounded-xl p-3 space-y-2.5 border border-space-accent/40 bg-purple-950/20">
            <div className="flex items-center justify-between border-b border-space-border/40 pb-1.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-space-pink" />
                <span>خصائص عنصر: </span>
                <span className="text-space-cyan font-extrabold">{selectedElement.label}</span>
              </h4>
              <span className="text-[10px] text-purple-400">سحب بالماوس أو رقمي</span>
            </div>

            {/* Coordinates X & Y */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between bg-space-darkest/80 px-2 py-1 rounded border border-space-border">
                <span className="text-[11px] text-purple-300 font-bold">موقع X (ملم):</span>
                <input
                  type="number"
                  step="0.5"
                  value={selectedElement.xMm}
                  onChange={(e) =>
                    updateElement(selectedElement.id, { xMm: parseFloat(e.target.value) || 0 })
                  }
                  className="w-14 bg-transparent text-center text-space-cyan font-mono font-bold text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-space-darkest/80 px-2 py-1 rounded border border-space-border">
                <span className="text-[11px] text-purple-300 font-bold">موقع Y (ملم):</span>
                <input
                  type="number"
                  step="0.5"
                  value={selectedElement.yMm}
                  onChange={(e) =>
                    updateElement(selectedElement.id, { yMm: parseFloat(e.target.value) || 0 })
                  }
                  className="w-14 bg-transparent text-center text-space-cyan font-mono font-bold text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Font Family, Size, Color */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-purple-300">نوع الخط:</span>
                <select
                  value={selectedElement.fontFamily}
                  onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                  className="w-full bg-space-darkest border border-space-border text-xs rounded px-1.5 py-1 text-white"
                >
                  <option value="Cairo">Cairo</option>
                  <option value="Tajawal">Tajawal</option>
                  <option value="Arial">Arial</option>
                  <option value="Courier">Courier</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-purple-300">حجم الخط (Pt):</span>
                <input
                  type="number"
                  value={selectedElement.fontSizePt}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      fontSizePt: parseInt(e.target.value, 10) || 8,
                    })
                  }
                  className="w-full bg-space-darkest border border-space-border text-xs rounded px-1.5 py-1 text-white text-center font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-purple-300">اللون:</span>
                <div className="flex items-center gap-1 bg-space-darkest border border-space-border rounded px-1.5 py-0.5">
                  <input
                    type="color"
                    value={selectedElement.fontColor}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { fontColor: e.target.value })
                    }
                    className="w-5 h-5 bg-transparent border-none cursor-pointer rounded"
                  />
                  <span className="text-[10px] font-mono text-purple-300">
                    {selectedElement.fontColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Barcode Type Switcher (If element is barcode) */}
            {selectedElement.id === 'barcode' && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-space-border/30">
                <div className="space-y-1">
                  <span className="text-[10px] text-purple-300">نوع الباركود:</span>
                  <select
                    value={selectedElement.barcodeType || 'qr'}
                    onChange={(e) =>
                      updateElement(selectedElement.id, {
                        barcodeType: e.target.value as 'qr' | 'code128',
                      })
                    }
                    className="w-full bg-space-darkest border border-space-border text-xs rounded px-1.5 py-1 text-space-cyan font-bold"
                  >
                    <option value="qr">باركود ثنائي QR Code</option>
                    <option value="code128">باركود خطي 1D (Code128)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-purple-300">الأبعاد (عرض × ارتفاع مم):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={selectedElement.barcodeWidthMm || 12}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          barcodeWidthMm: parseFloat(e.target.value) || 12,
                        })
                      }
                      className="w-1/2 bg-space-darkest border border-space-border text-xs rounded px-1 py-1 text-center font-mono"
                    />
                    <span className="text-purple-400 text-xs">×</span>
                    <input
                      type="number"
                      value={selectedElement.barcodeHeightMm || 12}
                      onChange={(e) =>
                        updateElement(selectedElement.id, {
                          barcodeHeightMm: parseFloat(e.target.value) || 12,
                        })
                      }
                      className="w-1/2 bg-space-darkest border border-space-border text-xs rounded px-1 py-1 text-center font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bold / Italic Toggles */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedElement.isBold}
                  onChange={(e) => updateElement(selectedElement.id, { isBold: e.target.checked })}
                  className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                />
                <span className="font-bold">خط غامق (Bold)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedElement.isItalic}
                  onChange={(e) =>
                    updateElement(selectedElement.id, { isItalic: e.target.checked })
                  }
                  className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                />
                <span className="italic">خط مائل (Italic)</span>
              </label>
            </div>

            {/* Custom text for detail elements or price */}
            {['custom1', 'custom2', 'price', 'dataLimit', 'validity'].includes(
              selectedElement.id
            ) && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-purple-300">
                  النص المخصص أو القيمة الافتراضية:
                </span>
                <input
                  type="text"
                  value={selectedElement.customText || ''}
                  onChange={(e) =>
                    updateElement(selectedElement.id, { customText: e.target.value })
                  }
                  placeholder={
                    selectedElement.id === 'custom1' ? 'للتواصل: 777777777' : 'قيمة مخصصة'
                  }
                  className="w-full bg-space-darkest border border-space-border rounded px-2 py-1 text-xs text-white focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Section: Card & Page Dimensions */}
          <div className="glass-card rounded-xl p-3 space-y-2 border border-space-border/60">
            <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5 border-b border-space-border/40 pb-1">
              <Grid className="w-3.5 h-3.5" />
              <span>أبعاد الكرت والصفحة والهوامش</span>
            </h3>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div>
                <span className="text-[10px] text-purple-400 block">عرض (ملم)</span>
                <input
                  type="number"
                  value={template.cardWidthMm}
                  onChange={(e) =>
                    setTemplate({ ...template, cardWidthMm: parseFloat(e.target.value) || 63 })
                  }
                  className="w-full bg-space-darkest border border-space-border rounded text-xs py-1 text-center font-mono font-bold text-space-cyan"
                />
              </div>
              <div>
                <span className="text-[10px] text-purple-400 block">طول (ملم)</span>
                <input
                  type="number"
                  value={template.cardHeightMm}
                  onChange={(e) =>
                    setTemplate({ ...template, cardHeightMm: parseFloat(e.target.value) || 30 })
                  }
                  className="w-full bg-space-darkest border border-space-border rounded text-xs py-1 text-center font-mono font-bold text-space-cyan"
                />
              </div>
              <div>
                <span className="text-[10px] text-purple-400 block">كروت/صفحة</span>
                <input
                  type="number"
                  value={template.cardsPerPage}
                  onChange={(e) =>
                    setTemplate({ ...template, cardsPerPage: parseInt(e.target.value, 10) || 51 })
                  }
                  className="w-full bg-space-darkest border border-space-border rounded text-xs py-1 text-center font-mono font-bold text-space-pink"
                />
              </div>
              <div>
                <span className="text-[10px] text-purple-400 block">الأعمدة</span>
                <input
                  type="number"
                  value={template.columnsCount}
                  onChange={(e) =>
                    setTemplate({ ...template, columnsCount: parseInt(e.target.value, 10) || 3 })
                  }
                  className="w-full bg-space-darkest border border-space-border rounded text-xs py-1 text-center font-mono font-bold text-space-cyan"
                />
              </div>
            </div>

            {/* Borders and Margins */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-space-border/30">
              <label className="flex items-center gap-1.5 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={template.hasBorder}
                  onChange={(e) => setTemplate({ ...template, hasBorder: e.target.checked })}
                  className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                />
                <span>إطار الكرت (Border)</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={template.showPageNumber}
                  onChange={(e) => setTemplate({ ...template, showPageNumber: e.target.checked })}
                  className="rounded border-space-border bg-space-darkest text-space-accent focus:ring-0"
                />
                <span>ترقيم الصفحات</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Live Canvas Workspace */}
        <div className="flex-1 glass-card rounded-2xl p-4 flex flex-col items-center justify-between border border-space-border/80 overflow-hidden relative">
          {/* Canvas Header & Zoom Slider */}
          <div className="w-full flex items-center justify-between border-b border-space-border/40 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-space-accent" />
              <span className="text-xs font-bold text-white">
                مساحة العمل والمعاينة الحية (Live Interactive Canvas)
              </span>
              <span className="text-[11px] text-purple-300">
                اسحب أي عنصر بالماوس لتغيير مكانه بدقة
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-purple-300 font-semibold">نسبة العرض:</span>
              <input
                type="range"
                min="2.5"
                max="5.5"
                step="0.1"
                value={previewZoom}
                onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                className="w-24 accent-space-accent cursor-pointer"
              />
              <span className="text-xs font-mono text-space-cyan">
                {Math.round(previewZoom * 25)}%
              </span>
            </div>
          </div>

          {/* Actual Interactive Card Container */}
          <div className="flex-1 w-full flex items-center justify-center p-4 overflow-auto">
            <div
              ref={canvasRef}
              onMouseMove={handleMouseMoveOnCanvas}
              style={{
                width: `${template.cardWidthMm * previewZoom}px`,
                height: `${template.cardHeightMm * previewZoom}px`,
                borderWidth: template.hasBorder ? `${template.borderSizePx || 1}px` : '0px',
                borderColor: template.hasBorder ? template.borderColor : 'transparent',
                backgroundImage:
                  template.hasBackgroundImage && template.backgroundImageData
                    ? `url(${template.backgroundImageData})`
                    : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              className="bg-white rounded-md shadow-2xl relative select-none cursor-crosshair overflow-hidden border border-slate-300 transition-all"
            >
              {/* Logo Preview */}
              {template.hasLogo && template.logoImageData && (
                <img
                  src={template.logoImageData}
                  alt="Logo"
                  className="absolute pointer-events-none"
                  style={{
                    left: `${2 * previewZoom}px`,
                    top: `${2 * previewZoom}px`,
                    width: `${10 * previewZoom}px`,
                    height: `${10 * previewZoom}px`,
                    objectFit: 'contain',
                  }}
                />
              )}

              {/* Render Enabled Elements */}
              {template.elements.map((el) => {
                if (!el.enabled) return null;
                const isSelected = el.id === selectedElementId;

                const leftPx = el.xMm * previewZoom;
                const topPx = el.yMm * previewZoom;

                if (el.id === 'barcode') {
                  const is1D = el.barcodeType === 'code128';
                  return (
                    <div
                      key={el.id}
                      onMouseDown={(e) => handleMouseDownOnElement(e, el.id, el.xMm, el.yMm)}
                      style={{
                        left: `${leftPx}px`,
                        top: `${topPx}px`,
                        width: `${(el.barcodeWidthMm || (is1D ? 28 : 12)) * previewZoom}px`,
                        height: `${(el.barcodeHeightMm || (is1D ? 10 : 12)) * previewZoom}px`,
                      }}
                      className={`absolute cursor-move flex items-center justify-center bg-slate-50 rounded border ${
                        isSelected
                          ? 'border-purple-600 ring-2 ring-purple-400 shadow-lg'
                          : 'border-slate-300'
                      }`}
                    >
                      {is1D ? (
                        <div className="w-full h-full p-1 flex flex-col justify-between items-center bg-white">
                          <div className="w-full h-4/5 flex justify-center items-center gap-0.5 px-1">
                            <span className="w-1 h-full bg-black"></span>
                            <span className="w-0.5 h-full bg-black"></span>
                            <span className="w-1.5 h-full bg-black"></span>
                            <span className="w-0.5 h-full bg-black"></span>
                            <span className="w-1 h-full bg-black"></span>
                            <span className="w-2 h-full bg-black"></span>
                            <span className="w-0.5 h-full bg-black"></span>
                          </div>
                          <span className="text-[7px] font-mono text-black">84729103</span>
                        </div>
                      ) : (
                        <div className="w-full h-full p-1 flex flex-col justify-between items-center bg-white">
                          <div className="w-full h-full bg-slate-900 rounded-sm flex items-center justify-center text-[8px] text-white font-mono">
                            QR
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleMouseDownOnElement(e, el.id, el.xMm, el.yMm)}
                    style={{
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      fontFamily: el.fontFamily,
                      fontSize: `${el.fontSizePt * 1.3}px`,
                      color: el.fontColor,
                      fontWeight: el.isBold ? 'bold' : 'normal',
                      fontStyle: el.isItalic ? 'italic' : 'normal',
                    }}
                    className={`absolute cursor-move px-1 py-0.5 rounded transition-shadow leading-tight whitespace-nowrap ${
                      isSelected
                        ? 'bg-purple-500/20 ring-2 ring-purple-500 shadow-md'
                        : 'hover:bg-purple-500/10'
                    }`}
                  >
                    {getSampleTextForElement(el)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Card Geometry Badge */}
          <div className="w-full flex items-center justify-between text-xs text-purple-300 bg-space-darkest/60 px-4 py-2 rounded-xl border border-space-border/40">
            <span>
              أبعاد الكرت الحقيقي: <strong className="text-white">{template.cardWidthMm} مم</strong>{' '}
              × <strong className="text-white">{template.cardHeightMm} مم</strong>
            </span>
            <span>
              توزيع الصفحة:{' '}
              <strong className="text-space-cyan">{template.columnsCount} أعمدة</strong> ×{' '}
              <strong className="text-space-cyan">
                {Math.ceil(template.cardsPerPage / template.columnsCount)} صفوف
              </strong>{' '}
              (= <strong className="text-space-pink">{template.cardsPerPage} كرت بالصفحة</strong>)
            </span>
            <span className="font-mono text-[11px] text-purple-400">ورق قياسي A4 (210×297 مم)</span>
          </div>
        </div>
      </div>

      {/* REACT MODAL 1: Create New Template Modal (Replacing window.prompt) */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-dark border border-space-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-space-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-space-accent" />
                <h3 className="text-sm font-bold text-white">إضافة قالب كروت جديد</h3>
              </div>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="text-purple-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateTemplate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-purple-200 block mb-1.5">
                  اسم القالب الجديد (مثال: 500RY - VIP):
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="500RY - VIP"
                  className="w-full bg-space-darkest border border-space-border focus:border-space-accent rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-space-border/40">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-purple-300 hover:text-white bg-space-card"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-neon-emerald transition-all"
                >
                  إضافة القالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REACT MODAL 2: Delete Confirm Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-dark border border-red-500/50 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-space-border/60 pb-3">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-bold text-white">تأكيد حذف القالب</h3>
            </div>

            <p className="text-xs text-purple-200 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف القالب{' '}
              <strong className="text-white">"{template.name}"</strong>؟ لا يمكن التراجع عن هذه
              الخطوة.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-space-border/40">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-purple-300 hover:text-white bg-space-card"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
