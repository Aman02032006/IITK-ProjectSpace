"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./Sidebar.css";
import NotificationDrawer from "./NotificationDrawer";
import { getNotifications } from "@/lib/notificationApi";

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

const ChevronLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* Nav item type */
interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const topNavItems: NavItem[] = [
  { id: "home",    icon: <HomeIcon />,    label: "Home" },
  { id: "search",  icon: <SearchIcon />,  label: "Search" },
  { id: "alerts",  icon: <BellIcon />,    label: "Notifications" },
  { id: "profile", icon: <ProfileIcon />, label: "Profile" },
  { id: "create",  icon: <PlusIcon />,    label: "Create" },
];

interface SidebarProps {
  defaultActive?: string;
  onNavigate?: (id: string) => void;
  defaultExpanded?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  defaultActive = "profile",
  onNavigate,
  defaultExpanded = true,
}) => {
  const [active, setActive] = useState(defaultActive);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const router = useRouter();

  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebar-expanded");
      return stored !== null ? stored === "true" : defaultExpanded;
    }
    return defaultExpanded;
  });

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;

    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const page = await getNotifications(1, 0);
        if (!cancelled) setUnreadCount(page.unread_count);
      } catch {
        // Keep badge silent on fetch failures; drawer load handles retries.
      }
    };

    void loadUnreadCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = (id: string) => {
    onNavigate?.(id);

    if (id === "alerts") {
      setNotificationsOpen((prev) => !prev);
      return;
    }

    setActive(id);
    setNotificationsOpen(false);

    const routes: Record<string, string> = {
      home: "/home-page",
      search: "/search-page",
      profile: "/profile-page",
      create: "/post-creation-form",
    };

    if(routes[id]) router.push(routes[id]);
  };

  const onLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("sidebar-expanded");
    setNotificationsOpen(false);
    setUnreadCount(0);
    router.push("/auth");
  };

  return (
    <>
      <aside className={`sidebar${expanded ? " sidebar--expanded" : ""}`}>
        {/* Collapse / Expand toggle */}
        <button
          className="sidebar__toggle"
          onClick={() => setExpanded((v) => {
            localStorage.setItem("sidebar-expanded", String(!v));
            return !v;
          })}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <span className="sidebar__icon">
            {expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </span>
          <span className="sidebar__toggle-label">Collapse</span>
        </button>

        {/* Main nav */}
        <nav className="sidebar__nav">
          {topNavItems.map((item) => {
            const isNotificationsItem = item.id === "alerts";
            const isActive = isNotificationsItem ? notificationsOpen : active === item.id;
            const badgeCount = isNotificationsItem ? unreadCount : 0;

            return (
              <button
                key={item.id}
                className={`sidebar__nav-item${isActive ? " sidebar__nav-item--active" : ""}`}
                onClick={() => handleClick(item.id)}
                title={item.label}
                aria-label={item.label}
              >
                <span className="sidebar__icon">{item.icon}</span>
                <span className="sidebar__label">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="sidebar__badge">{badgeCount > 99 ? "99+" : badgeCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* logout */}
        <div className="sidebar__bottom">
          <button
            className="sidebar__nav-item sidebar__logout"
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
          >
            <span className="sidebar__icon">
              <LogoutIcon />
            </span>
            <span className="sidebar__label">Logout</span>
          </button>
        </div>
      </aside>

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
};

export default Sidebar;
