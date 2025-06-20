// src/components/layout/app-sidebar.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NextImage from 'next/image';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, FileQuestion, ClipboardList, Newspaper, QrCode, Download, Upload, Settings, School, BookOpenCheck, Users2, BarChart3, Megaphone, MessageSquare, Tags, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAppSettings } from '@/lib/firestore';
import type { AppSettings } from '@/types';
import { useAuth } from '@/hooks/use-auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  teacherAllowed?: boolean;
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: Home, teacherAllowed: true },
  { href: '/dashboard/subjects', label: 'المواد الدراسية', icon: BookOpenCheck, teacherAllowed: true },
  { href: '/dashboard/questions', label: 'الأسئلة', icon: FileQuestion, teacherAllowed: true },
  { href: '/dashboard/tags', label: 'التصنيفات', icon: Tags, teacherAllowed: true },
  { href: '/dashboard/exams', label: 'الامتحانات', icon: ClipboardList, teacherAllowed: true },
  { href: '/dashboard/analytics/exams', label: 'تحليلات الامتحانات', icon: BarChart3, adminOnly: true },
  { href: '/dashboard/news', label: 'الأخبار', icon: Newspaper, adminOnly: true },
  { href: '/dashboard/announcements', label: 'الإعلانات', icon: Megaphone, adminOnly: true },
  { href: '/dashboard/community', label: 'المجتمع', icon: MessageSquare, adminOnly: true },
  { href: '/dashboard/qr-codes', label: 'رموز QR', icon: QrCode, adminOnly: true },
  { href: '/dashboard/teachers', label: 'المدرسون', icon: Users2, adminOnly: true },
  { href: '/dashboard/export', label: 'تصدير البيانات', icon: Download, adminOnly: true },
  { href: '/dashboard/import', label: 'استيراد البيانات', icon: Upload, adminOnly: true },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin, isTeacher } = useAuth();
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoadingLogo(true);
      try {
        const settings = await getAppSettings();
        setAppSettings(settings);
      } catch (error) {
        console.error("Error fetching app settings for sidebar logo:", error);
      } finally {
        setIsLoadingLogo(false);
      }
    };
    fetchSettings();
  }, []);

  const appLogoUrl = appSettings?.appLogoUrl;
  const appName = appSettings?.appName || "اتمتني مسؤول";

  const getVisibleNavItems = () => {
    if (isAdmin) {
      return allNavItems;
    }
    if (isTeacher) {
      return allNavItems.filter(item => !item.adminOnly && item.teacherAllowed);
    }
    return []; // Default for non-admin/non-teacher (e.g., student, though they shouldn't reach dashboard)
  };

  const navItems = getVisibleNavItems();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="right">
      <SidebarHeader className="flex items-center justify-between p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className={cn(
              "relative flex items-center justify-center text-primary",
              "h-8 w-8 transition-all group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7"
            )}
          >
            {isLoadingLogo ? (
              <Loader2 className="h-full w-full animate-spin" />
            ) : appLogoUrl && appLogoUrl.trim() !== '' ? (
              <NextImage
                src={appLogoUrl}
                alt={`${appName} Logo`}
                fill
                sizes="(max-width: 768px) 28px, 32px"
                className="object-contain"
              />
            ) : (
              <School className="h-full w-full" />
            )}
          </div>
          <span className="text-lg font-semibold text-foreground transition-all group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden flex-grow text-right">
            {appName}
          </span>
        </Link>
        <div className="hidden md:block">
          <SidebarTrigger/>
        </div>
      </SidebarHeader>
      <ScrollArea className="flex-1">
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    className={cn(
                      "w-full justify-start",
                      pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')  ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                    )}
                    isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                    tooltip={{ children: item.label, side: 'left', align: 'center' }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="truncate text-right group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden flex-grow">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </ScrollArea>
      <SidebarFooter className="p-4">
        {isAdmin && (
            <Link href="/dashboard/settings">
                <SidebarMenuButton
                    className={cn(
                    "w-full justify-start",
                    pathname === '/dashboard/settings' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                    )}
                    isActive={pathname === '/dashboard/settings'}
                    tooltip={{ children: "الإعدادات", side: 'left', align: 'center' }}
                >
                    <Settings className="h-5 w-5 shrink-0" />
                    <span className="truncate text-right group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden flex-grow">الإعدادات</span>
                </SidebarMenuButton>
            </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
