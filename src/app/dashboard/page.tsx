// src/app/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UserTable from '@/components/UserTable';
import { Separator } from '@/components/ui/separator';
import {
  BookOpenCheck, // For Subjects
  FileQuestion,  // For Questions
  ClipboardList, // For Exams
  Newspaper,     // For News
  QrCode,        // For Access Codes
  Users2,        // For Teachers / Users
  PlusCircle,    // For Add actions
  Settings,      // Generic settings or main dashboard icon
  BarChart3,     // For Statistics
  ArrowRightCircle // For Quick Links
} from 'lucide-react';
import {
  getSubjects,
  getQuestions,
  getExams,
  getNewsArticles,
  getAccessCodes,
  getTeachers,
  getUsers,
} from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface Stats {
  subjects: number;
  questions: number;
  exams: number;
  news: number;
  accessCodes: number;
  teachers: number;
  users: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const [
          subjectsData,
          questionsData,
          examsData,
          newsData,
          accessCodesData,
          teachersData,
          usersData,
        ] = await Promise.all([
          getSubjects(),
          getQuestions(),
          getExams(),
          getNewsArticles(),
          getAccessCodes(),
          getTeachers(),
          getUsers(),
        ]);

        setStats({
          subjects: subjectsData.length,
          questions: questionsData.length,
          exams: examsData.length,
          news: newsData.length,
          accessCodes: accessCodesData.length,
          teachers: teachersData.length,
          users: usersData.length,
        });
      } catch (error: any) {
        console.error("Error fetching dashboard stats (raw object follows):");
        console.error(error); 

        if (error.message) console.error("Caught error message (from page):", error.message);
        if (error.details) console.error("Caught error details (from page):", error.details);
        if (error.hint) console.error("Caught error hint (from page):", error.hint);
        if (error.code) console.error("Caught error code (from page):", error.code);
        
        try {
            console.error("Stringified caught error (from page):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        } catch (e) {
            console.error("Could not stringify caught error (from page):", e);
        }

        let toastMessage = "لم نتمكن من تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.";
        if (error.message) {
            toastMessage += ` التفاصيل: ${error.message}`;
        }

        toast({
          variant: "destructive",
          title: "خطأ في تحميل الإحصائيات",
          description: toastMessage,
        });
        setStats(null); 
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [toast]);

  const statItems = [
    { title: "إجمالي المواد", count: stats?.subjects, icon: BookOpenCheck, color: "text-blue-500", bgColor: "bg-blue-50" },
    { title: "إجمالي الأسئلة", count: stats?.questions, icon: FileQuestion, color: "text-green-500", bgColor: "bg-green-50" },
    { title: "إجمالي الامتحانات", count: stats?.exams, icon: ClipboardList, color: "text-purple-500", bgColor: "bg-purple-50" },
    { title: "إجمالي الأخبار", count: stats?.news, icon: Newspaper, color: "text-orange-500", bgColor: "bg-orange-50" },
    { title: "رموز QR المُنشأة", count: stats?.accessCodes, icon: QrCode, color: "text-red-500", bgColor: "bg-red-50" },
    { title: "إجمالي المدرسين", count: stats?.teachers, icon: Users2, color: "text-teal-500", bgColor: "bg-teal-50" },
    { title: "إجمالي المستخدمين", count: stats?.users, icon: Users2, color: "text-indigo-500", bgColor: "bg-indigo-50" },
  ];

  const quickLinks = [
    { href: '/dashboard/subjects/new', label: 'إضافة مادة جديدة', icon: BookOpenCheck, key: 'ql-subjects-new' },
    { href: '/dashboard/questions/new', label: 'إضافة سؤال جديد', icon: FileQuestion, key: 'ql-questions-new' },
    { href: '/dashboard/exams/new', label: 'إضافة امتحان جديد', icon: ClipboardList, key: 'ql-exams-new' },
    { href: '/dashboard/news/new', label: 'إضافة خبر جديد', icon: Newspaper, key: 'ql-news-new' },
    { href: '/dashboard/qr-codes', label: 'إنشاء رموز QR', icon: QrCode, key: 'ql-qr-codes' },
    { href: '/dashboard/teachers', label: 'إدارة المدرسين', icon: Users2, key: 'ql-teachers' },
  ];

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Settings className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">لوحة التحكم الرئيسية</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground pt-1">
            نظرة عامة على محتوى التطبيق وروابط سريعة للإدارة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Statistics Section */}
          <section>
            <div className="flex items-center mb-4 space-x-2 rtl:space-x-reverse">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">نظرة عامة على الإحصائيات</h2>
            </div>
            {isLoadingStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array(4).fill(0).map((_, index) => (
                  <Card key={`stat-skeleton-${index}`} className="p-4 animate-pulse bg-muted/50 h-28 rounded-lg" />
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {statItems.map((item, index) => (
                  <Card key={item.title || `stat-item-${index}`} className={`shadow-sm hover:shadow-md transition-shadow rounded-lg overflow-hidden ${item.bgColor} dark:bg-opacity-20`}>
                    <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4 ${item.color}`}>
                      <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                      <item.icon className="h-5 w-5" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className={`text-3xl font-bold ${item.color}`}>{item.count ?? 0}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">فشل تحميل الإحصائيات.</p>
            )}
          </section>

          <Separator />

          {/* Quick Links Section */}
          <section>
            <div className="flex items-center mb-4 space-x-2 rtl:space-x-reverse">
              <ArrowRightCircle className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">روابط سريعة</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {quickLinks.map((link) => (
                <Button
                  key={link.key}
                  asChild
                  variant="outline"
                  className="w-full h-16 justify-start p-4 text-base hover:bg-accent/50 hover:shadow-sm transition-all"
                >
                  <Link href={link.href}>
                    <link.icon className="mr-3 h-6 w-6 text-primary rtl:ml-3 rtl:mr-0" />
                    {link.label}
                  </Link>
                </Button>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <UserTable />
    </div>
  );
}
