import type { ReactNode } from "react";

export type ShellNavItem = {
  id: string;
  label: string;
};

type AppShellProps = {
  children: ReactNode;
  navItems: ShellNavItem[];
  activeNavId: string;
  eyebrow: string;
  title: string;
  primaryAction?: string;
  onPrimaryAction?: () => void;
  onNavChange: (navId: string) => void;
};

export function AppShell({
  children,
  navItems,
  activeNavId,
  eyebrow,
  title,
  primaryAction,
  onPrimaryAction,
  onNavChange,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <strong>牛只多模态</strong>
            <small>Cattle Data Console</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              className={activeNavId === item.id ? "nav-item nav-item-active" : "nav-item"}
              key={item.id}
              onClick={() => onNavChange(item.id)}
            >
              <span className="nav-dot" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="刷新数据">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12A8 8 0 0 1 17.7 6.4M18 3v4h-4M6 21v-4h4" />
              </svg>
            </button>
            {primaryAction ? (
              <button className="primary-button" onClick={onPrimaryAction} type="button">
                {primaryAction}
              </button>
            ) : null}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
