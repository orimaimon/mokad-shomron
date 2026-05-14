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
  Users,
  Truck,
  Hospital,
  Clock,
  Send,
  Image as ImageIcon,
  Wifi,
  WifiOff,
  Settings,
  Archive,
  Info,
  AlertTriangle,
  Monitor,
  Trash2,
  Globe,
  List,
  CheckSquare,
  CheckCircle2,
  ClipboardList,
  LogOut,
  ChevronDown,
  ChevronRight,
  Layers,
  Radio,
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
  Edit3: Edit3,
  Bell: Bell,
  Search: Search,
  Filter: Filter,
  Doc: FileText,
  Download: Download,
  User: User,
  Users: Users,
  Truck: Truck,
  Hospital: Hospital,
  Clock: Clock,
  Send: Send,
  Image: ImageIcon,
  Wifi: Wifi,
  WifiOff: WifiOff,
  Settings: Settings,
  Archive: Archive,
  AlertTriangle: AlertTriangle,
  Monitor: Monitor,
  Trash: Trash2,
  Globe: Globe,
  List: List,
  CheckSquare: CheckSquare,
  CheckCircle: CheckCircle2,
  CheckCircle2: CheckCircle2,
  ClipboardList: ClipboardList,
  LogOut: LogOut,
  ChevronDown: ChevronDown,
  ChevronRight: ChevronRight,
  Layers: Layers,
  Radio: Radio,
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
