import React, { useState } from 'react';
import Home             from './components/Home';
import SpeakerDashboard from './components/SpeakerDashboard';
import ParticipantView  from './components/ParticipantView';

/**
 * State machine:  'home' | 'speaker' | 'participant'
 *
 * URL param: ?join=MEETINGID
 *   When a participant opens a shared link like:
 *     http://192.168.1.100:3000?join=A3F1C2
 *   the Home page auto-switches to the Join tab with the ID pre-filled.
 */
export default function App() {
  const [view,      setView]      = useState('home');
  const [meetingId, setMeetingId] = useState('');
  const [userName,  setUserName]  = useState('');

  const params    = new URLSearchParams(window.location.search);
  const preJoinId = (params.get('join') || '').toUpperCase();

  function enterSpeaker(id, name) {
    setMeetingId(id); setUserName(name); setView('speaker');
  }
  function enterParticipant(id, name) {
    setMeetingId(id); setUserName(name); setView('participant');
  }
  function goHome() {
    setView('home'); setMeetingId(''); setUserName('');
  }

  return (
    <>
      {view === 'home'        && <Home onStart={enterSpeaker} onJoin={enterParticipant} preJoinId={preJoinId} />}
      {view === 'speaker'     && <SpeakerDashboard meetingId={meetingId} userName={userName} onEnd={goHome} />}
      {view === 'participant' && <ParticipantView  meetingId={meetingId} userName={userName} onLeave={goHome} />}
    </>
  );
}
