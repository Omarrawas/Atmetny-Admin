// src/app/dashboard/announcements/edit/[id]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getAnnouncementById, updateAnnouncement } from '@/lib/firestore';
import type { Announcement, AnnouncementType } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Megaphone, Eye, EyeOff } from 'lucide-react';

const announcementSchema = z.object({
  title: z.string().min(5, "العنوان يجب أن يكون 5 أحرف على الأقل.").max(100, "العنوان طويل جدًا."),
  message: z.string().min(10, "نص الإعلان يجب أن يكون 10 أحرف على الأقل.").max(1000, "نص الإعلان طويل جدًا."),
  type: z.enum(['info', 'warning', 'important', 'success'], { required_error: "الرجاء اختيار نوع الإعلان." }),
  isActive: z.boolean().default(true),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

const announcementTypeOptions: { label: string; value: AnnouncementType }[] = [
    { label: "معلوماتي (Info)", value: "info" },
    { label: "تحذيري (Warning)", value: "warning" },
    { label: "هام (Important)", value: "important" },
    { label: "نجاح (Success)", value: "success" },
];

export default function EditAnnouncementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      message: '',
      type: 'info',
      isActive: true,
    },
  });
  const isActiveStatus = form.watch("isActive");

  useEffect(() => {
    const announcementId = params?.id as string;
    if (!announcementId) {
      setIsFetching(false);
      toast({ variant: "destructive", title: "خطأ", description: "معرّف الإعلان غير موجود." });
      router.push('/dashboard/announcements');
      return;
    }

    const fetchAnnouncementData = async () => {
      setIsFetching(true);
      try {
        const data = await getAnnouncementById(announcementId);
        if (data) {
          form.reset({
            title: data.title,
            message: data.message,
            type: data.type,
            isActive: data.isActive,
          });
        } else {
          toast({ variant: "destructive", title: "خطأ", description: "الإعلان غير موجود." });
          router.push('/dashboard/announcements');
        }
      } catch (error) {
        console.error("Error fetching announcement:", error);
        toast({ variant: "destructive", title: "خطأ", description: "فشل في جلب بيانات الإعلان." });
      } finally {
        setIsFetching(false);
      }
    };
    fetchAnnouncementData();
  }, [params, form, router, toast]);

  const onSubmit = async (data: AnnouncementFormValues) => {
    const announcementId = params?.id as string;
    if (!announcementId) return;
    setIsLoading(true);
    try {
      await updateAnnouncement(announcementId, {
        title: data.title,
        message: data.message,
        type: data.type,
        isActive: data.isActive,
      });
      toast({
        title: "نجاح!",
        description: "تم تحديث الإعلان بنجاح.",
      });
      router.push('/dashboard/announcements');
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت عملية تحديث الإعلان.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground rtl:mr-3 rtl:ml-0">جاري تحميل الإعلان...</p>
      </div>
    );
  }


  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Megaphone className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">تعديل الإعلان</CardTitle>
        </div>
        <CardDescription>قم بتحديث تفاصيل الإعلان الحالي.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان الإعلان</FormLabel>
                  <FormControl>
                    <Input placeholder="عنوان الإعلان" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نص الإعلان</FormLabel>
                  <FormControl>
                    <Textarea placeholder="اكتب تفاصيل الإعلان هنا..." {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الإعلان</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الإعلان" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {announcementTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>يؤثر نوع الإعلان على كيفية عرضه للطالب.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center">
                       {isActiveStatus ? <Eye className="mr-2 h-4 w-4 text-green-500 rtl:ml-2 rtl:mr-0"/> : <EyeOff className="mr-2 h-4 w-4 text-red-500 rtl:ml-2 rtl:mr-0"/>}
                       حالة الإعلان
                    </FormLabel>
                    <FormDescription>
                      {isActiveStatus ? "الإعلان سيكون ظاهرًا للطلاب." : "الإعلان سيكون مخفيًا."}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Toggle announcement active status"
                    />
                  </FormControl>
                </FormItem>
              )}
            />


            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading || isFetching}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" /> : <Save className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />}
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
