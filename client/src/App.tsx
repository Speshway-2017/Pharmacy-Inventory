import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { SplashScreen } from './components/SplashScreen';
import { Medicine } from '../../shared/types';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { MedicineDetails } from './pages/MedicineDetails';
import { AddEditMedicine } from './pages/AddEditMedicine';
import { BillingPOS } from './pages/BillingPOS';
import { BillHistory } from './pages/BillHistory';
import { Reports } from './pages/Reports';
import { StockValuationReport } from './pages/StockValuationReport';
import { ExpiryRiskReport } from './pages/ExpiryRiskReport';
import { ExpiryManagement } from './pages/ExpiryManagement';
import { Settings } from './pages/Settings';

import { ErrorBoundary } from './components/ErrorBoundary';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [selectedMedicineDetails, setSelectedMedicineDetails] = useState<Medicine | null>(null);

  // Global Alt + F9 Shortcut to jump to POS Billing Counter
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'F9' || e.code === 'F9')) {
        e.preventDefault();
        setActiveTab('billing');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  if (!user) {
    return <Login />;
  }

  const handleOpenAddEditMedicine = (medToEdit?: Medicine | null) => {
    setEditingMedicine(medToEdit || null);
    setActiveTab('add-medicine');
  };

  const handleViewMedicineDetails = (med: Medicine) => {
    setSelectedMedicineDetails(med);
    setActiveTab('medicine-details');
  };

  const getPageTitle = (): string => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'inventory': return 'Medicine Inventory';
      case 'medicine-details': return selectedMedicineDetails ? `Medicine Details - ${selectedMedicineDetails.name}` : 'Medicine Details Overview';
      case 'add-medicine': return editingMedicine ? 'Edit Medicine Record' : 'Add New Medicine';
      case 'billing': return 'Point of Sale (POS) Billing Counter';
      case 'history': return 'Sales Bills History';
      case 'reports': return 'Reports & Sales Analytics';
      case 'stock-valuation': return 'Stock Valuation Analytics Report';
      case 'expiry-risk': return 'Expiry Risk & Loss Prevention Report';
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
          <ErrorBoundary>
            {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
            {activeTab === 'inventory' && (
              <Inventory
                onOpenAddEditPage={handleOpenAddEditMedicine}
                onViewMedicineDetails={handleViewMedicineDetails}
              />
            )}
            {activeTab === 'medicine-details' && selectedMedicineDetails && (
              <MedicineDetails
                medicine={selectedMedicineDetails}
                onBack={() => {
                  setSelectedMedicineDetails(null);
                  setActiveTab('inventory');
                }}
                onEdit={(med) => handleOpenAddEditMedicine(med)}
              />
            )}
            {activeTab === 'add-medicine' && (
              <AddEditMedicine
                medicineToEdit={editingMedicine}
                onBack={() => {
                  setEditingMedicine(null);
                  setActiveTab('inventory');
                }}
                onSuccess={() => {
                  setEditingMedicine(null);
                  setActiveTab('inventory');
                }}
              />
            )}
            {activeTab === 'billing' && <BillingPOS />}
            {activeTab === 'history' && <BillHistory />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'stock-valuation' && (
              <StockValuationReport onBack={() => setActiveTab('reports')} />
            )}
            {activeTab === 'expiry-risk' && (
              <ExpiryRiskReport onBack={() => setActiveTab('reports')} />
            )}
            {activeTab === 'expiry' && <ExpiryManagement />}
            {activeTab === 'settings' && <Settings />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(true);

  return (
    <AuthProvider>
      <SyncProvider>
        {showSplash ? (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        ) : (
          <MainLayout />
        )}
      </SyncProvider>
    </AuthProvider>
  );
};

export default App;
