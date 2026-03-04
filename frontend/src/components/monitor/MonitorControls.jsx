import React from 'react';
import { SERVER, authAxios } from '../../api';

export default function MonitorControls({ meetingId, analysisStopped, onStatusChange }) {
  async function startMonitoring() {
    try {
      await authAxios.post(`${SERVER}/session/${meetingId}/monitor`);
      onStatusChange(false);
    } catch {}
  }

  async function stopMonitoring() {
    try {
      await authAxios.post(`${SERVER}/session/${meetingId}/stop-monitor`);
      onStatusChange(true);
    } catch {}
  }

  return (
    <div className="monitor-controls">
      {analysisStopped ? (
        <button className="monitor-ctrl-btn start" onClick={startMonitoring}>
          Start Monitoring
        </button>
      ) : (
        <button className="monitor-ctrl-btn stop" onClick={stopMonitoring}>
          Stop Monitoring
        </button>
      )}
    </div>
  );
}
