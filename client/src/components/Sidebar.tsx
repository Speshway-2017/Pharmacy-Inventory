import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  BarChart3,
  AlertTriangle,
  Settings,
  Pill,
  Pin,
  PinOff
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
  | 'add-medicine'
  | 'medicine-details';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);

  // The sidebar is expanded when hovered or explicitly pinned, otherwise minimized
  const isExpanded = isHovered || isPinned;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'billing', label: 'Billing / POS', shortcut: 'Alt+F9', icon: ShoppingCart },
    { id: 'history', label: 'Bill History', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'expiry', label: 'Expiry', icon: AlertTriangle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelectTab = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    // Minimize sidebar automatically on tab click if not pinned
    setIsHovered(false);
  };

  return (
    <aside
      className={`sidebar ${isExpanded ? 'expanded' : 'minimized'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <Pill size={20} color="#FFFFFF" />
        </div>
        {isExpanded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
            <span className="sidebar-title">XingLin Pharmacy</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPinned(!isPinned);
              }}
              title={isPinned ? "Unpin sidebar (auto-minimize mode)" : "Pin sidebar open"}
              style={{
                background: 'transparent',
                border: 'none',
                color: isPinned ? '#3B82F6' : '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'inventory' && (activeTab === 'add-medicine' || activeTab === 'medicine-details')) ||
            (item.id === 'reports' && (activeTab === 'stock-valuation' || activeTab === 'expiry-risk'));

          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectTab(item.id as ActiveTab)}
              title={!isExpanded ? `${item.label} (${item.shortcut || ''})` : undefined}
            >
              <div className="nav-item-left" style={{ flex: 1, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={19} color={isActive ? '#FFFFFF' : '#94A3B8'} />
                  {isExpanded && <span>{item.label}</span>}
                </div>
                {isExpanded && item.shortcut && (
                  <span
                    style={{
                      fontSize: '10px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      color: isActive ? '#FFFFFF' : '#94A3B8'
                    }}
                  >
                    {item.shortcut}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {isExpanded ? (
          <div>
            <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '12px' }}>Pharmacy App v1.0</div>
            <div style={{ opacity: 0.7, fontSize: '11px', marginTop: '2px' }}>Offline-First Desktop</div>
          </div>
        ) : (
          <div style={{ fontSize: '10px', textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>
            v1.0
          </div>
        )}
      </div>
    </aside>
  );
};
