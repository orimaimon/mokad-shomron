import { useEffect } from 'react';
import { mediaUrl } from '../lib/utils';

export function isVideo(src: string) {
  return /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(src) || src.startsWith('data:video/');
}

export function MediaThumb({ src, onClick, size = 72 }: { src: string; onClick: () => void; size?: number }) {
  const video = isVideo(src);
  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: 7, border: '1px solid var(--line-2)',
        cursor: 'zoom-in', flexShrink: 0, overflow: 'hidden', position: 'relative',
        background: '#000',
      }}
      title={video ? 'הצג סרטון' : 'הצג תמונה'}
    >
      {video ? (
        <>
          <video src={mediaUrl(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
            <span style={{ fontSize: size * 0.25, color: '#fff' }}>▶</span>
          </div>
        </>
      ) : (
        <img src={mediaUrl(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

export function MediaInline({ src, onClick, maxHeight = 160 }: { src: string; onClick: () => void; maxHeight?: number }) {
  const video = isVideo(src);
  return (
    <div style={{ marginTop: 6, position: 'relative', cursor: 'zoom-in' }} onClick={onClick}>
      {video ? (
        <>
          <video
            src={mediaUrl(src)}
            muted
            style={{ maxWidth: '100%', maxHeight, borderRadius: 6, display: 'block', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)', borderRadius: 6,
          }}>
            <span style={{ fontSize: 28, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>▶</span>
          </div>
        </>
      ) : (
        <img
          src={mediaUrl(src)}
          alt=""
          style={{ maxWidth: '100%', maxHeight, borderRadius: 6, display: 'block', objectFit: 'cover' }}
        />
      )}
    </div>
  );
}

export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const video = isVideo(src);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60000,
        background: 'rgba(0,0,0,0.94)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
      }}
    >
      {video ? (
        <video
          src={mediaUrl(src)}
          controls
          autoPlay
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,.7)', cursor: 'default', background: '#000' }}
        />
      ) : (
        <img
          src={mediaUrl(src)}
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,.7)', cursor: 'default' }}
        />
      )}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 20, left: 20,
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8, padding: '6px 14px', color: '#fff', cursor: 'pointer', fontSize: 13,
        }}
      >
        סגור · Esc
      </button>
    </div>
  );
}
