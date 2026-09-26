import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export default function LiveKitCallModal({ call, title, onLeave, onEnd, ending = false }) {
  if (!call) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-lg bg-[#101318]">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-4 text-white">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          {onEnd ? (
            <button onClick={onEnd} disabled={ending} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {ending ? 'Ending…' : 'End Call'}
            </button>
          ) : (
            <button onClick={onLeave} className="rounded bg-white/10 px-4 py-2 text-sm font-semibold text-white">Leave Call</button>
          )}
        </header>
        <div className="min-h-0 flex-1">
          <LiveKitRoom serverUrl={call.serverUrl} token={call.token} connect video audio data-lk-theme="default" onDisconnected={onLeave}>
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}
