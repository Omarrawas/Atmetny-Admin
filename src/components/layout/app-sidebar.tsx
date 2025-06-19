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
import { Button } from '@/components/ui/button'; 
import { Home, FileQuestion, ClipboardList, Newspaper, QrCode, Download, Upload, Settings, School, BookOpenCheck, Users2, LayoutList, Tags, BarChart3, Megaphone, MessageSquare, Loader2 } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import { getAppSettings } from '@/lib/firestore'; 
import type { AppSettings } from '@/types'; 

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/subjects', label: 'Subjects', icon: BookOpenCheck },
  { href: '/dashboard/questions', label: 'Questions', icon: FileQuestion },
  { href: '/dashboard/tags', label: 'Tags', icon: Tags },
  { href: '/dashboard/exams', label: 'Exams', icon: ClipboardList },
  { href: '/dashboard/analytics/exams', label: 'Exam Analytics', icon: BarChart3 },
  { href: '/dashboard/news', label: 'News', icon: Newspaper },
  { href: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/dashboard/community', label: 'Community', icon: MessageSquare },
  { href: '/dashboard/qr-codes', label: 'QR Codes', icon: QrCode },
  { href: '/dashboard/teachers', label: 'Teachers', icon: Users2 },
  { href: '/dashboard/export', label: 'Export Data', icon: Download },
  { href: '/dashboard/import', label: 'Import Data', icon: Upload },
];

export default function AppSidebar() {
  const pathname = usePathname();
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
  const appName = appSettings?.appName || "Atmetny Admin";

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="right"> {/* Changed side to "right" */}
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
          <span className="text-lg font-semibold text-foreground transition-all group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden">
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
                    <span className="truncate group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </ScrollArea>
      <SidebarFooter className="p-4">
        <Link href="/dashboard/settings">
            <SidebarMenuButton
                className={cn(
                "w-full justify-start",
                pathname === '/dashboard/settings' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                )}
                isActive={pathname === '/dashboard/settings'}
                tooltip={{ children: "Settings", side: 'left', align: 'center' }}
            >
                <Settings className="h-5 w-5 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden">Settings</span>
            </SidebarMenuButton>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
