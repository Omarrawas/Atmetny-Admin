// src/app/dashboard/news/edit/[id]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getNewsArticleById, updateNewsArticle } from '@/lib/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Newspaper } from 'lucide-react';
import type { NewsArticle } from '@/types';

const newsArticleSchema = z.object({
  title: z.string().min(5, "العنوان يجب أن يكون 5 أحرف على الأقل.").max(150, "العنوان طويل جدًا."),
  content: z.string().min(20, "المحتوى يجب أن يكون 20 حرفًا على الأقل."),
  imageUrl: z.string().url({ message: "الرجاء إدخال رابط صورة صحيح أو اتركه فارغًا." }).optional().or(z.literal('')),
});

type NewsArticleFormValues = z.infer<typeof newsArticleSchema>;

export default function EditNewsArticlePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const form = useForm<NewsArticleFormValues>({
    resolver: zodResolver(newsArticleSchema),
    defaultValues: {
      title: '',
      content: '',
      imageUrl: '',
    },
  });

  useEffect(() => {
    const articleIdFromParams = params?.id as string;
    if (!articleIdFromParams) {
      setIsFetching(false);
      toast({ variant: "destructive", title: "خطأ", description: "معرّف الخبر غير موجود." });
      router.push('/dashboard/news');
      return;
    }

    const fetchArticleData = async () => {
      setIsFetching(true);
      try {
        const articleData = await getNewsArticleById(articleIdFromParams);
        if (articleData) {
          form.reset({
            title: articleData.title,
            content: articleData.content,
            imageUrl: articleData.imageUrl || '', // Populate with empty string if undefined/null
          });
        } else {
          toast({ variant: "destructive", title: "خطأ", description: "الخبر غير موجود." });
          router.push('/dashboard/news');
        }
      } catch (error) {
        console.error("Error fetching news article:", error);
        toast({ variant: "destructive", title: "خطأ", description: "فشل في جلب بيانات الخبر." });
      } finally {
        setIsFetching(false);
      }
    };
    fetchArticleData();
  }, [params, form, router, toast]);

  const onSubmit = async (data: NewsArticleFormValues) => {
    const articleIdFromParams = params?.id as string;
    if (!articleIdFromParams) return;
    setIsLoading(true);
    try {
      await updateNewsArticle(articleIdFromParams, {
        title: data.title,
        content: data.content,
        // If imageUrl is an empty string, store undefined/null so Firestore removes the field or sets it to null
        // If it's a valid URL, store that.
        imageUrl: data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl.trim() : undefined,
      });
      toast({
        title: "نجاح!",
        description: "تم تحديث الخبر بنجاح.",
      });
      router.push('/dashboard/news');
    } catch (error) {
      console.error("Error updating news article:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشلت عملية تحديث الخبر.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground rtl:mr-3 rtl:ml-0">جاري تحميل الخبر...</p>
      </div>
    );
  }


  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Newspaper className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">تعديل الخبر</CardTitle>
        </div>
        <CardDescription>قم بتحديث تفاصيل الخبر الحالي.</CardDescription>
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
                    <Input placeholder="عنوان الخبر" {...field} />
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
                    <Input 
                      type="url" 
                      placeholder="https://example.com/image.png أو اتركه فارغًا" 
                      {...field} 
                      value={field.value || ''} // Ensure input field is controlled and shows empty string
                    />
                  </FormControl>
                  <FormDescription>الصق رابطًا مباشرًا للصورة التي تود عرضها مع الخبر، أو اتركه فارغًا لإزالة الصورة.</FormDescription>
                  <FormMessage />
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
