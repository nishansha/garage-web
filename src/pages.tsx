import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Menu,
  Settings,
  Wrench,
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
          <Wrench aria-hidden="true" />
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
      <Wrench aria-hidden="true" />
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
}: {
  dashboard?: AppRoute;
  visibleRoutes: AppRoute[];
  collapsed: boolean;
  onNavigate: () => void;
}) => (
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
      return (
        <section className="nav-group" key={group}>
          <h2>{group}</h2>
          {routes.map((route) => (
            <SidebarLink
              key={route.path}
              route={route}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </section>
      );
    })}
  </nav>
);

const getGroupRoutes = (visibleRoutes: AppRoute[], group: string) =>
  visibleRoutes.filter((route) => route.group === group);

const findActiveGroup = (pathname: string, visibleRoutes: AppRoute[]) =>
  routeGroups.find((group) =>
    isGroupActive(pathname, getGroupRoutes(visibleRoutes, group)),
  );

const TopSubnav = ({ routes }: { routes: AppRoute[] }) => (
  <nav className="top-subnav" aria-label="Section navigation">
    <div className="top-subnav__inner">
      {routes.map((route) => {
        const Icon = route.icon;
        return (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              cx("top-subnav__link", isActive && "is-active")
            }
          >
            <Icon aria-hidden="true" />
            <span>{route.title}</span>
          </NavLink>
        );
      })}
    </div>
  </nav>
);

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
  } = useShellNavigation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("garage.web.sidebar") === "collapsed",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const topNav = preferences.navbarPosition === "TOP";
  const activeGroup = findActiveGroup(location.pathname, visibleRoutes);
  const activeGroupRoutes = activeGroup
    ? getGroupRoutes(visibleRoutes, activeGroup)
    : [];

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, topNav]);

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
                return (
                  <button
                    key={group}
                    type="button"
                    className={cx("top-nav__link", active && "is-active")}
                    aria-current={active ? "true" : undefined}
                    onClick={() => openGroup(routes)}
                  >
                    <span>{group}</span>
                  </button>
                );
              })}
            </nav>
            <UserMenu roleLabel={roleLabel} onLogout={() => void logout()} />
          </header>
          {activeGroupRoutes.length > 0 && (
            <TopSubnav routes={activeGroupRoutes} />
          )}
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
          />
        </aside>
        <div className="app-main">
          <main className="page-content">
            <Outlet />
          </main>
        </div>
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
          <UserMenu roleLabel={roleLabel} onLogout={() => void logout()} />
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
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
