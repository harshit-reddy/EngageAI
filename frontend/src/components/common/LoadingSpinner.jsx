import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="meeting-loading">
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{message}</p>
    </div>
  );
}
