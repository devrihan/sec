import { Headphones, Lock, Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { readTeamChannel, voiceRoster } from '../../services/battleComms';
import { useAppState } from '../../services/store';
import type { TeamBattle } from '../../types';
import { PlayerAvatar, studentName, useNow } from './battle-parts';

type MicState = 'off' | 'requesting' | 'live' | 'denied' | 'unsupported';

/**
 * The student's own microphone. In demo mode the audio stays on this device: it drives
 * the speaking ring and the mute control. A WebRTC connection per team would send it on.
 */
function useMicrophone() {
  const [state, setState] = useState<MicState>('off');
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const frameRef = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => stop, [stop]);

  const join = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      setMuted(false);
      setState('live');
      try {
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const loop = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) sum += ((v - 128) / 128) ** 2;
          setLevel(Math.sqrt(sum / data.length));
          frameRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        /* No level meter, but the mic and mute still work. */
      }
    } catch {
      setState('denied');
    }
  };

  const leave = () => {
    stop();
    setState('off');
  };

  const toggleMute = () => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMuted(next);
  };

  return { state, muted, speaking: state === 'live' && !muted && level > 0.04, join, leave, toggleMute };
}

const SPEAK_MS = 2500;

/** The viewer's private team voice channel. The roster comes from battleComms, so it only ever holds the viewer's team. */
export function VoicePanel({ battle, viewerId, teamName }: { battle: TeamBattle; viewerId: string; teamName: string }) {
  const roster = voiceRoster(battle, viewerId);
  const messages = useAppState((s) => readTeamChannel(s, battle.id, viewerId));
  const mic = useMicrophone();
  const now = useNow(500);
  const [silenced, setSilenced] = useState<string[]>([]);
  const inCall = mic.state === 'live';

  if (!roster) return null;

  // Simulated teammates "talk" while they are typing their thoughts in chat.
  const talking = new Set(
    inCall ? (messages ?? []).filter((m) => now - m.at < SPEAK_MS && m.senderId !== viewerId).map((m) => m.senderId) : [],
  );

  return (
    <section className="rounded-2xl border bg-background" aria-label="Team voice" data-testid="voice-panel">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-[16px] leading-6 font-medium text-foreground">
          <Headphones className="size-4" aria-hidden="true" />Team voice
          {inCall && <span className="rounded-full bg-good-soft px-2 py-0.5 text-[12px] leading-4 font-medium text-good">Live</span>}
        </h2>
        <span className="inline-flex items-center gap-1 text-[12px] leading-4 text-muted-foreground">
          <Lock className="size-3" aria-hidden="true" />{teamName} only
        </span>
      </header>
      <ul className="flex flex-wrap gap-4 px-4 py-3" data-testid="voice-roster">
        {roster.map((id) => {
          const me = id === viewerId;
          const off = me ? !inCall || mic.muted : !inCall || silenced.includes(id);
          const speaking = me ? mic.speaking : talking.has(id) && !silenced.includes(id);
          return (
            <li key={id} className="flex w-16 flex-col items-center gap-1 text-center" data-testid="voice-member">
              <PlayerAvatar studentId={id} speaking={speaking} />
              <span className="w-full truncate text-[12px] leading-4 text-foreground">{me ? 'You' : studentName(id)}</span>
              {me ? (
                <span className="text-muted-foreground" aria-label={off ? 'Your mic is off' : 'Your mic is on'}>
                  {off ? <MicOff className="size-3.5" /> : <Mic className="size-3.5 text-good" />}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!inCall}
                  onClick={() => setSilenced((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label={silenced.includes(id) ? `Unmute ${studentName(id)} for me` : `Mute ${studentName(id)} for me`}
                  aria-pressed={silenced.includes(id)}
                >
                  {silenced.includes(id) ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
        {!inCall ? (
          <Button size="sm" onClick={mic.join} disabled={mic.state === 'requesting'} data-testid="voice-join">
            <Mic className="size-4" />{mic.state === 'requesting' ? 'Allow the microphone…' : 'Join voice'}
          </Button>
        ) : (
          <>
            <Button size="sm" variant={mic.muted ? 'default' : 'outline'} onClick={mic.toggleMute} aria-pressed={mic.muted} data-testid="voice-mute">
              {mic.muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}{mic.muted ? 'Unmute' : 'Mute'}
            </Button>
            <Button size="sm" variant="outline" onClick={mic.leave}><PhoneOff className="size-4" />Leave voice</Button>
          </>
        )}
        <p className={cn('w-full text-[12px] leading-4', mic.state === 'denied' || mic.state === 'unsupported' ? 'text-bad' : 'text-muted-foreground')} role={mic.state === 'denied' ? 'alert' : undefined}>
          {mic.state === 'denied' && 'Microphone access was blocked. Allow it in your browser, or keep using the chat.'}
          {mic.state === 'unsupported' && "This browser can't use a microphone here. The chat still works."}
          {(mic.state === 'off' || mic.state === 'requesting' || mic.state === 'live') && 'Demo mode: your mic stays on this device and teammates’ voices are simulated.'}
        </p>
      </div>
    </section>
  );
}
