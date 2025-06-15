
// src/app/dashboard/announcements/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Megaphone, PlusCircle, Loader2, Edit3, Trash2, Eye, EyeOff, CalendarDays } from 'lucide-react';
import { getAnnouncements, deleteAnnouncement, updateAnnouncement } from '@/lib/firestore'; // These will throw errors
import type { Announcement, AnnouncementType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns'; // Added parseISO

const getAnnouncementTypeBadgeVariant = (type: AnnouncementType): "default" | "destructive" | "secondary" | "outline" => {
  switch (type) {
    case 'important':
      return 'destructive';
    case 'warning':
      return 'default'; 
    case 'success':
      return 'secondary'; 
    case 'info':
    default:
      return 'outline';
  }
};

const getAnnouncementTypeStyles = (type: AnnouncementType): string => {
  switch (type) {
    case 'important':
      return 'bg-red-500 hover:bg-red-600 text-white';
    case 'warning':
      return 'bg-yellow-500 hover:bg-yellow-600 text-black';
    case 'success':
      return 'bg-green-500 hover:bg-green-600 text-white';
    case 'info':
    default:
      return 'bg-blue-500 hover:bg-blue-600 text-white';
  }
}

const NOT_IMPLEMENTED_ERROR = "This function is not implemented for Supabase.";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedAnnouncements = await getAnnouncements();
      setAnnouncements(fetchedAnnouncements);
    } catch (error: any) {
      console.error("Error fetching announcements:", error);
       if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Announcements functionality requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "خطأ", description: "فشل في جلب الإعلانات." });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAnnouncement(deletingId);
      setAnnouncements(prev => prev.filter(ann => ann.id !== deletingId));
      toast({ title: "نجاح", description: "تم حذف الإعلان بنجاح." });
    } catch (error: any) {
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Deleting announcements requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "خطأ", description: "فشل حذف الإعلان." });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    if (!announcement.id) return;
    setTogglingActiveId(announcement.id);
    try {
      const newIsActive = !announcement.isActive;
      await updateAnnouncement(announcement.id, { isActive: newIsActive });
      setAnnouncements(prev =>
        prev.map(ann =>
          ann.id === announcement.id ? { ...ann, isActive: newIsActive } : ann
        )
      );
      toast({
        title: "تم تحديث الحالة",
        description: `الإعلان "${announcement.title}" هو الآن ${newIsActive ? "فعال" : "غير فعال"}.`,
      });
    } catch (error: any) {
       if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Updating announcement status requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "خطأ", description: "فشل في تحديث حالة الإعلان." });
      }
    } finally {
      setTogglingActiveId(null);
    }
  };
  
  const formatDate = (timestamp?: string) => { // Changed to string for ISO date
    if (!timestamp) return 'تاريخ غير معروف';
    try {
        return format(parseISO(timestamp), 'PPP p'); // e.g., Jun 9, 2023, 4:30 PM
    } catch (e) {
        console.warn("Error parsing date for announcement:", timestamp, e);
        return 'تاريخ غير صالح';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Megaphone className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold tracking-tight">إدارة الإعلانات</CardTitle>
            </div>
            <Link href="/dashboard/announcements/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> إضافة إعلان جديد
              </Button>
            </Link>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            أنشئ، عدّل، وانشر الإعلانات والتنبيهات للطلاب من هنا.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-lg text-muted-foreground rtl:mr-3 rtl:ml-0">جاري تحميل الإعلانات...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 min-h-[300px]">
              <Megaphone className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">لا توجد إعلانات بعد</h2>
              <p className="text-muted-foreground max-w-md">
                ابدأ بإضافة إعلان جديد ليظهر هنا.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((ann) => (
                    <TableRow key={ann.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={ann.title}>{ann.title}</TableCell>
                      <TableCell>
                        <Badge variant={getAnnouncementTypeBadgeVariant(ann.type)} className={getAnnouncementTypeStyles(ann.type)}>
                          {ann.type.charAt(0).toUpperCase() + ann.type.slice(1)}
                        </Badge>
                      </TableCell>
                       <TableCell className="text-sm text-muted-foreground">
                        {formatDate(ann.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                            <Switch
                                id={`active-switch-${ann.id}`}
                                checked={ann.isActive}
                                onCheckedChange={() => handleToggleActive(ann)}
                                disabled={togglingActiveId === ann.id}
                                aria-label={`Toggle active status for ${ann.title}`}
                            />
                            <Label htmlFor={`active-switch-${ann.id}`} className="text-xs">
                                {togglingActiveId === ann.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                                ) : ann.isActive ? (
                                <span className="flex items-center text-green-600"><Eye className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/> فعال</span>
                                ) : (
                                <span className="flex items-center text-red-600"><EyeOff className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/> غير فعال</span>
                                )}
                            </Label>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1 rtl:space-x-reverse">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/announcements/edit/${ann.id}`}>
                            <Edit3 className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" /> تعديل
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setDeletingId(ann.id!)}>
                              <Trash2 className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0" /> حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader className="text-right">
                              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم حذف الإعلان "{ann.title}" بشكل دائم.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse">
                              <AlertDialogCancel onClick={() => setDeletingId(null)}>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
