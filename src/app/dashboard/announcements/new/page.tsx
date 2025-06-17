// src/app/dashboard/announcements/new/page.tsx
"use client";

import React, { useState } from 'react';
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
import { addAnnouncement } from '@/lib/firestore';
import type { AnnouncementType } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Megaphone, Eye, EyeOff } from 'lucide-react';

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

export default function NewAnnouncementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
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


  const onSubmit = async (data: AnnouncementFormValues) => {
    setIsLoading(true);
    try {
      await addAnnouncement({
        title: data.title,
        message: data.message,
        type: data.type,
        isActive: data.isActive,
      });
      toast({
        title: "نجاح!",
        description: "تمت إضافة الإعلان الجديد بنجاح.",
      });
      router.push('/dashboard/announcements');
    } catch (error: any) { // Catch as 'any' to inspect properties
      console.error("Error adding announcement (raw object follows):");
      console.error(error); // Log the raw error object

      // Try to log Supabase-specific details if they exist on the error object
      if (error.message) console.error("Caught error message (from page):", error.message);
      if (error.details) console.error("Caught error details (from page):", error.details);
      if (error.hint) console.error("Caught error hint (from page):", error.hint);
      if (error.code) console.error("Caught error code (from page):", error.code);

      // Attempt to stringify, which might reveal more if it's a complex object
      try {
        console.error("Stringified caught error (from page):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e) {
        console.error("Could not stringify caught error (from page):", e);
      }
      
      let toastMessage = "فشلت إضافة الإعلان الجديد.";
      if (error.message) {
        toastMessage += ` التفاصيل: ${error.message}`;
      }

      toast({
        variant: "destructive",
        title: "خطأ",
        description: toastMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Megaphone className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">إضافة إعلان جديد</CardTitle>
        </div>
        <CardDescription>املأ تفاصيل الإعلان ليتم عرضه للطلاب.</CardDescription>
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
                    <Input placeholder="مثال: تحديث هام للتطبيق" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <FormDescription>يؤثر نوع الإعلان على كيفية عرضه للطالب (مثل اللون أو الأيقونة).</FormDescription>
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" /> : <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />}
                إضافة الإعلان
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
