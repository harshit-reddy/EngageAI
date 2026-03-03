import React, { useState, useRef, useEffect } from 'react';

export default function ToolbarOverflow({ children }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);

  return (
    <div className="toolbar-overflow-wrapper" ref={menuRef}>
      <button
        className={`tool-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="More options"
        aria-label="More options"
      >
        <span className="tool-btn-icon">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="tool-btn-label">More</span>
      </button>
      {open && (
        <div className="toolbar-overflow-menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
