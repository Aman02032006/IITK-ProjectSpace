import React, { useState } from "react";
import "./Sidebar.css";

/* Icon components */
const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <polyline points="9 21 9 12 15 12 15 21" />
  </svg>
);

const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* Nav item type */
interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const topNavItems: NavItem[] = [
  { id: "home",    icon: <HomeIcon />,    label: "Home" },
  { id: "search",  icon: <SearchIcon />,  label: "Search" },
  { id: "alerts",  icon: <BellIcon />,    label: "Notifications", badge: 3 },
  { id: "profile", icon: <ProfileIcon />, label: "Profile" },
  { id: "create",  icon: <PlusIcon />,    label: "Create" },
];

interface SidebarProps {
  defaultActive?: string;
  onNavigate?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  defaultActive = "profile",
  onNavigate,
}) => {
  const [active, setActive] = useState(defaultActive);

  const handleClick = (id: string) => {
    setActive(id);
    onNavigate?.(id);
  };

  return (
    <aside className="sidebar">

      {/* Main nav */}
      <nav className="sidebar__nav">
        {topNavItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__nav-item${active === item.id ? " sidebar__nav-item--active" : ""}`}
            onClick={() => handleClick(item.id)}
            title={item.label}
            aria-label={item.label}
          >
            <span className="sidebar__icon">{item.icon}</span>
            {item.badge !== undefined && (
              <span className="sidebar__badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom: logout */}
      <div className="sidebar__bottom">
        <button
          className="sidebar__nav-item sidebar__logout"
          title="Logout"
          aria-label="Logout"
        >
          <span className="sidebar__icon">
            <LogoutIcon />
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
