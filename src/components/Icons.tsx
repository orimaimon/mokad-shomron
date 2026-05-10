import {
  Activity,
  Shield,
  Siren,
  Map as MapIcon,
  MapPin,
  Camera,
  Plus,
  Check,
  X,
  Edit3,
  Bell,
  Search,
  Filter,
  FileText,
  Download,
  User,
  Truck,
  Hospital,
  Clock,
  Send,
  Image as ImageIcon,
  Wifi,
  Settings,
  Archive,
  Info,
  type LucideProps
} from 'lucide-react';
import { cn } from '../lib/utils';

const iconMap = {
  Pulse: Activity,
  Shield: Shield,
  Siren: Siren,
  Map: MapIcon,
  Pin: MapPin,
  Camera: Camera,
  Plus: Plus,
  Check: Check,
  X: X,
  Edit: Edit3,
  Bell: Bell,
  Search: Search,
  Filter: Filter,
  Doc: FileText,
  Download: Download,
  User: User,
  Truck: Truck,
  Hospital: Hospital,
  Clock: Clock,
  Send: Send,
  Image: ImageIcon,
  Wifi: Wifi,
  Settings: Settings,
  Archive: Archive,
};

export function Icon({ name, lg, className = '', ...rest }: { name: string; lg?: boolean; className?: string } & Omit<LucideProps, 'ref'>) {
  const LucideIcon = iconMap[name as keyof typeof iconMap] || Info;
  return (
    <LucideIcon 
      className={cn("ic", lg && "lg", className)} 
      strokeWidth={2}
      {...rest} 
    />
  );
}

export function FormattedText({ text }: { text: string }) {
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
