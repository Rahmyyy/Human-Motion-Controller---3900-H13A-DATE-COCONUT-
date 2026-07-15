interface RecordingCountdownProps {
  secondsRemaining: number;
}

export default function RecordingCountdown({ secondsRemaining }: RecordingCountdownProps) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-slate-950/35 text-white">
      <div className="text-center drop-shadow-lg">
        <p className="text-7xl font-bold tabular-nums">{secondsRemaining}</p>
        <p className="mt-2 text-lg font-medium">Get ready</p>
      </div>
    </div>
  );
}
