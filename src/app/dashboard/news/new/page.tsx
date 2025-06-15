// src/app/dashboard/news/new/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { addNewsArticle } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2, Newspaper } from 'lucide-react';

const newsArticleSchema = z.object({
  title: z.string().min(5, "العنوان يجب أن يكون 5 أحرف على الأقل.").max(150, "العنوان طويل جدًا."),
  content: z.string().min(20, "المحتوى يجب أن يكون 20 حرفًا على الأقل."),
  imageUrl: z.string().url({ message: "الرجاء إدخال رابط صورة صحيح." }).optional().or(z.literal('')),
});

type NewsArticleFormValues = z.infer<typeof newsArticleSchema>;

export default function NewNewsArticlePage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<NewsArticleFormValues>({
    resolver: zodResolver(newsArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      imageUrl: '',
    },
  });

  const onSubmit = async (data: NewsArticleFormValues) => {
    setIsLoading(true);
    try {
      await addNewsArticle({
        title: data.title,
        content: data.content,
        imageUrl: data.imageUrl || undefined, // Store undefined if empty string, Firestore handles it as absent
      });
      toast({
        title: "نجاح!",
        description: "تمت إضافة الخبر الجديد بنجاح.",
      });
      router.push('/dashboard/news');
    } catch (error) {
      console.error("Error adding news article:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت إضافة الخبر الجديد.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Newspaper className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">إضافة خبر جديد</CardTitle>
        </div>
        <CardDescription>املأ تفاصيل الخبر الجديد ليتم نشره.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان الخبر</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: إطلاق النسخة الجديدة من التطبيق" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>محتوى الخبر</FormLabel>
                  <FormControl>
                    <Textarea placeholder="اكتب تفاصيل الخبر هنا..." {...field} rows={8} />
                  </FormControl>
                  <FormDescription>يمكنك استخدام تنسيق Markdown بسيط إذا أردت.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رابط صورة الخبر (اختياري)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormDescription>الصق رابطًا مباشرًا للصورة التي تود عرضها مع الخبر.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" /> : <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />}
                إضافة الخبر
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
