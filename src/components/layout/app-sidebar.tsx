'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookCopy,
  HelpCircle,
  ScrollText,
  Users,
  Settings,
  LogOut,
  ClipboardList,
  BarChart3,
  Megaphone,
  QrCode,
  UploadCloud,
  DownloadCloud,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/config/firebaseClient';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/dashboard/subjects', label: 'إدارة المواد', icon: BookCopy },
  { href: '/dashboard/questions', label: 'بنك الأسئلة', icon: HelpCircle },
  { href: '/dashboard/exams', label: 'إدارة الامتحانات', icon: ScrollText },
  // { href: '/dashboard/users', label: 'إدارة المستخدمين', icon: Users }, // Covered by UserTable on dashboard
  // { href: '/dashboard/analytics/exams', label: 'تحليلات الامتحانات', icon: BarChart3 },
  // { href: '/dashboard/news', label: 'إدارة الأخبار', icon: ClipboardList },
  // { href: '/dashboard/announcements', label: 'الإعلانات الموجهة', icon: Megaphone },
  // { href: '/dashboard/qr-codes', label: 'رموز QR', icon: QrCode },
  // { href: '/dashboard/teachers', label: 'إدارة المدرسين', icon: GraduationCap },
  // { href: '/dashboard/import', label: 'استيراد البيانات', icon: UploadCloud },
  // { href: '/dashboard/export', label: 'تصدير البيانات', icon: DownloadCloud },
  // { href: '/dashboard/settings', label: 'إعدادات التطبيق', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <aside className="flex h-full w-64 flex-col border-l border-border bg-card p-4 shadow-lg">
      <div className="mb-6 flex items-center justify-center space-x-2 rtl:space-x-reverse">
        {/* Replace with actual logo if available */}
        <Image src="https://placehold.co/40x40.png" alt="Atmetny Logo" width={40} height={40} data-ai-hint="logo education" className="rounded-md" />
        <h1 className="text-xl font-bold font-headline text-primary">Atmetny Admin</h1>
      </div>
      <nav className="flex-grow space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant={pathname === item.href ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            asChild
          >
            <Link href={item.href} className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <Separator className="my-4" />
      {user && (
        <div className="mb-4 p-2 text-center">
          <p className="text-sm font-medium">{user.displayName || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.role}</p>
        </div>
      )}
      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0" />
        تسجيل الخروج
      </Button>
    </aside>
  );
}
