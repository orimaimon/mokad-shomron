export function Icon({ name, lg, className = '', ...rest }) {
  const cls = `ic${lg ? ' lg' : ''}${className ? ' ' + className : ''}`;
  const paths = {
    Pulse: <path d="M3 12h4l2-6 4 12 2-6h6"/>,
    Shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>,
    Siren: <path d="M5 18h14v-3a7 7 0 0 0-14 0v3zM12 4v3M4 9l-2 1M22 10l-2-1"/>,
    Map: <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>,
    Pin: <><path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></>,
    Camera: <path d="M3 8h4l2-2h6l2 2h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>,
    Plus: <path d="M12 5v14M5 12h14"/>,
    Check: <path d="M5 12l4 4 10-10"/>,
    X: <path d="M6 6l12 12M18 6L6 18"/>,
    Edit: <path d="M4 20h4l11-11-4-4L4 16v4zM14 6l4 4"/>,
    Bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0"/>,
    Search: <><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></>,
    Filter: <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/>,
    Doc: <path d="M7 3h8l5 5v13H7zM15 3v5h5"/>,
    Download: <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/>,
    User: <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></>,
    Truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></>,
    Heli: <path d="M2 7h20M9 11h7l3 3-2 3H9zM9 11v-4M9 7H6M9 17v3"/>,
    Hospital: <path d="M4 21V5h16v16zM12 9v6M9 12h6"/>,
    Clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    Send: <path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z"/>,
    Image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 18l5-5 4 4 3-3 6 6"/></>,
    Wifi: <path d="M3 9c5-4 13-4 18 0M6 13c3.5-3 9-3 12 0M9 17c1.5-1.5 4.5-1.5 6 0M12 21h.01"/>,
    Settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z"/></>,
    Archive: <path d="M3 7l2-3h14l2 3M3 7v13h18V7M9 11h6"/>,
  };
  return (
    <svg viewBox="0 0 24 24" className={cls} {...rest}>
      {paths[name]}
    </svg>
  );
}

export function FormattedText({ text }) {
  const parts = [];
  const re = /(\*[^*]+\*|\$[^$]+\$)/g;
  let m, last = 0, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const t = m[0];
    if (t.startsWith('*')) parts.push(<strong key={key++}>{t.slice(1, -1)}</strong>);
    else parts.push(<span key={key++} className="red">{t.slice(1, -1)}</span>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return <>{parts}</>;
}
