import React, { useState, useEffect } from 'react';
import { Navbar, AppView } from './components/Navbar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ProfilesManagerView } from './views/ProfilesManagerView';
import { TemplateDesignerView } from './views/TemplateDesignerView';
import { CardGeneratorView } from './views/CardGeneratorView';
import { CardArchiveView } from './views/CardArchiveView';
import { PosManagementModal } from './views/PosManagementModal';
import { ProfileManagementModal } from './views/ProfileManagementModal';
import { FirewallScriptModal } from './views/FirewallScriptModal';
import {
  RouterOSInfo,
  ConnectionConfig,
  CardTemplate,
  POSLocation,
  HotspotUserProfile,
  UserManagerProfile,
  PppProfile,
} from '../../shared/types';
import { DEFAULT_TEMPLATE } from '../../shared/defaults';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [isConnected, setIsConnected] = useState(false);
  const [routerInfo, setRouterInfo] = useState<RouterOSInfo | null>(null);

  // Shared Data State
  const [templates, setTemplates] = useState<CardTemplate[]>([DEFAULT_TEMPLATE]);
  const [posLocations, setPosLocations] = useState<POSLocation[]>([]);
  const [hotspotProfiles, setHotspotProfiles] = useState<HotspotUserProfile[]>([]);
  const [userManagerProfiles, setUserManagerProfiles] = useState<UserManagerProfile[]>([]);
  const [pppProfiles, setPppProfiles] = useState<PppProfile[]>([]);

  // Modals state
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFirewallModalOpen, setIsFirewallModalOpen] = useState(false);

  // Initial load
  useEffect(() => {
    loadDatabaseData();
  }, []);

  const loadDatabaseData = async () => {
    if (!window.netcardAPI) return;
    try {
      const tmpls = await window.netcardAPI.getTemplates();
      if (tmpls.length > 0) setTemplates(tmpls);

      const pos = await window.netcardAPI.getPosLocations();
      setPosLocations(pos);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRouterProfiles = async () => {
    if (!window.netcardAPI) return;
    try {
      const hp = await window.netcardAPI.getHotspotProfiles();
      setHotspotProfiles(hp || []);

      const um = await window.netcardAPI.getUserManagerProfiles();
      setUserManagerProfiles(um || []);

      const ppp = await window.netcardAPI.getPppProfiles();
      setPppProfiles(ppp || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = async (info: RouterOSInfo, config: ConnectionConfig) => {
    setIsConnected(true);
    setRouterInfo(info);
    if (!config.fastLogin) {
      await loadRouterProfiles();
    }
    // Automatically transition to the Dashboard upon successful connection
    setCurrentView('dashboard');
  };

  const handleDisconnect = async () => {
    if (window.netcardAPI) {
      await window.netcardAPI.disconnectMikroTik();
    }
    setIsConnected(false);
    setRouterInfo(null);
    setCurrentView('login');
  };

  return (
    <div className="h-screen w-screen bg-space-darkest flex flex-col overflow-hidden text-slate-100 font-cairo">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'pos') {
            setIsPosModalOpen(true);
          } else {
            setCurrentView(view);
          }
        }}
        isConnected={isConnected}
        routerInfo={routerInfo}
        onDisconnect={handleDisconnect}
        onOpenFirewallModal={() => setIsFirewallModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'login' && (
          <LoginView onLoginSuccess={handleLoginSuccess} isConnected={isConnected} />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            initialInfo={routerInfo}
            onDisconnect={handleDisconnect}
            onNavigateToGenerator={() => setCurrentView('generator')}
          />
        )}

        {currentView === 'generator' && (
          <CardGeneratorView
            isConnected={isConnected}
            templates={templates}
            posLocations={posLocations}
            hotspotProfiles={hotspotProfiles}
            userManagerProfiles={userManagerProfiles}
            pppProfiles={pppProfiles}
            onOpenPosModal={() => setIsPosModalOpen(true)}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onOpenProfilesManager={() => setCurrentView('profiles')}
            onOpenTemplateDesigner={() => setCurrentView('templates')}
            onOpenFirewallModal={() => setIsFirewallModalOpen(true)}
          />
        )}

        {currentView === 'profiles' && (
          <ProfilesManagerView
            isConnected={isConnected}
            onRefreshNeeded={loadRouterProfiles}
          />
        )}

        {currentView === 'templates' && (
          <TemplateDesignerView
            hotspotProfiles={hotspotProfiles}
            posLocations={posLocations}
          />
        )}

        {currentView === 'archive' && <CardArchiveView />}
      </main>

      {/* Modals */}
      <PosManagementModal
        isOpen={isPosModalOpen}
        onClose={() => setIsPosModalOpen(false)}
        onPosUpdated={loadDatabaseData}
      />

      <ProfileManagementModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        mode="hotspot"
        onProfileCreated={loadRouterProfiles}
      />

      <FirewallScriptModal
        isOpen={isFirewallModalOpen}
        onClose={() => setIsFirewallModalOpen(false)}
      />
    </div>
  );
};
