import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  BarChart3,
  AlertTriangle,
  Settings,
  Pill
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'inventory' | 'billing' | 'history' | 'reports' | 'expiry' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'billing', label: 'Billing / POS', icon: ShoppingCart },
    { id: 'history', label: 'Bill History', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'expiry', label: 'Expiry', icon: AlertTriangle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Pill size={20} color="#FFFFFF" />
        </div>
        <div className="sidebar-title">MedPlus POS</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id as ActiveTab)}
            >
              <Icon size={18} color={isActive ? '#0F766E' : '#E2E8F0'} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontWeight: 600 }}>Pharmacy App v1.0</div>
        <div style={{ opacity: 0.8, fontSize: '11px', marginTop: '2px' }}>Offline-First Desktop</div>
      </div>
    </aside>
  );
};
