import { useState, useEffect } from 'react';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

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

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        className={`mobile-menu-toggle ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        type="button"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {isOpen && (
        <div className="mobile-menu-overlay active" onClick={handleClose}>
          <nav className="mobile-nav" onClick={(e) => e.stopPropagation()}>
            <a href="/" className="mobile-nav-link terminal-hover" onClick={handleClose}>
              <span className="nav-icon">🏠</span>
              <span>Home</span>
            </a>
            <a href="/posts" className="mobile-nav-link terminal-hover" onClick={handleClose}>
              <span className="nav-icon">📚</span>
              <span>Tutorials</span>
            </a>
            <a href="/category/docker" className="mobile-nav-link terminal-hover" onClick={handleClose}>
              <span className="nav-icon">🐳</span>
              <span>Docker</span>
            </a>
            <a href="/category/linux" className="mobile-nav-link terminal-hover" onClick={handleClose}>
              <span className="nav-icon">🐧</span>
              <span>Linux</span>
            </a>
            <a href="/category/devops" className="mobile-nav-link terminal-hover" onClick={handleClose}>
              <span className="nav-icon">⚙️</span>
              <span>DevOps</span>
            </a>
            <a href="/search" className="mobile-nav-link terminal-hover" onClick={handleClose}>
              <span className="nav-icon">🔍</span>
              <span>Search</span>
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
