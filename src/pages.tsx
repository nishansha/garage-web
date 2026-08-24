import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Menu,
  Pin,
  PinOff,
  Search,
  Settings,
  X,
} from "lucide-react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { toast } from "sonner";
import { ApiError, authApi } from "./lib/api";
import { formatRoleLabels, hasAnyRolePrivilege } from "./lib/rbac";
import { usePermission } from "./hooks/usePermission";
import {
  appRoutes,
  getRouteByPath,
  groupIcons,
  routeGroups,
  type AppRoute,
} from "./routes/config";
import { DEFAULT_PREFERENCES } from "./services/preferences";
import { useAppSelector } from "./store/auth";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  PageHeader,
} from "./components/ui";
import { PreferencesModal } from "./components/PreferencesModal";
import { cx } from "./lib/utils";
import { DashboardRecentActivity } from "./features/operations/DashboardRecentActivity";

export const AuthGate = () => {
  const session = useAppSelector((state) => state.auth.session);
  const location = useLocation();
  return session ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
};

export const LoginPage = () => {
  const session = useAppSelector((state) => state.auth.session);
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const from =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/";

  const login = useMutation({
    mutationFn: () => authApi.login(username.trim(), password),
    onSuccess: () => {
      toast.success("Welcome back");
      navigate(from, { replace: true });
    },
    onError: (error) => {
      console.error("Sign-in failed", error);
      toast.error(
        error instanceof ApiError ? error.message : "Unable to sign in.",
      );
    },
  });

  if (session) return <Navigate to="/" replace />;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Enter your username and password.");
      return;
    }
    login.mutate();
  };

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Garage">
        <div className="brand-mark">
          <img src="/logo.png" alt="" width={58} height={58} />
        </div>
        <div>
          <span>Garage</span>
          <h1>Run every part of your garage from one place.</h1>
          <p>
            Purchasing, sales, inventory and accounting—clear, connected and
            secure.
          </p>
        </div>
      </section>
      <Card className="login-card">
        <div>
          <span className="eyebrow">Secure workspace</span>
          <h2>Sign in</h2>
          <p>Use your Garage account to continue.</p>
        </div>
        <form onSubmit={submit}>
          <FormField label="Username" required>
            <Input
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
            />
          </FormField>
          <FormField label="Password" required>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </FormField>
          <Button type="submit" loading={login.isPending}>
            Sign in
          </Button>
        </form>
      </Card>
    </main>
  );
};

const isRouteActive = (pathname: string, route: AppRoute) =>
  route.path === "/"
    ? pathname === "/"
    : pathname === route.path || pathname.startsWith(`${route.path}/`);

const isGroupActive = (pathname: string, routes: readonly AppRoute[]) =>
  routes.some((route) => isRouteActive(pathname, route));

const RECENT_STORAGE_KEY = "garage.web.nav.recent";
const PINNED_STORAGE_KEY = "garage.web.nav.pinned";
const MAX_RECENT = 5;

const readStoredPaths = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
};

const writeStoredPaths = (key: string, paths: string[]) => {
  localStorage.setItem(key, JSON.stringify(paths));
};

const useNavHistory = (currentPath: string) => {
  const [recentPaths, setRecentPaths] = useState<string[]>(() =>
    readStoredPaths(RECENT_STORAGE_KEY),
  );
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() =>
    readStoredPaths(PINNED_STORAGE_KEY),
  );

  useEffect(() => {
    if (currentPath === "/") return;
    setRecentPaths((prev) => {
      if (prev[0] === currentPath) return prev;
      const next = [currentPath, ...prev.filter((path) => path !== currentPath)].slice(
        0,
        MAX_RECENT,
      );
      writeStoredPaths(RECENT_STORAGE_KEY, next);
      return next;
    });
  }, [currentPath]);

  const togglePinned = (path: string) => {
    setPinnedPaths((prev) => {
      const next = prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [path, ...prev];
      writeStoredPaths(PINNED_STORAGE_KEY, next);
      return next;
    });
  };

  return { recentPaths, pinnedPaths, togglePinned };
};

const SidebarLink = ({
  route,
  onNavigate,
  collapsed,
}: {
  route: AppRoute;
  onNavigate: () => void;
  collapsed: boolean;
}) => {
  const Icon = route.icon;
  return (
    <NavLink
      to={route.path}
      end={route.path === "/"}
      onClick={onNavigate}
      className={({ isActive }) => cx("nav-link", isActive && "is-active")}
      title={collapsed ? route.title : undefined}
    >
      <Icon aria-hidden="true" />
      <span>{route.title}</span>
    </NavLink>
  );
};

const BrandLink = ({ onNavigate }: { onNavigate?: () => void }) => (
  <Link
    to="/"
    className="brand-link"
    aria-label="Garage dashboard"
    onClick={onNavigate}
  >
    <span className="brand-mark brand-mark--small">
      <img src="/logo.png" alt="" width={39} height={39} />
    </span>
    <span>
      <strong>Garage</strong>
      <small></small>
    </span>
  </Link>
);

const UserMenu = ({
  roleLabel,
  onLogout,
}: {
  roleLabel: string;
  onLogout: () => void;
}) => {
  const session = useAppSelector((state) => state.auth.session);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const openPreferences = () => {
    if (detailsRef.current) detailsRef.current.open = false;
    setPreferencesOpen(true);
  };

  return (
    <>
      <details ref={detailsRef} className="user-menu">
        <summary>
          <span className="avatar">
            {(
              session?.user.fullName ??
              session?.user.username ??
              "U"
            ).charAt(0)}
          </span>
          <span className="user-menu__text">
            <strong>{session?.user.fullName ?? session?.user.username}</strong>
            <small>{roleLabel}</small>
          </span>
          <ChevronsUpDown aria-hidden="true" />
        </summary>
        <div className="user-menu__popover">
          <div>
            <strong>{session?.user.fullName ?? session?.user.username}</strong>
            <small>{session?.user.email ? session.user.email : roleLabel}</small>
          </div>
          <Button variant="ghost" onClick={openPreferences}>
            <Settings aria-hidden="true" /> Preferences
          </Button>
          <Button variant="ghost" onClick={onLogout}>
            <LogOut aria-hidden="true" /> Sign out
          </Button>
        </div>
      </details>
      <PreferencesModal
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </>
  );
};

const Breadcrumbs = ({ currentRoute }: { currentRoute?: AppRoute }) => (
  <nav className="breadcrumbs" aria-label="Breadcrumb">
    <Link to="/">Home</Link>
    {currentRoute && currentRoute.path !== "/" && (
      <>
        <span aria-hidden="true">/</span>
        {currentRoute.group && <span>{currentRoute.group}</span>}
        <span aria-hidden="true">/</span>
        <strong>{currentRoute.title}</strong>
      </>
    )}
  </nav>
);

const SidebarNav = ({
  dashboard,
  visibleRoutes,
  collapsed,
  onNavigate,
  pathname,
}: {
  dashboard?: AppRoute;
  visibleRoutes: AppRoute[];
  collapsed: boolean;
  onNavigate: () => void;
  pathname: string;
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  return (
    <nav className="sidebar__nav" aria-label="Primary navigation">
      {dashboard && (
        <SidebarLink
          route={dashboard}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      )}
      {routeGroups.map((group) => {
        const routes = visibleRoutes.filter((route) => route.group === group);
        if (!routes.length) return null;
        const isOpen = collapsed
          ? true
          : (openGroups[group] ?? isGroupActive(pathname, routes));
        const GroupIcon = groupIcons[group];
        return (
          <details
            className="nav-group"
            key={group}
            open={isOpen}
            onToggle={(event) => {
              if (collapsed) return;
              const nextOpen = event.currentTarget.open;
              setOpenGroups((prev) => ({ ...prev, [group]: nextOpen }));
            }}
          >
            <summary>
              <GroupIcon aria-hidden="true" />
              <span>{group}</span>
              <ChevronRight aria-hidden="true" className="nav-group__chevron" />
            </summary>
            <div className="nav-group__links">
              {routes.map((route) => (
                <SidebarLink
                  key={route.path}
                  route={route}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
};

const getGroupRoutes = (visibleRoutes: AppRoute[], group: string) =>
  visibleRoutes.filter((route) => route.group === group);

const findActiveGroup = (pathname: string, visibleRoutes: AppRoute[]) =>
  routeGroups.find((group) =>
    isGroupActive(pathname, getGroupRoutes(visibleRoutes, group)),
  );

const RightPanel = ({
  activeGroup,
  activeGroupRoutes,
  currentRoute,
  recentPaths,
  pinnedPaths,
  togglePinned,
}: {
  activeGroup?: string;
  activeGroupRoutes: AppRoute[];
  currentRoute?: AppRoute;
  recentPaths: string[];
  pinnedPaths: string[];
  togglePinned: (path: string) => void;
}) => {
  const pinnedRoutes = pinnedPaths
    .map((path) => getRouteByPath(path))
    .filter((route): route is AppRoute => Boolean(route));
  const recentRoutes = recentPaths
    .map((path) => getRouteByPath(path))
    .filter(
      (route): route is AppRoute =>
        Boolean(route) && route?.path !== currentRoute?.path,
    )
    .slice(0, 4);
  const isPinned = Boolean(currentRoute && pinnedPaths.includes(currentRoute.path));

  return (
    <aside className="right-panel" aria-label="Section navigation">
      {activeGroup && activeGroupRoutes.length > 0 && (
        <div className="right-panel__section">
          <h3>{activeGroup}</h3>
          <div className="right-panel__list">
            {activeGroupRoutes.map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                className={({ isActive }) =>
                  cx("right-panel__link", isActive && "is-active")
                }
              >
                <route.icon aria-hidden="true" />
                <span>{route.title}</span>
              </NavLink>
            ))}
          </div>
          {currentRoute && currentRoute.path !== "/" && (
            <button
              type="button"
              className="right-panel__pin-toggle"
              onClick={() => togglePinned(currentRoute.path)}
            >
              {isPinned ? (
                <PinOff aria-hidden="true" />
              ) : (
                <Pin aria-hidden="true" />
              )}
              <span>{isPinned ? "Unpin this page" : "Pin this page"}</span>
            </button>
          )}
        </div>
      )}
      {pinnedRoutes.length > 0 && (
        <div className="right-panel__section">
          <h3>Pinned</h3>
          <div className="right-panel__list">
            {pinnedRoutes.map((route) => (
              <div key={route.path} className="right-panel__row">
                <NavLink
                  to={route.path}
                  className={({ isActive }) =>
                    cx("right-panel__link", isActive && "is-active")
                  }
                >
                  <route.icon aria-hidden="true" />
                  <span>{route.title}</span>
                </NavLink>
                <button
                  type="button"
                  className="right-panel__remove"
                  aria-label={`Unpin ${route.title}`}
                  onClick={() => togglePinned(route.path)}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {recentRoutes.length > 0 && (
        <div className="right-panel__section">
          <h3>Recent</h3>
          <div className="right-panel__list">
            {recentRoutes.map((route) => (
              <NavLink key={route.path} to={route.path} className="right-panel__link">
                <route.icon aria-hidden="true" />
                <span>{route.title}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};

const SearchTrigger = ({ onOpen }: { onOpen: () => void }) => (
  <button type="button" className="search-trigger" onClick={onOpen}>
    <Search aria-hidden="true" />
    <span>Search pages</span>
    <kbd>⌘K</kbd>
  </button>
);

const CommandPalette = ({
  open,
  onClose,
  visibleRoutes,
  activeGroup,
  recentPaths,
}: {
  open: boolean;
  onClose: () => void;
  visibleRoutes: AppRoute[];
  activeGroup?: string;
  recentPaths: string[];
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlighted(0);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const currentSectionRoutes = activeGroup
        ? visibleRoutes.filter((route) => route.group === activeGroup)
        : [];
      const recentRoutes = recentPaths
        .map((path) => visibleRoutes.find((route) => route.path === path))
        .filter((route): route is AppRoute => Boolean(route));
      const seen = new Set<string>();
      const ordered: AppRoute[] = [];
      for (const route of [...currentSectionRoutes, ...recentRoutes, ...visibleRoutes]) {
        if (seen.has(route.path)) continue;
        seen.add(route.path);
        ordered.push(route);
      }
      return ordered;
    }
    return visibleRoutes.filter(
      (route) =>
        route.title.toLowerCase().includes(q) ||
        route.group?.toLowerCase().includes(q) ||
        route.description.toLowerCase().includes(q),
    );
  }, [query, visibleRoutes, activeGroup, recentPaths]);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  if (!open) return null;

  const go = (route: AppRoute) => {
    navigate(route.path);
    onClose();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const route = results[highlighted];
      if (route) go(route);
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="command-palette-scrim" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-palette__input">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages..."
            aria-label="Search pages"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-palette__results">
          {results.length === 0 && (
            <div className="command-palette__empty">No pages found</div>
          )}
          {results.map((route, index) => (
            <button
              key={route.path}
              type="button"
              className={cx(
                "command-palette__item",
                index === highlighted && "is-active",
              )}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => go(route)}
            >
              <route.icon aria-hidden="true" />
              <span className="command-palette__item-title">{route.title}</span>
              {route.group && (
                <span className="command-palette__item-group">{route.group}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const useShellNavigation = () => {
  const session = useAppSelector((state) => state.auth.session);
  const preferences =
    useAppSelector((state) => state.auth.preferences) ?? DEFAULT_PREFERENCES;
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = getRouteByPath(location.pathname);
  const { can, ready, superAdmin } = usePermission();
  const permissions = useAppSelector((state) => state.auth.permissions);
  const roleLabel = formatRoleLabels(
    permissions?.roles ?? session?.user?.roles ?? [],
  );
  const visibleRoutes = appRoutes.filter((route) => {
    if (!ready) return true;
    if (route.path === "/more/roles") {
      return superAdmin || hasAnyRolePrivilege(can);
    }
    return can(route.access.resource, route.access.privilege);
  });
  const dashboard = visibleRoutes.find((route) => route.path === "/");
  const { recentPaths, pinnedPaths, togglePinned } = useNavHistory(
    location.pathname,
  );

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return {
    preferences,
    location,
    navigate,
    currentRoute,
    roleLabel,
    visibleRoutes,
    dashboard,
    logout,
    recentPaths,
    pinnedPaths,
    togglePinned,
  };
};

export const AppShell = () => {
  const {
    preferences,
    location,
    navigate,
    currentRoute,
    roleLabel,
    visibleRoutes,
    dashboard,
    logout,
    recentPaths,
    pinnedPaths,
    togglePinned,
  } = useShellNavigation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("garage.web.sidebar") === "collapsed",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const topNav = preferences.navbarPosition === "TOP";
  const activeGroup = findActiveGroup(location.pathname, visibleRoutes);
  const activeGroupRoutes = activeGroup
    ? getGroupRoutes(visibleRoutes, activeGroup)
    : [];

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, topNav]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((value) => {
      localStorage.setItem(
        "garage.web.sidebar",
        value ? "expanded" : "collapsed",
      );
      return !value;
    });
  };

  const openGroup = (routes: AppRoute[]) => {
    const first = routes[0];
    if (!first) return;
    if (!isGroupActive(location.pathname, routes)) {
      navigate(first.path);
    }
    setDrawerOpen(false);
  };

  if (topNav) {
    return (
      <div className="app-shell app-shell--top">
        {drawerOpen && (
          <button
            className="drawer-scrim"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
        )}
        <div className="top-chrome">
          <header className="top-navbar">
            <div className="top-navbar__inner">
              <button
                className="icon-button topbar__menu"
                aria-label="Open navigation"
                onClick={() => setDrawerOpen(true)}
              >
                <Menu aria-hidden="true" />
              </button>
              <BrandLink />
              <nav className="top-nav" aria-label="Primary navigation">
                {dashboard && (
                  <NavLink
                    to={dashboard.path}
                    end
                    className={({ isActive }) =>
                      cx("top-nav__link", isActive && "is-active")
                    }
                  >
                    <dashboard.icon aria-hidden="true" />
                    <span>{dashboard.title}</span>
                  </NavLink>
                )}
                {routeGroups.map((group) => {
                  const routes = getGroupRoutes(visibleRoutes, group);
                  if (!routes.length) return null;
                  const active = activeGroup === group;
                  const GroupIcon = groupIcons[group];
                  return (
                    <button
                      key={group}
                      type="button"
                      className={cx("top-nav__link", active && "is-active")}
                      aria-current={active ? "true" : undefined}
                      onClick={() => openGroup(routes)}
                    >
                      <GroupIcon aria-hidden="true" className="nav-group__icon" />
                      <span>{group}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="top-navbar__actions">
                <SearchTrigger onOpen={() => setPaletteOpen(true)} />
                <UserMenu roleLabel={roleLabel} onLogout={() => void logout()} />
              </div>
            </div>
          </header>
        </div>
        <aside
          className={cx(
            "sidebar",
            "sidebar--drawer",
            drawerOpen && "sidebar--open",
          )}
        >
          <div className="sidebar__brand">
            <BrandLink onNavigate={() => setDrawerOpen(false)} />
            <button
              className="icon-button sidebar__mobile-close"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <SidebarNav
            dashboard={dashboard}
            visibleRoutes={visibleRoutes}
            collapsed={false}
            onNavigate={() => setDrawerOpen(false)}
            pathname={location.pathname}
          />
        </aside>
        <div className="app-main app-main--with-panel">
          <div className="side-stack">
            <RightPanel
              activeGroup={activeGroup}
              activeGroupRoutes={activeGroupRoutes}
              currentRoute={currentRoute}
              recentPaths={recentPaths}
              pinnedPaths={pinnedPaths}
              togglePinned={togglePinned}
            />
            {location.pathname === "/" && (
              <DashboardRecentActivity variant="panel" />
            )}
          </div>
          <main className="page-content">
            <Outlet />
          </main>
        </div>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          visibleRoutes={visibleRoutes}
          activeGroup={activeGroup}
          recentPaths={recentPaths}
        />
      </div>
    );
  }

  return (
    <div className={cx("app-shell", collapsed && "app-shell--collapsed")}>
      {drawerOpen && (
        <button
          className="drawer-scrim"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside className={cx("sidebar", drawerOpen && "sidebar--open")}>
        <div className="sidebar__brand">
          <BrandLink onNavigate={() => setDrawerOpen(false)} />
          <button
            className="icon-button sidebar__mobile-close"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <SidebarNav
          dashboard={dashboard}
          visibleRoutes={visibleRoutes}
          collapsed={collapsed}
          onNavigate={() => setDrawerOpen(false)}
          pathname={location.pathname}
        />
        <button className="sidebar__collapse" onClick={toggleSidebar}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
          <span>{collapsed ? "Expand" : "Collapse"} sidebar</span>
        </button>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button topbar__menu"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
          <Breadcrumbs currentRoute={currentRoute} />
          <SearchTrigger onOpen={() => setPaletteOpen(true)} />
          <UserMenu roleLabel={roleLabel} onLogout={() => void logout()} />
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        visibleRoutes={visibleRoutes}
        activeGroup={activeGroup}
        recentPaths={recentPaths}
      />
    </div>
  );
};

export const PlaceholderPage = ({ route }: { route: AppRoute }) => {
  const { can, ready } = usePermission();
  if (ready && !can(route.access.resource, route.access.privilege)) {
    return (
      <ErrorState
        title="Access restricted"
        message="You do not have permission to view this page."
      />
    );
  }
  return (
    <>
      <PageHeader title={route.title} description={route.description} />
      <Card className="placeholder-card">
        <route.icon aria-hidden="true" />
        <h2>Foundation ready</h2>
        <p>This route is registered and ready for its business workflow.</p>
        <span>Placeholder — replace during feature implementation</span>
      </Card>
    </>
  );
};

export const NotFoundPage = () => (
  <main className="standalone-state">
    <ErrorState
      title="Page not found"
      message="The page you requested does not exist or may have moved."
    />
    <Button onClick={() => history.back()} variant="secondary">
      Go back
    </Button>
    <Link className="button button--primary" to="/">
      Dashboard
    </Link>
  </main>
);
