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

export type ActiveTab =
  | 'dashboard'
  | 'inventory'
  | 'billing'
  | 'history'
  | 'reports'
  | 'stock-valuation'
  | 'expiry-risk'
  | 'expiry'
  | 'settings'
  | 'add-medicine';

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
        <div className="sidebar-title">XingLin Pharmacy</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'inventory' && activeTab === 'add-medicine') ||
            (item.id === 'reports' && (activeTab === 'stock-valuation' || activeTab === 'expiry-risk'));
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id as ActiveTab)}
            >
              <div className="nav-item-left">
                <Icon size={18} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                <span>{item.label}</span>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Pharmacy App v1.0</div>
        <div style={{ opacity: 0.7, fontSize: '11px', marginTop: '2px' }}>Offline-First Desktop</div>
      </div>
    </aside>
  );
};
