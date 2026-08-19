import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { BillingPOS } from './pages/BillingPOS';
import { BillHistory } from './pages/BillHistory';
import { Reports } from './pages/Reports';
import { ExpiryManagement } from './pages/ExpiryManagement';
import { Settings } from './pages/Settings';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  if (!user) {
    return <Login />;
  }

  const getPageTitle = (): string => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'inventory': return 'Medicine Inventory';
      case 'billing': return 'Point of Sale (POS) Billing Counter';
      case 'history': return 'Sales Bills History';
      case 'reports': return 'Reports & Sales Analytics';
      case 'expiry': return 'Batch & Expiry Date Management';
      case 'settings': return 'Pharmacy Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-wrapper">
        <TopHeader title={getPageTitle()} />

        <main className="content-body">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'billing' && <BillingPOS />}
          {activeTab === 'history' && <BillHistory />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'expiry' && <ExpiryManagement />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SyncProvider>
        <MainLayout />
      </SyncProvider>
    </AuthProvider>
  );
};

export default App;
