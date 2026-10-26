import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  Wifi,
  Users,
  Radio,
  X,
  Check,
  Zap,
  DollarSign,
  Clock,
  Gauge,
  Edit2,
  AlertTriangle,
} from 'lucide-react';
import {
  MikroTikServiceMode,
  HotspotUserProfile,
  UserManagerProfile,
  PppProfile,
  ProfileMetadata,
  CreateProfileParams,
} from '../../../shared/types';

interface ProfilesManagerViewProps {
  isConnected: boolean;
  onRefreshNeeded?: () => void;
}

export const ProfilesManagerView: React.FC<ProfilesManagerViewProps> = ({
  isConnected,
  onRefreshNeeded,
}) => {
  const [activeTab, setActiveTab] = useState<MikroTikServiceMode>('hotspot');
  const [loading, setLoading] = useState(false);

  // Router Profiles
  const [hotspotProfiles, setHotspotProfiles] = useState<HotspotUserProfile[]>([]);
  const [userManagerProfiles, setUserManagerProfiles] = useState<UserManagerProfile[]>([]);
  const [pppProfiles, setPppProfiles] = useState<PppProfile[]>([]);

  // Local Profile Metadata (Price, currency, validity notes)
  const [metadataList, setMetadataList] = useState<ProfileMetadata[]>([]);

  // Modal State for Creating Profile
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProfile, setNewProfile] = useState<CreateProfileParams>({
    mode: 'hotspot',
    name: '',
    rateLimit: '2M/5M',
    sharedUsers: 1,
    sessionTimeout: '',
    validity: '3d',
    transferLimit: '',
    price: 200,
    currency: 'ريال',
  });

  // Modal State for Editing Profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProfileData, setEditProfileData] = useState<{
    id: string;
    originalName: string;
    mode: MikroTikServiceMode;
    rateLimit?: string;
    sharedUsers?: number;
    sessionTimeout?: string;
    validity?: string;
    price?: number;
    currency?: string;
    localAddress?: string;
    remoteAddress?: string;
  }>({
    id: '',
    originalName: '',
    mode: 'hotspot',
    rateLimit: '',
    sharedUsers: 1,
    sessionTimeout: '',
    validity: '',
    price: 0,
    currency: 'ريال',
    localAddress: '',
    remoteAddress: '',
  });

  // Delete Confirm Modal
  const [profileToDelete, setProfileToDelete] = useState<{ id: string; name: string } | null>(null);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const loadAllProfiles = async () => {
    if (!window.netcardAPI) return;
    setLoading(true);
    try {
      if (isConnected) {
        const hp = await window.netcardAPI.getHotspotProfiles();
        setHotspotProfiles(hp || []);

        const um = await window.netcardAPI.getUserManagerProfiles();
        setUserManagerProfiles(um || []);

        const ppp = await window.netcardAPI.getPppProfiles();
        setPppProfiles(ppp || []);
      }

      // Load local database metadata
      const meta = await window.netcardAPI.getProfileMetadata();
      setMetadataList(meta || []);
    } catch (err: any) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllProfiles();
  }, [isConnected]);

  // Merge router profile with local metadata
  const getMeta = (mode: MikroTikServiceMode, name: string): ProfileMetadata | undefined => {
    return metadataList.find((m) => m.mode === mode && m.name === name);
  };

  const handleOpenAddModal = () => {
    setNewProfile({
      mode: activeTab,
      name: '',
      rateLimit: '2M/5M',
      sharedUsers: 1,
      sessionTimeout: '',
      validity: '3d',
      transferLimit: '',
      price: activeTab === 'hotspot' ? 200 : 500,
      currency: 'ريال',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveNewProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfile.name.trim()) {
      showFeedback('يرجى كتابة اسم الباقة', 'error');
      return;
    }

    if (!window.netcardAPI) return;
    setLoading(true);

    try {
      if (isConnected) {
        if (newProfile.mode === 'hotspot') {
          await window.netcardAPI.createHotspotProfile(newProfile);
        } else if (newProfile.mode === 'usermanager') {
          await window.netcardAPI.createUserManagerProfile(newProfile);
        } else if (newProfile.mode === 'broadband') {
          await window.netcardAPI.createPppProfile(newProfile);
        }
      }

      // Save local metadata (price, currency, validity)
      await window.netcardAPI.saveProfileMetadata({
        mode: newProfile.mode,
        name: newProfile.name.trim(),
        price: newProfile.price || 0,
        currency: newProfile.currency || 'ريال',
        validity: newProfile.validity || '',
        rateLimit: newProfile.rateLimit || '',
        sharedUsers: newProfile.sharedUsers || 1,
      });

      showFeedback(`تمت إضافة الباقة (${newProfile.name}) بنجاح إلى الراوتر والقاعدة!`, 'success');
      setIsAddModalOpen(false);
      await loadAllProfiles();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      showFeedback(`فشل إنشاء الباقة: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = (mode: MikroTikServiceMode, profile: any) => {
    const meta = getMeta(mode, profile.name);
    setEditProfileData({
      id: profile.id || profile.name,
      originalName: profile.name,
      mode,
      rateLimit: profile.rateLimit || meta?.rateLimit || '',
      sharedUsers: profile.sharedUsers || meta?.sharedUsers || 1,
      sessionTimeout: profile.uptimeLimit || profile.sessionTimeout || '',
      validity: profile.validity || meta?.validity || '',
      price: meta?.price !== undefined ? meta.price : (profile.price || 0),
      currency: meta?.currency || 'ريال',
      localAddress: profile.localAddress || '',
      remoteAddress: profile.remoteAddress || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.netcardAPI) return;
    setLoading(true);

    try {
      if (isConnected) {
        if (editProfileData.mode === 'hotspot') {
          await window.netcardAPI.updateHotspotProfile(
            editProfileData.originalName,
            {
              name: editProfileData.originalName,
              mode: 'hotspot',
              rateLimit: editProfileData.rateLimit,
              sharedUsers: editProfileData.sharedUsers,
              sessionTimeout: editProfileData.sessionTimeout,
            }
          );
        } else if (editProfileData.mode === 'usermanager') {
          await window.netcardAPI.updateUserManagerProfile(
            editProfileData.originalName,
            {
              name: editProfileData.originalName,
              mode: 'usermanager',
              rateLimit: editProfileData.rateLimit,
              validity: editProfileData.validity,
              price: editProfileData.price,
            }
          );
        } else if (editProfileData.mode === 'broadband') {
          await window.netcardAPI.updatePppProfile(
            editProfileData.originalName,
            {
              name: editProfileData.originalName,
              mode: 'broadband',
              rateLimit: editProfileData.rateLimit,
              localAddress: editProfileData.localAddress,
              remoteAddress: editProfileData.remoteAddress,
            }
          );
        }
      }

      // Save local metadata (price, currency, validity, rateLimit)
      await window.netcardAPI.saveProfileMetadata({
        mode: editProfileData.mode,
        name: editProfileData.originalName,
        price: editProfileData.price || 0,
        currency: editProfileData.currency || 'ريال',
        validity: editProfileData.validity || '',
        rateLimit: editProfileData.rateLimit || '',
        sharedUsers: editProfileData.sharedUsers || 1,
      });

      showFeedback(`تم تحديث بيانات الباقة (${editProfileData.originalName}) بنجاح!`, 'success');
      setIsEditModalOpen(false);
      await loadAllProfiles();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      showFeedback(`فشل تعديل الباقة: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profileToDelete || !window.netcardAPI) return;
    setLoading(true);

    try {
      if (isConnected) {
        if (activeTab === 'hotspot') {
          await window.netcardAPI.deleteHotspotProfile(profileToDelete.name || profileToDelete.id);
        } else if (activeTab === 'usermanager') {
          await window.netcardAPI.deleteUserManagerProfile(
            profileToDelete.name || profileToDelete.id
          );
        } else if (activeTab === 'broadband') {
          await window.netcardAPI.deletePppProfile(profileToDelete.name || profileToDelete.id);
        }
      }

      // Delete from local metadata
      await window.netcardAPI.deleteProfileMetadata(activeTab, profileToDelete.name);

      showFeedback(`تم حذف الباقة (${profileToDelete.name}) بنجاح`, 'success');
      setProfileToDelete(null);
      await loadAllProfiles();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      showFeedback(`فشل حذف الباقة: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto font-cairo">
      {/* Top Header & Actions Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between border border-space-border/60 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-700 via-pink-600 to-indigo-600 flex items-center justify-center shadow-neon-purple p-1">
            <Sliders className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>إدارة باقات الإنترنت والتسعير (Profiles Manager)</span>
              {statusMsg && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'bg-red-950 text-red-400 border border-red-500/40'
                  }`}
                >
                  {statusMsg.text}
                </span>
              )}
            </h2>
            <p className="text-xs text-purple-300/70">
              إضافة وتعديل وحذف باقات الهوت سبوت، اليوزر مانجر، والبرودباند مباشرة على المايكروتك
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadAllProfiles}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-space-card hover:bg-space-darkest border border-space-border text-xs text-purple-200 hover:text-white font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-space-cyan' : ''}`} />
            <span>تحديث الباقات</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-space-accent to-space-pink hover:opacity-95 text-white text-xs font-bold shadow-neon-purple transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة باقة جديدة</span>
          </button>
        </div>
      </div>

      {/* Service Mode Tabs (Hotspot / User Manager / Broadband) */}
      <div className="flex items-center gap-2 border-b border-space-border/60 pb-2 shrink-0">
        <button
          onClick={() => setActiveTab('hotspot')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'hotspot'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-neon-purple'
              : 'bg-space-card/60 text-purple-300 hover:text-white hover:bg-space-card'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span>باقات الهوت سبوت (Hotspot)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-space-darkest text-[10px] font-mono">
            {hotspotProfiles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('usermanager')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'usermanager'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-neon-purple'
              : 'bg-space-card/60 text-purple-300 hover:text-white hover:bg-space-card'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>باقات اليوزر مانجر (User Manager)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-space-darkest text-[10px] font-mono">
            {userManagerProfiles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('broadband')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'broadband'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-neon-purple'
              : 'bg-space-card/60 text-purple-300 hover:text-white hover:bg-space-card'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>باقات البرودباند (PPPoE Profiles)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-space-darkest text-[10px] font-mono">
            {pppProfiles.length}
          </span>
        </button>
      </div>

      {/* Profiles Data Table */}
      <div className="glass-card rounded-2xl p-4 border border-space-border/60 flex-1 flex flex-col min-h-[350px]">
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'hotspot' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-space-darkest/70 text-purple-300 sticky top-0 border-b border-space-border">
                <tr>
                  <th className="py-2.5 px-3 font-bold">اسم الباقة (Profile)</th>
                  <th className="py-2.5 px-3 font-bold">السرعة المحددة (Rate Limit)</th>
                  <th className="py-2.5 px-3 font-bold">المشتركون (Shared Users)</th>
                  <th className="py-2.5 px-3 font-bold">مهلة الجلسة (Keepalive / Timeout)</th>
                  <th className="py-2.5 px-3 font-bold">السعر المرتبط (Local Price)</th>
                  <th className="py-2.5 px-3 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-border/30">
                {hotspotProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-purple-400">
                      لا توجد باقات هوت سبوت متاحة على الراوتر حالياً
                    </td>
                  </tr>
                ) : (
                  hotspotProfiles.map((p) => {
                    const meta = getMeta('hotspot', p.name);
                    return (
                      <tr key={p.id || p.name} className="hover:bg-space-card/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <Wifi className="w-3.5 h-3.5 text-space-pink" />
                          <span>{p.name}</span>
                          {p.name === 'default' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-space-darkest text-purple-400 border border-space-border">
                              افتراضية
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-space-cyan">
                          {p.rateLimit || meta?.rateLimit || 'مفتوح (Unlimited)'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-200">
                          {p.sharedUsers || meta?.sharedUsers || 1} مستخدم
                        </td>
                        <td className="py-2.5 px-3 font-mono text-purple-300">
                          {p.uptimeLimit || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          {meta?.price ? `${meta.price} ${meta.currency || 'ريال'}` : 'غير محدد'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal('hotspot', p)}
                              title="تعديل الباقة"
                              className="p-1 rounded-lg hover:bg-space-accent/20 text-space-accent hover:text-white transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {p.name !== 'default' && (
                              <button
                                onClick={() => setProfileToDelete({ id: p.id, name: p.name })}
                                title="حذف الباقة من الراوتر"
                                className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'usermanager' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-space-darkest/70 text-purple-300 sticky top-0 border-b border-space-border">
                <tr>
                  <th className="py-2.5 px-3 font-bold">اسم الباقة (Profile)</th>
                  <th className="py-2.5 px-3 font-bold">السعر بالراوتر (Router Price)</th>
                  <th className="py-2.5 px-3 font-bold">مدة الصلاحية (Validity)</th>
                  <th className="py-2.5 px-3 font-bold">السعر المحلي المرتبط</th>
                  <th className="py-2.5 px-3 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-border/30">
                {userManagerProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-purple-400">
                      لا توجد باقات يوزر مانجر متاحة على الراوتر حالياً
                    </td>
                  </tr>
                ) : (
                  userManagerProfiles.map((p) => {
                    const meta = getMeta('usermanager', p.name);
                    return (
                      <tr key={p.id || p.name} className="hover:bg-space-card/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-space-cyan" />
                          <span>{p.name}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">
                          {p.price > 0 ? `${p.price}` : 'مجانية (0)'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-purple-300">
                          {p.validity || meta?.validity || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-space-pink">
                          {meta?.price ? `${meta.price} ${meta.currency || 'ريال'}` : `${p.price} ريال`}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal('usermanager', p)}
                              title="تعديل الباقة"
                              className="p-1 rounded-lg hover:bg-space-accent/20 text-space-accent hover:text-white transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setProfileToDelete({ id: p.id, name: p.name })}
                              title="حذف الباقة من الراوتر"
                              className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'broadband' && (
            <table className="w-full text-right text-xs">
              <thead className="bg-space-darkest/70 text-purple-300 sticky top-0 border-b border-space-border">
                <tr>
                  <th className="py-2.5 px-3 font-bold">اسم باقة PPPoE</th>
                  <th className="py-2.5 px-3 font-bold">السرعة المحددة (Rate Limit)</th>
                  <th className="py-2.5 px-3 font-bold">العنوان المحلي (Local Address)</th>
                  <th className="py-2.5 px-3 font-bold">العنوان البعيد (Remote Pool)</th>
                  <th className="py-2.5 px-3 font-bold">السعر المرتبط</th>
                  <th className="py-2.5 px-3 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-border/30">
                {pppProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-purple-400">
                      لا توجد باقات برودباند متاحة على الراوتر حالياً
                    </td>
                  </tr>
                ) : (
                  pppProfiles.map((p) => {
                    const meta = getMeta('broadband', p.name);
                    return (
                      <tr key={p.id || p.name} className="hover:bg-space-card/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <Radio className="w-3.5 h-3.5 text-space-pink" />
                          <span>{p.name}</span>
                          {p.name === 'default' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-space-darkest text-purple-400 border border-space-border">
                              افتراضية
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-space-cyan">
                          {p.rateLimit || meta?.rateLimit || 'مفتوح (Unlimited)'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {p.localAddress || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-purple-300">
                          {p.remoteAddress || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          {meta?.price ? `${meta.price} ${meta.currency || 'ريال'}` : 'غير محدد'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal('broadband', p)}
                              title="تعديل الباقة"
                              className="p-1 rounded-lg hover:bg-space-accent/20 text-space-accent hover:text-white transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {p.name !== 'default' && (
                              <button
                                onClick={() => setProfileToDelete({ id: p.id, name: p.name })}
                                title="حذف الباقة من الراوتر"
                                className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Profile Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-dark border border-space-border/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="px-5 py-3.5 border-b border-space-border/60 flex items-center justify-between bg-space-darkest/70">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-space-pink" />
                <h3 className="text-sm font-bold text-white">
                  إضافة باقة جديدة (
                  {newProfile.mode === 'hotspot'
                    ? 'هوت سبوت'
                    : newProfile.mode === 'usermanager'
                    ? 'يوزر مانجر'
                    : 'برودباند PPPoE'}
                  )
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-purple-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProfile} className="p-5 space-y-3.5 text-xs">
              {/* Profile Mode Selection */}
              <div>
                <span className="text-purple-300 font-bold block mb-1">نوع الخدمة:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProfile({ ...newProfile, mode: 'hotspot' })}
                    className={`py-1.5 px-2 rounded-lg font-bold border text-center transition-all ${
                      newProfile.mode === 'hotspot'
                        ? 'bg-space-accent text-white border-space-accent shadow-neon-purple'
                        : 'bg-space-darkest text-purple-300 border-space-border'
                    }`}
                  >
                    هوت سبوت
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProfile({ ...newProfile, mode: 'usermanager' })}
                    className={`py-1.5 px-2 rounded-lg font-bold border text-center transition-all ${
                      newProfile.mode === 'usermanager'
                        ? 'bg-space-accent text-white border-space-accent shadow-neon-purple'
                        : 'bg-space-darkest text-purple-300 border-space-border'
                    }`}
                  >
                    يوزر مانجر
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProfile({ ...newProfile, mode: 'broadband' })}
                    className={`py-1.5 px-2 rounded-lg font-bold border text-center transition-all ${
                      newProfile.mode === 'broadband'
                        ? 'bg-space-accent text-white border-space-accent shadow-neon-purple'
                        : 'bg-space-darkest text-purple-300 border-space-border'
                    }`}
                  >
                    برودباند PPPoE
                  </button>
                </div>
              </div>

              {/* Profile Name */}
              <div>
                <span className="text-purple-300 font-bold block mb-1">
                  اسم الباقة (Profile Name):
                </span>
                <input
                  type="text"
                  required
                  value={newProfile.name}
                  onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                  placeholder="مثال: 1GB_3Days أو VIP_Speed"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none"
                />
              </div>

              {/* Rate Limit & Presets */}
              <div>
                <span className="text-purple-300 font-bold block mb-1">
                  السرعة المحددة (Rate Limit Rx/Tx):
                </span>
                <input
                  type="text"
                  value={newProfile.rateLimit || ''}
                  onChange={(e) => setNewProfile({ ...newProfile, rateLimit: e.target.value })}
                  placeholder="مثال: 2M/5M أو 1024k/2048k"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white font-mono focus:border-space-accent focus:outline-none mb-1.5"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['512k/1M', '1M/2M', '2M/5M', '4M/8M', '10M/20M'].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setNewProfile({ ...newProfile, rateLimit: speed })}
                      className="px-2 py-0.5 rounded bg-space-darkest border border-space-border text-[10px] text-space-cyan hover:border-space-accent"
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shared Users & Validity */}
              <div className="grid grid-cols-2 gap-3">
                {newProfile.mode === 'hotspot' && (
                  <div>
                    <span className="text-purple-300 font-bold block mb-1">المشتركون (Shared Users):</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={newProfile.sharedUsers || 1}
                      onChange={(e) =>
                        setNewProfile({ ...newProfile, sharedUsers: parseInt(e.target.value, 10) || 1 })
                      }
                      className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none font-mono"
                    />
                  </div>
                )}

                <div>
                  <span className="text-purple-300 font-bold block mb-1">
                    مدة الصلاحية (Validity / Uptime):
                  </span>
                  <input
                    type="text"
                    value={newProfile.validity || ''}
                    onChange={(e) => setNewProfile({ ...newProfile, validity: e.target.value })}
                    placeholder="مثال: 3d أو 7d أو 30d"
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-purple-300 font-bold block mb-1">السعر (Price):</span>
                  <input
                    type="number"
                    value={newProfile.price || 0}
                    onChange={(e) =>
                      setNewProfile({ ...newProfile, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:border-space-accent focus:outline-none"
                  />
                </div>

                <div>
                  <span className="text-purple-300 font-bold block mb-1">العملة:</span>
                  <select
                    value={newProfile.currency || 'ريال'}
                    onChange={(e) => setNewProfile({ ...newProfile, currency: e.target.value })}
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none"
                  >
                    <option value="ريال">ريال</option>
                    <option value="دولار">دولار ($)</option>
                    <option value="د.ع">دينار عراقي</option>
                    <option value="ل.س">ليرة سورية</option>
                    <option value="ج.م">جنيه مصري</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-space-border/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-space-darkest border border-space-border text-purple-300 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-space-accent to-space-pink hover:opacity-95 text-white font-bold shadow-neon-purple disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>حفظ وإرسال للراوتر</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-dark border border-space-border/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in">
            <div className="px-5 py-3.5 border-b border-space-border/60 flex items-center justify-between bg-space-darkest/70">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-space-cyan" />
                <h3 className="text-sm font-bold text-white">
                  تعديل باقة ({editProfileData.originalName})
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-purple-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProfile} className="p-5 space-y-3.5 text-xs">
              {/* Profile Name & Service Badge */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-space-darkest/70 border border-space-border/50">
                <div>
                  <span className="text-[11px] text-purple-300 block">اسم الباقة:</span>
                  <span className="text-sm font-black text-white font-mono">{editProfileData.originalName}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-space-accent/20 text-space-pink border border-space-accent/40">
                  {editProfileData.mode === 'hotspot'
                    ? 'هوت سبوت'
                    : editProfileData.mode === 'usermanager'
                    ? 'يوزر مانجر'
                    : 'برودباند PPPoE'}
                </span>
              </div>

              {/* Rate Limit & Presets */}
              <div>
                <span className="text-purple-300 font-bold block mb-1">
                  السرعة المحددة (Rate Limit Rx/Tx):
                </span>
                <input
                  type="text"
                  value={editProfileData.rateLimit || ''}
                  onChange={(e) => setEditProfileData({ ...editProfileData, rateLimit: e.target.value })}
                  placeholder="مثال: 2M/5M أو 1024k/2048k"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white font-mono focus:border-space-accent focus:outline-none mb-1.5"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['512k/1M', '1M/2M', '2M/5M', '4M/8M', '10M/20M'].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setEditProfileData({ ...editProfileData, rateLimit: speed })}
                      className="px-2 py-0.5 rounded bg-space-darkest border border-space-border text-[10px] text-space-cyan hover:border-space-accent"
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hotspot specific: Shared Users & Session Timeout */}
              {editProfileData.mode === 'hotspot' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-purple-300 font-bold block mb-1">المشتركون (Shared Users):</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={editProfileData.sharedUsers || 1}
                      onChange={(e) =>
                        setEditProfileData({
                          ...editProfileData,
                          sharedUsers: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <span className="text-purple-300 font-bold block mb-1">
                      مهلة الجلسة (Session / Keepalive Timeout):
                    </span>
                    <input
                      type="text"
                      value={editProfileData.sessionTimeout || ''}
                      onChange={(e) =>
                        setEditProfileData({ ...editProfileData, sessionTimeout: e.target.value })
                      }
                      placeholder="مثال: 02:00:00 أو 1d"
                      className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Broadband specific: Local & Remote Address */}
              {editProfileData.mode === 'broadband' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-purple-300 font-bold block mb-1">العنوان المحلي (Local Address):</span>
                    <input
                      type="text"
                      value={editProfileData.localAddress || ''}
                      onChange={(e) =>
                        setEditProfileData({ ...editProfileData, localAddress: e.target.value })
                      }
                      placeholder="مثال: 10.0.0.1"
                      className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <span className="text-purple-300 font-bold block mb-1">العنوان البعيد (Remote Pool):</span>
                    <input
                      type="text"
                      value={editProfileData.remoteAddress || ''}
                      onChange={(e) =>
                        setEditProfileData({ ...editProfileData, remoteAddress: e.target.value })
                      }
                      placeholder="مثال: pppoe-pool"
                      className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Validity */}
              <div>
                <span className="text-purple-300 font-bold block mb-1">
                  مدة الصلاحية (Validity / Uptime):
                </span>
                <input
                  type="text"
                  value={editProfileData.validity || ''}
                  onChange={(e) =>
                    setEditProfileData({ ...editProfileData, validity: e.target.value })
                  }
                  placeholder="مثال: 3d أو 7d أو 30d"
                  className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none font-mono"
                />
              </div>

              {/* Price & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-purple-300 font-bold block mb-1">السعر (Price):</span>
                  <input
                    type="number"
                    value={editProfileData.price || 0}
                    onChange={(e) =>
                      setEditProfileData({
                        ...editProfileData,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono focus:border-space-accent focus:outline-none"
                  />
                </div>

                <div>
                  <span className="text-purple-300 font-bold block mb-1">العملة:</span>
                  <select
                    value={editProfileData.currency || 'ريال'}
                    onChange={(e) =>
                      setEditProfileData({ ...editProfileData, currency: e.target.value })
                    }
                    className="w-full bg-space-darkest border border-space-border rounded-xl px-3 py-2 text-white focus:border-space-accent focus:outline-none"
                  >
                    <option value="ريال">ريال</option>
                    <option value="دولار">دولار ($)</option>
                    <option value="د.ع">دينار عراقي</option>
                    <option value="ل.س">ليرة سورية</option>
                    <option value="ج.م">جنيه مصري</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-space-border/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-space-darkest border border-space-border text-purple-300 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-space-cyan to-space-accent hover:opacity-95 text-white font-bold shadow-neon-cyan disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>تطبيق التعديلات في الراوتر والقاعدة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-space-dark border border-red-500/50 rounded-2xl w-full max-w-sm overflow-hidden p-5 space-y-4 shadow-2xl animate-fade-in text-xs">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white">تأكيد حذف الباقة</h3>
            </div>
            <p className="text-purple-200">
              هل أنت متأكد من حذف الباقة <strong className="text-white">({profileToDelete.name})</strong> نهائياً من الراوتر وقاعدة البيانات؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="px-4 py-1.5 rounded-xl bg-space-darkest border border-space-border text-purple-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={loading}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
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
