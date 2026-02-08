import { useState, useEffect } from 'react';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  // 关闭菜单当路由改变时
  useEffect(() => {
    const handleRouteChange = () => setIsOpen(false);

    // 监听点击导航链接
    const links = document.querySelectorAll('.mobile-nav-link');
    links.forEach(link => {
      link.addEventListener('click', handleRouteChange);
    });

    return () => {
      links.forEach(link => {
        link.removeEventListener('click', handleRouteChange);
      });
    };
  }, [isOpen]);

  // 防止背景滚动当菜单打开时
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button
        className={`mobile-menu-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <div className={`mobile-menu-overlay ${isOpen ? 'active' : ''}`}>
        <nav className="mobile-nav">
          <a href="/" className="mobile-nav-link terminal-hover">
            <span className="nav-icon">🏠</span>
            <span>Home</span>
          </a>
          <a href="/posts" className="mobile-nav-link terminal-hover">
            <span className="nav-icon">📚</span>
            <span>Tutorials</span>
          </a>
          <a href="/category/docker" className="mobile-nav-link terminal-hover">
            <span className="nav-icon">🐳</span>
            <span>Docker</span>
          </a>
          <a href="/category/linux" className="mobile-nav-link terminal-hover">
            <span className="nav-icon">🐧</span>
            <span>Linux</span>
          </a>
          <a href="/category/devops" className="mobile-nav-link terminal-hover">
            <span className="nav-icon">⚙️</span>
            <span>DevOps</span>
          </a>
          <a href="/search" className="mobile-nav-link terminal-hover">
            <span className="nav-icon">🔍</span>
            <span>Search</span>
          </a>
        </nav>
      </div>
    </>
  );
}
