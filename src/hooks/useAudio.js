import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudio() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(null);
  const [audioFiles, setAudioFiles] = useState({}); // { "1:1": url, ... }
  const [segments, setSegments] = useState({});      // { "1:1": [[start,end,wordIdx], ...] }
  const segmentTimerRef = useRef(null);

  // Initialise or reuse audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentWordIndex(null);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // Word highlight via segments (timestamps)
  const startWordTracking = useCallback((verseKey, segs) => {
    const audio = audioRef.current;
    if (!segs || !segs.length) return;

    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);

    segmentTimerRef.current = setInterval(() => {
      const currentMs = audio.currentTime * 1000;
      // segments format: [duration_ms, word_index] cumulative
      let wordIdx = null;
      let elapsed = 0;
      for (const [duration, wIdx] of segs) {
        elapsed += duration;
        if (currentMs < elapsed) {
          wordIdx = wIdx;
          break;
        }
      }
      setCurrentWordIndex(wordIdx);
    }, 50);
  }, []);

  const stopWordTracking = useCallback(() => {
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    setCurrentWordIndex(null);
  }, []);

  // Load audio files for a chapter
  const loadAudioFiles = useCallback((ayahAudioList, ayahSegments) => {
    const files = {};
    const segs = {};
    ayahAudioList?.forEach(item => {
      files[item.verse_key] = item.url;
    });
    ayahSegments?.forEach(item => {
      segs[item.verse_key] = item.segments;
    });
    setAudioFiles(files);
    setSegments(segs);
  }, []);

  // Play a specific ayah
  const playAyah = useCallback((verseKey) => {
    const audio = audioRef.current;
    const url = audioFiles[verseKey];
    if (!url) return;

    stopWordTracking();

    const fullUrl = url.startsWith('http') ? url : `https://audio.qurancdn.com/${url}`;

    if (audio.src !== fullUrl) {
      audio.src = fullUrl;
    }

    setCurrentAyah(verseKey);
    audio.play().catch(console.error);

    const segs = segments[verseKey];
    if (segs) startWordTracking(verseKey, segs);
  }, [audioFiles, segments, startWordTracking, stopWordTracking]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    stopWordTracking();
  }, [stopWordTracking]);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(console.error);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    stopWordTracking();
    setCurrentAyah(null);
    setIsPlaying(false);
  }, [stopWordTracking]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopWordTracking();
      audioRef.current?.pause();
    };
  }, [stopWordTracking]);

  return {
    isPlaying,
    currentAyah,
    currentWordIndex,
    loadAudioFiles,
    playAyah,
    pause,
    resume,
    stop,
  };
}
