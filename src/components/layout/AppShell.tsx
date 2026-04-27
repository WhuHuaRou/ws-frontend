import type { ReactNode } from "react";

const navItems = ["数据总览", "资源管理", "设备台账", "采集任务", "系统设置"];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <strong>温室中台</strong>
            <small>Greenhouse Ops</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, index) => (
            <button className={index === 0 ? "nav-item nav-item-active" : "nav-item"} key={item}>
              <span className="nav-dot" aria-hidden="true" />
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">数据展示页面</p>
            <h1>温室运行数据展示中心</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="刷新数据">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12A8 8 0 0 1 17.7 6.4M18 3v4h-4M6 21v-4h4" />
              </svg>
            </button>
            <button className="primary-button">导出报表</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
