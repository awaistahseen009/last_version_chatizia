import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, Loader } from 'lucide-react';

interface VoiceDemoProps {
  voiceId: string;
  apiKey?: string;
}

const VoiceDemo: React.FC<VoiceDemoProps> = ({ voiceId, apiKey }) => {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVoiceIdRef = useRef<string>(voiceId);
  
  // Sample text for voice demo
  const demoText = "Hello! This is a sample of how I sound. I hope you like my voice.";

  // When voiceId changes, clear the current audio and generate a new demo
  useEffect(() => {
    if (voiceId !== lastVoiceIdRef.current) {
      // Voice ID has changed, clear current audio
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      setPlaying(false);
      lastVoiceIdRef.current = voiceId;
      
      // Auto-generate for the new voice
      if (apiKey) {
        generateVoiceDemo();
      }
    }
  }, [voiceId, apiKey]);

  // Clean up audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const generateVoiceDemo = async () => {
    if (!apiKey) {
      setError("ElevenLabs API key is not configured. Please add it to your environment variables.");
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: demoText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Text-to-speech failed: ${response.status} ${errorText}`);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Create audio element
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => setPlaying(false);
      } else {
        audioRef.current.src = url;
      }

    } catch (error) {
      console.error('Failed to generate voice demo:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate voice demo');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) {
      generateVoiceDemo();
      return;
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch(err => {
          console.error('Playback error:', err);
          setError('Failed to play audio');
        });
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={togglePlayback}
        disabled={loading}
        className="flex items-center space-x-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        ) : playing ? (
          <>
            <Pause className="w-4 h-4" />
            <span>Pause Demo</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span>{audioUrl ? 'Play Demo' : 'Generate Voice Demo'}</span>
          </>
        )}
      </button>
      
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
};

export default VoiceDemo;