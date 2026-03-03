import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER } from './api';
import Home from './components/Home';
import PreJoinScreen from './components/PreJoinScreen';
import MeetingRoom from './components/MeetingRoom';
import MonitorView from './components/MonitorView';
import MeetingDetail from './components/MeetingDetail';
import Dashboard from './components/Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';

export default function App() {
  const [view, setView] = useState('home');
  const [meetingId, setMeetingId] = useState('');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('audience');
  const [meetingName, setMeetingName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [analyticsId, setAnalyticsId] = useState('');
  const [reconnecting, setReconnecting] = useState(false);
  const [preJoinStream, setPreJoinStream] = useState(null);
  const [preJoinMuted, setPreJoinMuted] = useState(true);
  const [preJoinVideoOff, setPreJoinVideoOff] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const preJoinId = (params.get('join') || '').toUpperCase();
  const monitorId = (params.get('monitor') || '').toUpperCase();
  const monitorName = params.get('name') || 'Monitor';

  // Monitor view opens in its own tab
  if (monitorId) {
    return <MonitorView meetingId={monitorId} userName={monitorName} />;
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('engageai_session');
    if (!saved) return;
    try {
      const { meetingId: savedId, userName: savedName, role: savedRole, meetingName: savedMeetingName } = JSON.parse(saved);
      if (!savedId || !savedName) { sessionStorage.removeItem('engageai_session'); return; }
      setReconnecting(true);
      axios.get(`${SERVER}/session/${savedId}`)
        .then((res) => {
          if (res.status === 200) {
            setMeetingId(savedId);
            setUserName(savedName);
            setRole(savedRole || 'audience');
            setMeetingName(savedMeetingName || res.data.meetingName || '');
            setView('meeting');
          } else {
            sessionStorage.removeItem('engageai_session');
          }
        })
        .catch(() => {
          sessionStorage.removeItem('engageai_session');
        })
        .finally(() => setReconnecting(false));
    } catch {
      sessionStorage.removeItem('engageai_session');
    }
  }, []);

  function enterMeeting(id, name, meetingRole, mName) {
    setMeetingId(id);
    setUserName(name);
    setRole(meetingRole);
    setMeetingName(mName || '');
    setView('prejoin');
    sessionStorage.setItem('engageai_session', JSON.stringify({ meetingId: id, userName: name, role: meetingRole, meetingName: mName || '' }));
  }

  function joinFromPreJoin(stream, isMuted, isVideoOff) {
    setPreJoinStream(stream);
    setPreJoinMuted(isMuted);
    setPreJoinVideoOff(isVideoOff);
    setView('meeting');
  }

  function goHome() {
    setView('home');
    setMeetingId('');
    setUserName('');
    setRole('audience');
    setAnalyticsId('');
    sessionStorage.removeItem('engageai_session');
    window.history.replaceState({}, '', window.location.pathname);
  }

  function viewAnalytics(id) {
    setAnalyticsId(id);
    setView('analytics');
  }

  function viewDashboard() {
    setView('dashboard');
  }

  return (
    <>
      {reconnecting && (
        <LoadingSpinner message="Reconnecting to meeting..." />
      )}
      {view === 'home' && (
        <Home
          onStart={(id, name, mName) => enterMeeting(id, name, 'speaker', mName)}
          onJoin={(id, name, mName) => enterMeeting(id, name, 'audience', mName)}
          preJoinId={preJoinId}
          isAdmin={isAdmin}
          onAdminLogin={() => setIsAdmin(true)}
          onAdminLogout={() => setIsAdmin(false)}
          onViewDashboard={viewDashboard}
          onViewAnalytics={viewAnalytics}
        />
      )}
      {view === 'prejoin' && (
        <PreJoinScreen
          meetingId={meetingId}
          userName={userName}
          meetingName={meetingName}
          onJoin={joinFromPreJoin}
          onBack={goHome}
        />
      )}
      {view === 'meeting' && (
        <MeetingRoom
          meetingId={meetingId}
          userName={userName}
          role={role}
          meetingName={meetingName}
          initialStream={preJoinStream}
          initialMuted={preJoinMuted}
          initialVideoOff={preJoinVideoOff}
          onLeave={goHome}
        />
      )}
      {view === 'dashboard' && (
        <Dashboard
          onViewAnalytics={viewAnalytics}
          onBack={goHome}
        />
      )}
      {view === 'analytics' && (
        <MeetingDetail
          meetingId={analyticsId}
          onBack={() => setView('dashboard')}
        />
      )}
    </>
  );
}
