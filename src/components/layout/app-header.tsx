// src/components/layout/app-header.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, School, UserCircle, Menu, Bell, Info, Loader2, MessageSquareWarning, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabaseClient'; 
import { useRouter, usePathname } from 'next/navigation';
import { useSidebar } from '../ui/sidebar';
import type { AdminNotification, AppSettings, AdminNotificationType } from '@/types'; 
import { getAppSettings, getAdminNotifications, markNotificationAsRead } from '@/lib/firestore';
import { formatDistanceToNow, parseISO } from 'date-fns'; 
import { arSA } from 'date-fns/locale';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image'; 
import { cn } from "@/lib/utils";

export default function AppHeader() {
  const { userProfile, user } = useAuth(); 
  const router = useRouter();
  const { toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const isLoadingNotificationsRef = useRef(false); // Ref to guard fetchNotifications

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoadingLogo(true);
      try {
        const settings = await getAppSettings();
        setAppSettings(settings);
      } catch (error) {
        console.error("Error fetching app settings for header logo:", error);
      } finally {
        setIsLoadingLogo(false);
      }
    };
    fetchSettings();
  }, []);

  const fetchNotifications = useCallback(async (markAsRead = false) => {
    if (isLoadingNotificationsRef.current) return; 
    isLoadingNotificationsRef.current = true;
    setIsLoadingNotifications(true); 
    try {
      const fetchedNots = await getAdminNotifications({ limit: 15, unreadOnly: !markAsRead });
      setNotifications(fetchedNots);
      if (markAsRead && fetchedNots.length > 0) {
        const unreadFetched = fetchedNots.filter(n => !n.is_read);
        if (unreadFetched.length > 0) {
           console.log(`${unreadFetched.length} unread notifications were fetched and would be marked as read.`);
        }
      }
    } catch (error) {
        console.error("Error fetching notifications:", error);
    } finally {
      setIsLoadingNotifications(false); 
      isLoadingNotificationsRef.current = false;
    }
  }, []); 

  const handleMarkAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && notification.is_read) return;

    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleNotificationDropdownToggle = (open: boolean) => {
    setIsNotificationDropdownOpen(open);
    if (open) {
      fetchNotifications(true); 
    }
  };
  
  useEffect(() => {
    if (pathname === '/dashboard') {
      fetchNotifications();
    }
  }, [pathname, fetchNotifications]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase Logout failed:", error);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error("Logout exception:", error);
    }
  };

  const getInitials = (nameOrEmail?: string | null) => {
    if (!nameOrEmail) return 'أد'; // Admin initials in Arabic
    const parts = nameOrEmail.split(' ');
    if (parts.length > 1 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[parts.length -1][0]).toUpperCase();
    }
    return nameOrEmail.substring(0, 2).toUpperCase();
  };
  
  const appLogoUrl = appSettings?.appLogoUrl;
  const appName = appSettings?.appName || "لوحة تحكم اتمتني";

  const getNotificationIcon = (type: AdminNotificationType) => {
    switch (type) {
      case 'qr_code_expiry_warning':
        return <MessageSquareWarning className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />;
      case 'low_question_count_subject':
        return <MessageSquareWarning className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />;
      case 'new_user_registered':
        return <UserPlus className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />;
      case 'system_update':
      case 'custom_admin_message':
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />;
    }
  };
  
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-2">
        {isMobile && (
           <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">تبديل الشريط الجانبي</span>
          </Button>
        )}
        <div className="relative flex h-7 w-7 items-center justify-center text-primary">
          {isLoadingLogo ? (
            <Loader2 className="h-full w-full animate-spin" />
          ) : appLogoUrl && appLogoUrl.trim() !== '' ? (
            <NextImage 
              src={appLogoUrl} 
              alt={`${appName} Logo`} 
              fill 
              sizes="28px" 
              className="object-contain" 
            />
          ) : (
            <School className="h-7 w-7 text-primary" />
          )}
        </div>
        <h1 className="text-xl font-semibold text-foreground">لوحة تحكم اتمتني</h1> 
      </div>
      
      <div className="flex items-center gap-2">
        <DropdownMenu onOpenChange={handleNotificationDropdownToggle}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -left-1 h-4 w-4 min-w-[1rem] p-0 flex items-center justify-center text-xs rounded-full"
                >
                  {unreadNotificationsCount}
                </Badge>
              )}
              <span className="sr-only">عرض الإشعارات</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 md:w-96" align="start">
            <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isLoadingNotifications ? (
              <DropdownMenuItem disabled className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin me-2" />
                جاري تحميل الإشعارات...
              </DropdownMenuItem>
            ) : notifications.length === 0 ? (
              <DropdownMenuItem disabled className="text-center text-muted-foreground p-4">
                لا توجد إشعارات جديدة.
              </DropdownMenuItem>
            ) : (
              <DropdownMenuGroup className="max-h-80 overflow-y-auto">
                {notifications.map(not => (
                  <DropdownMenuItem 
                    key={not.id} 
                    asChild 
                    className={cn(
                      "cursor-pointer hover:bg-accent/50 data-[disabled]:opacity-100 data-[disabled]:cursor-default",
                      !not.is_read && "bg-primary/10 hover:bg-primary/20"
                    )}
                    onSelect={(e) => {
                      if (!not.is_read) {
                        handleMarkAsRead(not.id);
                      }
                      if (not.link_path) {
                        router.push(not.link_path);
                      }
                    }}
                  >
                    {not.link_path ? (
                       <Link href={not.link_path} className="w-full">
                        <div className="flex items-start gap-2 py-1.5">
                            {getNotificationIcon(not.type)}
                            <div className="flex-grow">
                            <p className="text-sm text-foreground leading-snug">{not.message}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(not.created_at), { addSuffix: true, locale: arSA })}
                            </p>
                            </div>
                            {!not.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" title="غير مقروء"></span>
                            )}
                        </div>
                      </Link>
                    ) : (
                       <div className="w-full flex items-start gap-2 py-1.5">
                            {getNotificationIcon(not.type)}
                            <div className="flex-grow">
                            <p className="text-sm text-foreground leading-snug">{not.message}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(parseISO(not.created_at), { addSuffix: true, locale: arSA })}
                            </p>
                            </div>
                            {!not.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" title="غير مقروء"></span>
                            )}
                        </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            )}
             <DropdownMenuSeparator />
             <DropdownMenuItem onClick={() => fetchNotifications(false)} disabled={isLoadingNotifications} className="flex items-center justify-center cursor-pointer">
                <Loader2 className={`me-2 h-4 w-4 ${isLoadingNotifications ? "animate-spin" : "hidden"}`} />
                تحديث الإشعارات
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {user && ( 
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                   {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt={userProfile.name || user.email || 'صورة المستخدم'} className="h-full w-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(userProfile?.name || user.email)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {userProfile?.name || user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userProfile?.role === 'admin' ? 'مسؤول' : (userProfile?.role || 'مستخدم')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="me-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
