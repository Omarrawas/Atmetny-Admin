
// src/app/dashboard/news/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Newspaper, PlusCircle, Loader2, Edit3, Trash2, CalendarDays } from 'lucide-react';
import { getNewsArticles, deleteNewsArticle } from '@/lib/firestore'; // These will throw errors
import type { NewsArticle } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns'; // Added parseISO

const isValidImageUrlForNextImage = (url?: string): boolean => {
  if (!url || url.trim() === '') return false;
  try {
    const parsedUrl = new URL(url);
    // Updated allowed hostnames for Supabase
    const allowedHostnames = ['placehold.co', 'wlinjhdynghwfzoegvdi.supabase.co', 'th.bing.com']; 
    return allowedHostnames.includes(parsedUrl.hostname);
  } catch (e) {
    return false;
  }
};

const NOT_IMPLEMENTED_ERROR = "This function is not implemented for Supabase.";

export default function NewsPage() {
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      try {
        const articles = await getNewsArticles();
        setNewsArticles(articles);
      } catch (error: any) {
        console.error("Error fetching news articles:", error);
        if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "News functionality requires Supabase backend implementation." });
        } else {
          toast({ variant: "destructive", title: "خطأ", description: "فشل في جلب الأخبار." });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
  }, [toast]);

  const handleDeleteArticle = async () => {
    if (!deletingArticleId) return;
    try {
      await deleteNewsArticle(deletingArticleId);
      setNewsArticles(prev => prev.filter(article => article.id !== deletingArticleId));
      toast({
        title: "نجاح",
        description: "تم حذف الخبر بنجاح.",
      });
    } catch (error: any) {
      console.error("Error deleting news article:", error);
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Deleting news requires Supabase backend implementation." });
        } else {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "فشل حذف الخبر.",
        });
      }
    } finally {
      setDeletingArticleId(null);
    }
  };
  
  const formatDate = (timestamp?: string) => { // Changed to string for ISO date
    if (!timestamp) return 'تاريخ غير معروف';
    try {
        return format(parseISO(timestamp), 'PPP'); // e.g., Jun 9, 2023
    } catch(e) {
        console.warn("Error parsing date for news article:", timestamp, e);
        return "تاريخ غير صالح";
    }
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Newspaper className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl font-bold tracking-tight">إدارة الأخبار</CardTitle>
            </div>
            <Link href="/dashboard/news/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> إضافة خبر جديد
              </Button>
            </Link>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            قم بإنشاء، تعديل، ونشر الأخبار والإعلانات من هنا.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-3 text-lg text-muted-foreground rtl:mr-3 rtl:ml-0">جاري تحميل الأخبار...</p>
            </div>
          ) : newsArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 min-h-[300px]">
              <Newspaper className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">لا توجد أخبار بعد</h2>
              <p className="text-muted-foreground max-w-md">
                ابدأ بإضافة خبر جديد ليظهر هنا.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {newsArticles.map((article) => (
                <Card key={article.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="md:flex">
                    {isValidImageUrlForNextImage(article.imageUrl) && (
                      <div className="md:w-1/3 relative h-48 md:h-auto">
                        <Image 
                          src={article.imageUrl!} 
                          alt={article.title} 
                          layout="fill"
                          objectFit="cover"
                          className="rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                          data-ai-hint="news announcement"
                        />
                      </div>
                    )}
                    <div className={`p-6 ${isValidImageUrlForNextImage(article.imageUrl) ? 'md:w-2/3' : 'w-full'}`}>
                      <CardTitle className="text-xl mb-2">{article.title}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <CalendarDays className="mr-1.5 h-4 w-4 rtl:ml-1.5 rtl:mr-0" />
                        نشر في: {formatDate(article.created_at)}
                      </div>
                      <CardDescription className="line-clamp-3 mb-4">
                        {article.content}
                      </CardDescription>
                       <CardFooter className="p-0 pt-4 border-t flex justify-end space-x-2 rtl:space-x-reverse">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/news/edit/${article.id}`}>
                              <span className="inline-flex items-center">
                                <Edit3 className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" /> تعديل
                              </span>
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" onClick={() => setDeletingArticleId(article.id!)}>
                                <span className="inline-flex items-center">
                                  <Trash2 className="mr-1 h-4 w-4 rtl:ml-1 rtl:mr-0" /> حذف
                                </span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader className="text-right">
                                <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم حذف الخبر "{article.title}" بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse">
                                <AlertDialogCancel onClick={() => setDeletingArticleId(null)}>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteArticle} className="bg-destructive hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </CardFooter>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
