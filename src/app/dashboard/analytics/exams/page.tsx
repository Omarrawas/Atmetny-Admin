// src/app/dashboard/analytics/exams/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Loader2, Info, Edit, Activity } from 'lucide-react';
import { getExams, getExamAttempts } from '@/lib/firestore';
import type { Exam, ExamAttempt } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface ExamAnalyticsSummary {
  examId: string;
  examTitle: string;
  subjectId?: string;
  numberOfAttempts: number;
  averageScore: number | null; // Percentage
}

export default function ExamAnalyticsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const [fetchedExams, fetchedAttempts] = await Promise.all([
          getExams(),
          getExamAttempts(), 
        ]);
        setExams(fetchedExams);
        setExamAttempts(fetchedAttempts);
      } catch (error) {
        console.error("Error fetching exam analytics data:", error);
        toast({
          variant: "destructive",
          title: "خطأ في جلب البيانات",
          description: "لم نتمكن من تحميل بيانات تحليلات الامتحانات.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalyticsData();
  }, [toast]);

  const examSummaries = useMemo((): ExamAnalyticsSummary[] => {
    return exams.map(exam => {
      const attemptsForThisExam = examAttempts.filter(attempt => attempt.examId === exam.id);
      const numberOfAttempts = attemptsForThisExam.length;
      let averageScore: number | null = null;

      if (numberOfAttempts > 0) {
        const totalCorrectAnswers = attemptsForThisExam.reduce((sum, attempt) => sum + (attempt.correctAnswersCount || 0), 0);
        const totalAttemptedQuestions = attemptsForThisExam.reduce((sum, attempt) => sum + (attempt.totalQuestionsAttempted || 0), 0);
        
        if (totalAttemptedQuestions > 0) {
            averageScore = (totalCorrectAnswers / totalAttemptedQuestions) * 100;
        }
      }

      return {
        examId: exam.id!,
        examTitle: exam.title,
        subjectId: exam.subjectId,
        numberOfAttempts,
        averageScore,
      };
    });
  }, [exams, examAttempts]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ms-3 text-lg text-muted-foreground">جاري تحميل تحليلات الامتحانات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">تحليلات الامتحانات</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            نظرة عامة على أداء الامتحانات وتحليل نتائج الطلاب.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exams.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>لا توجد امتحانات</AlertTitle>
              <AlertDescription>
                لم يتم إنشاء أي امتحانات بعد. <Link href="/dashboard/exams/new" className="text-primary hover:underline">أنشئ امتحانًا</Link> لتبدأ.
              </AlertDescription>
            </Alert>
          ) : examAttempts.length === 0 && exams.length > 0 ? (
             <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                <Activity className="h-4 w-4 !text-blue-700 dark:!text-blue-300" />
                <AlertTitle>لا توجد محاولات امتحانات مسجلة</AlertTitle>
                <AlertDescription>
                    لا توجد أي محاولات مسجلة من الطلاب حتى الآن. سيتم عرض الإحصائيات هنا بمجرد أن يبدأ الطلاب في أداء الامتحانات.
                </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>عنوان الامتحان</TableHead>
                    <TableHead className="text-center">عدد المحاولات</TableHead>
                    <TableHead className="text-center">متوسط ​​الدرجات (٪)</TableHead>
                    <TableHead className="text-start">إجراءات</TableHead> {/* Changed text-right to text-start */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examSummaries.map((summary) => (
                    <TableRow key={summary.examId}>
                      <TableCell className="font-medium">{summary.examTitle}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{summary.numberOfAttempts}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.averageScore !== null ? (
                          <Badge variant={summary.averageScore >= 50 ? "default" : "destructive"}
                                 className={summary.averageScore >= 50 ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {summary.averageScore.toFixed(2)}%
                          </Badge>
                        ) : (
                          <Badge variant="outline">N/A</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-start"> {/* Changed text-right to text-start */}
                        <Button variant="outline" size="sm" disabled>
                          <Edit className="me-1 h-3 w-3" /> عرض التقرير التفصيلي {/* Changed mr-1 to me-1 */}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-8 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">تحليل أداء الأسئلة</CardTitle>
                    <CardDescription>
                        (قادم قريبًا) تحليل تفصيلي لأداء كل سؤال عبر جميع الامتحانات.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">سيتم عرض إحصائيات حول نسبة الإجابات الصحيحة والخاطئة لكل سؤال هنا.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">تقارير الطلاب الفردية</CardTitle>
                    <CardDescription>
                        (قادم قريبًا) عرض أداء الطلاب بشكل فردي عبر الامتحانات.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">سيتمكن المسؤولون من البحث عن طالب وعرض سجل امتحاناته ودرجاته هنا.</p>
                </CardContent>
            </Card>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
