import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Menu,
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
import {
  appRoutes,
  getRouteByPath,
  routeGroups,
  type AppRoute,
} from "./routes/config";
import { setSession, useAppDispatch, useAppSelector } from "./store/auth";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  PageHeader,
} from "./components/ui";
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
  const dispatch = useAppDispatch();
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
    onSuccess: (nextSession) => {
      dispatch(setSession(nextSession));
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

export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("garage.web.sidebar") === "collapsed",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const session = useAppSelector((state) => state.auth.session);
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = getRouteByPath(location.pathname);
  const isAdmin = session?.user.role?.toUpperCase() === "ADMIN";
  const visibleRoutes = appRoutes.filter(
    (route) => !route.adminOnly || isAdmin,
  );
  const dashboard = visibleRoutes.find((route) => route.path === "/");

  const toggleSidebar = () => {
    setCollapsed((value) => {
      localStorage.setItem(
        "garage.web.sidebar",
        value ? "expanded" : "collapsed",
      );
      return !value;
    });
  };
  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

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
          <Link to="/" className="brand-link" aria-label="Garage dashboard">
            <span className="brand-mark brand-mark--small">
              <Wrench aria-hidden="true" />
            </span>
            <span>
              <strong>Garage</strong>
              <small></small>
            </span>
          </Link>
          <button
            className="icon-button sidebar__mobile-close"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <nav className="sidebar__nav" aria-label="Primary navigation">
          {dashboard && (
            <SidebarLink
              route={dashboard}
              collapsed={collapsed}
              onNavigate={() => setDrawerOpen(false)}
            />
          )}
          {routeGroups.map((group) => {
            const routes = visibleRoutes.filter(
              (route) => route.group === group,
            );
            if (!routes.length) return null;
            return (
              <section className="nav-group" key={group}>
                <h2>{group}</h2>
                {routes.map((route) => (
                  <SidebarLink
                    key={route.path}
                    route={route}
                    collapsed={collapsed}
                    onNavigate={() => setDrawerOpen(false)}
                  />
                ))}
              </section>
            );
          })}
        </nav>
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
          <details className="user-menu">
            <summary>
              <span className="avatar">
                {(
                  session?.user.fullName ??
                  session?.user.username ??
                  "U"
                ).charAt(0)}
              </span>
              <span className="user-menu__text">
                <strong>
                  {session?.user.fullName ?? session?.user.username}
                </strong>
                <small>{session?.user.role ?? "User"}</small>
              </span>
              <ChevronsUpDown aria-hidden="true" />
            </summary>
            <div className="user-menu__popover">
              <div>
                <strong>
                  {session?.user.fullName ?? session?.user.username}
                </strong>
                <small>
                  {session?.user.email ??
                    session?.user.role ??
                    "Garage user"}
                </small>
              </div>
              <Button variant="ghost" onClick={() => void logout()}>
                <LogOut aria-hidden="true" /> Sign out
              </Button>
            </div>
          </details>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const PlaceholderPage = ({ route }: { route: AppRoute }) => {
  const isAdmin = useAppSelector(
    (state) => state.auth.session?.user.role?.toUpperCase() === "ADMIN",
  );
  if (route.adminOnly && !isAdmin) {
    return (
      <ErrorState
        title="Access restricted"
        message="This area is available to administrators only."
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
