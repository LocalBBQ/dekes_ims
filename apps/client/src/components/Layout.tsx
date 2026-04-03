import { useState, useEffect } from "react";
import { Link, Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PATH_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Shop tasks",
  "/inventory": "Inventory",
  "/admin/locations": "Locations",
  "/admin/categories": "Categories",
  "/admin/users": "Users",
};

function getPageTitle(pathname: string): string {
  if (pathname === "/" || pathname === "") return "Dashboard";
  if (pathname === "/tasks") return "Shop tasks";
  if (pathname === "/inventory/new") return "New item";
  if (/^\/inventory\/[^/]+\/edit$/.test(pathname)) return "Edit item";
  if (/^\/inventory\/[^/]+$/.test(pathname)) return "Item";
  for (const path of Object.keys(PATH_TITLES)) {
    if (pathname === path || pathname.startsWith(path + "/")) return PATH_TITLES[path];
  }
  return "Menu";
}

/** Parent route for legacy-style header Back; respects location.state.returnTo when safe */
function getBackTarget(pathname: string, state: unknown): string | null {
  if (pathname === "/" || pathname === "") return null;

  const safeReturn = (r: unknown): string | null =>
    typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? r : null;

  if (pathname === "/inventory") return "/";
  if (pathname === "/inventory/new") return "/inventory";

  const editMatch = pathname.match(/^\/inventory\/([^/]+)\/edit$/);
  if (editMatch) return `/inventory/${editMatch[1]}`;

  if (/^\/inventory\/[^/]+$/.test(pathname)) {
    const rt = safeReturn((state as { returnTo?: string } | null)?.returnTo);
    if (rt) return rt;
    return "/inventory";
  }

  if (pathname.startsWith("/admin/")) return "/";

  if (pathname === "/tasks") return "/";

  return "/";
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const pageTitle = getPageTitle(location.pathname);
  const backTarget = getBackTarget(location.pathname, location.state);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const navLinkMobile = ({ isActive }: { isActive: boolean }) =>
    `block w-full text-left px-4 py-3.5 rounded-xl text-base font-medium transition ${isActive ? "bg-neutral-700 text-white" : "text-neutral-200 hover:bg-neutral-700/80 active:bg-neutral-600"}`;

  const mainLinksMobile = (
    <>
      <NavLink to="/" end className={navLinkMobile} onClick={() => setMenuOpen(false)}>
        Dashboard
      </NavLink>
      <NavLink to="/inventory" className={navLinkMobile} onClick={() => setMenuOpen(false)}>
        Inventory
      </NavLink>
      <NavLink to="/tasks" className={navLinkMobile} onClick={() => setMenuOpen(false)}>
        Shop tasks
      </NavLink>
      {user?.role === "admin" && (
        <>
          <NavLink to="/admin/locations" className={navLinkMobile} onClick={() => setMenuOpen(false)}>
            Locations
          </NavLink>
          <NavLink to="/admin/categories" className={navLinkMobile} onClick={() => setMenuOpen(false)}>
            Categories
          </NavLink>
          <NavLink to="/admin/users" className={navLinkMobile} onClick={() => setMenuOpen(false)}>
            Users
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="relative min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="absolute left-4 top-0 z-[100] -translate-y-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-neutral-900 shadow-lg transition-transform focus:translate-y-4 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-20 bg-neutral-800 border-b border-neutral-700 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 min-h-[52px] safe-area-inset-top">
        {/* Left: Back (non-dashboard) + page title */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          {backTarget != null && (
            <Link
              to={backTarget}
              onClick={() => setMenuOpen(false)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white transition sm:gap-1.5 sm:px-3"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="whitespace-nowrap">Back</span>
            </Link>
          )}
          <span className="text-neutral-100 font-semibold truncate min-w-0">{pageTitle}</span>
        </div>

        {/* Right: menu opens navigation + account (logout lives in drawer) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="shrink-0 p-2 -mr-1 rounded-lg text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="app-navigation-panel"
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            <svg
              className="w-6 h-6 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Slide-out overlay (all breakpoints) */}
      <div
        className="fixed inset-0 z-10 bg-black/40 backdrop-blur-md transition-opacity duration-300 ease-out"
        style={{
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          visibility: menuOpen ? "visible" : "hidden",
        }}
        onClick={() => setMenuOpen(false)}
        aria-hidden
      />

      {/* Slide-out panel from right (all breakpoints) */}
      <aside
        id="app-navigation-panel"
        className="fixed top-0 right-0 z-20 h-full w-[min(300px,88vw)] max-w-full bg-neutral-800/95 border-l border-neutral-700/80 shadow-2xl flex flex-col transition-[transform] duration-300 ease-out"
        style={{ transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}
        aria-modal="true"
        aria-label="Main navigation"
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-700/80 shrink-0 safe-area-inset-top">
          <span className="font-semibold text-neutral-100 tracking-tight">Menu</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="p-2.5 -mr-1 rounded-xl text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-0.5 py-4">
          {mainLinksMobile}
        </nav>
        <div className="p-3 pt-2 border-t border-neutral-700/80 space-y-2 safe-area-inset-bottom">
          <p className="px-4 py-2 text-neutral-400 text-sm truncate" title={user?.email ?? undefined}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-3.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-sm font-medium transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 p-4 pb-8 safe-area-inset-bottom outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}
