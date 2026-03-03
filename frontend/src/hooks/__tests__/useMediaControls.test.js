import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useMediaControls from '../useMediaControls';

function createMockStream() {
  const audioTrack = { enabled: true };
  const videoTrack = { enabled: true };
  return {
    getAudioTracks: () => [audioTrack],
    getVideoTracks: () => [videoTrack],
    _audioTrack: audioTrack,
    _videoTrack: videoTrack,
  };
}

describe('useMediaControls', () => {
  it('starts with audio and video enabled', () => {
    const streamRef = { current: createMockStream() };
    const { result } = renderHook(() => useMediaControls(streamRef));
    expect(result.current.isMuted).toBe(false);
    expect(result.current.isVideoOff).toBe(false);
  });

  it('toggleMute disables audio track', () => {
    const stream = createMockStream();
    const streamRef = { current: stream };
    const { result } = renderHook(() => useMediaControls(streamRef));

    act(() => { result.current.toggleMute(); });
    expect(result.current.isMuted).toBe(true);
    expect(stream._audioTrack.enabled).toBe(false);
  });

  it('toggleMute twice re-enables audio', () => {
    const stream = createMockStream();
    const streamRef = { current: stream };
    const { result } = renderHook(() => useMediaControls(streamRef));

    act(() => { result.current.toggleMute(); });
    act(() => { result.current.toggleMute(); });
    expect(result.current.isMuted).toBe(false);
    expect(stream._audioTrack.enabled).toBe(true);
  });

  it('toggleVideo disables video track', () => {
    const stream = createMockStream();
    const streamRef = { current: stream };
    const { result } = renderHook(() => useMediaControls(streamRef));

    act(() => { result.current.toggleVideo(); });
    expect(result.current.isVideoOff).toBe(true);
    expect(stream._videoTrack.enabled).toBe(false);
  });

  it('forceMute always disables audio', () => {
    const stream = createMockStream();
    const streamRef = { current: stream };
    const { result } = renderHook(() => useMediaControls(streamRef));

    act(() => { result.current.forceMute(); });
    expect(result.current.isMuted).toBe(true);
    expect(stream._audioTrack.enabled).toBe(false);
  });

  it('handles null stream gracefully', () => {
    const streamRef = { current: null };
    const { result } = renderHook(() => useMediaControls(streamRef));

    // Should not throw
    act(() => { result.current.toggleMute(); });
    act(() => { result.current.toggleVideo(); });
    act(() => { result.current.forceMute(); });
  });
});
