// src/app/dashboard/export/page.tsx
"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from 'lucide-react';
import { 
    getQuestions, 
    getExams, 
    getNewsArticles, 
    getAccessCodes,
    getUsers,
    getSubjectsWithDetails,
    convertTimestampsToDates 
} from '@/lib/firestore'; 
import type { Question, Option } from '@/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

type ExportFormat = 'xlsx' | 'json';
type DataType = 'questions' | 'exams' | 'news' | 'accessCodes' | 'users' | 'subjects';

export default function ExportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<DataType, boolean>>({
    questions: false,
    exams: false,
    news: false,
    accessCodes: false,
    users: false,
    subjects: false,
  });
  const [exportFormats, setExportFormats] = useState<Record<DataType, ExportFormat>>({
    questions: 'xlsx',
    exams: 'xlsx',
    news: 'xlsx',
    accessCodes: 'xlsx',
    users: 'xlsx',
    subjects: 'json', 
  });
  const { toast } = useToast();

  const downloadFile = (data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const downloadJSON = (data: any[], filename: string) => {
    if (!Array.isArray(data) || data.length === 0) {
      toast({ title: "لا توجد بيانات", description: `لا توجد بيانات متاحة للتصدير لـ ${filename}.` });
      return;
    }
    try {
      const processedData = convertTimestampsToDates(data); 
      const jsonString = JSON.stringify(processedData, null, 2);
      downloadFile(jsonString, `${filename}.json`, 'application/json');
      toast({ title: "نجاح", description: `تم تصدير ${filename} بنجاح كملف JSON.` });
    } catch (error) {
      console.error(`Error exporting ${filename} to JSON:`, error);
      toast({ variant: "destructive", title: "خطأ في التصدير", description: `فشل تصدير ${filename} كملف JSON.` });
    }
  };

  const downloadXLSX = (data: any[], filename: string, dataType: DataType) => {
    if (!Array.isArray(data) || data.length === 0) {
      toast({ title: "لا توجد بيانات", description: `لا توجد بيانات متاحة للتصدير لـ ${filename}.` });
      return;
    }
    try {
      let processedDataForSheet: any[];

      if (dataType === 'questions') {
        const questionsData = data as Question[];
        processedDataForSheet = questionsData.map(q => {
          const flatQuestion: { [key: string]: any } = {
            questionText: q.questionText,
            difficulty: q.difficulty,
            subject: q.subject, 
            subjectId: q.subjectId,
            lessonId: q.lessonId,
            isSane: q.isSane,
            sanityExplanation: q.sanityExplanation,
          };
          if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt, index) => {
              flatQuestion[`option${index + 1}`] = opt.text;
            });
            const correctOption = q.options.find(opt => opt.id === q.correctOptionId);
            flatQuestion['correctOptionText'] = correctOption ? correctOption.text : 'N/A';
          }
          flatQuestion['correctOptionId'] = q.correctOptionId;
          flatQuestion['createdAt'] = q.created_at;
          flatQuestion['updatedAt'] = q.updated_at;
          return flatQuestion;
        });
      } else {
        processedDataForSheet = convertTimestampsToDates(data.map(item => {
          const flatItem: {[key: string]: any} = {};
          for (const key in item) {
            if (Array.isArray(item[key])) {
              flatItem[key] = JSON.stringify(item[key]); 
            } else if (typeof item[key] === 'object' && item[key] !== null && !(item[key] instanceof Date)) {
            }
             else {
              flatItem[key] = item[key];
            }
          }
          return flatItem;
        }));
      }
      
      const worksheet = XLSX.utils.json_to_sheet(processedDataForSheet);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast({ title: "نجاح", description: `تم تصدير ${filename} بنجاح كملف XLSX.` });
    } catch (error) {
      console.error(`Error exporting ${filename} to XLSX:`, error);
      toast({ variant: "destructive", title: "خطأ في التصدير", description: `فشل تصدير ${filename} كملف XLSX.` });
    }
  };

  const handleExport = async (dataType: DataType, fetchData: () => Promise<any[]>, filename: string) => {
    setLoadingStates(prev => ({ ...prev, [dataType]: true }));
    try {
      const data = await fetchData();
      const format = exportFormats[dataType];
      if (format === 'json') {
        downloadJSON(data, filename);
      } else { // xlsx
        downloadXLSX(data, filename, dataType);
      }
    } catch (error: any) {
      console.error(`Error fetching ${dataType} for export:`, error);
      if (error.message && error.message.includes("This function is not implemented for Supabase")) {
        toast({ variant: "destructive", title: "وظيفة غير منفذة", description: `تصدير بيانات '${dataType}' يعتمد على وظائف تحتاج إلى ترحيل إلى Supabase.` });
      } else {
        toast({ variant: "destructive", title: "خطأ", description: `فشل جلب بيانات ${dataType} للتصدير.` });
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [dataType]: false }));
    }
  };
  
  const handleFormatChange = (dataType: DataType, format: ExportFormat) => {
    setExportFormats(prev => ({ ...prev, [dataType]: format }));
  };

  const exportConfig: { type: DataType, label: string, fetchData: () => Promise<any[]>, filename: string, supportedFormats: ExportFormat[] }[] = [
    { type: 'questions', label: 'تصدير الأسئلة', fetchData: getQuestions, filename: 'تصدير_الأسئلة', supportedFormats: ['xlsx', 'json'] },
    { type: 'exams', label: 'تصدير الامتحانات', fetchData: getExams, filename: 'تصدير_الامتحانات', supportedFormats: ['xlsx', 'json'] },
    { type: 'news', label: 'تصدير الأخبار', fetchData: getNewsArticles, filename: 'تصدير_الأخبار', supportedFormats: ['xlsx', 'json'] },
    { type: 'accessCodes', label: 'تصدير رموز الدخول', fetchData: getAccessCodes, filename: 'تصدير_رموز_الدخول', supportedFormats: ['xlsx', 'json'] },
    { type: 'users', label: 'تصدير المستخدمين', fetchData: getUsers, filename: 'تصدير_المستخدمين', supportedFormats: ['xlsx', 'json'] },
    { type: 'subjects', label: 'تصدير المواد (مع التفاصيل)', fetchData: getSubjectsWithDetails, filename: 'تصدير_المواد_مع_التفاصيل', supportedFormats: ['json'] },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2 rtl:space-x-reverse">
            <Download className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">تصدير البيانات</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            قم بتنزيل بيانات التطبيق الخاصة بك بتنسيقات مختلفة. 
            (ملاحظة: سيفشل جلب البيانات حتى يتم ترحيل وظائف Firestore إلى Supabase).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <p className="text-sm text-muted-foreground">
            اختر نوع البيانات والتنسيق الذي ترغب في تصديره. 
            سيتم تصدير حقول التاريخ كسلاسل تاريخ ISO.
            بالنسبة للبيانات المتداخلة مثل المواد (مع الأقسام والدروس)، يوصى باستخدام تنسيق JSON.
            بالنسبة للأسئلة المصدرة إلى XLSX، ستكون الخيارات والإجابات الصحيحة في أعمدة منفصلة.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {exportConfig.map(({ type, label, fetchData, filename, supportedFormats }) => (
              <Card key={type} className="p-4">
                <h3 className="text-lg font-semibold mb-2">{label}</h3>
                <RadioGroup 
                  defaultValue={exportFormats[type]} 
                  onValueChange={(value) => handleFormatChange(type, value as ExportFormat)}
                  className="mb-4"
                  dir="rtl"
                >
                  {supportedFormats.includes('xlsx') && (
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="xlsx" id={`${type}-xlsx`} />
                      <Label htmlFor={`${type}-xlsx`}>Excel (.xlsx)</Label>
                    </div>
                  )}
                  {supportedFormats.includes('json') && (
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="json" id={`${type}-json`} />
                      <Label htmlFor={`${type}-json`}>JSON (.json)</Label>
                    </div>
                  )}
                </RadioGroup>
                <Button onClick={() => handleExport(type, fetchData, filename)} disabled={loadingStates[type]} className="w-full">
                  {loadingStates[type] ? <Loader2 className="ml-2 h-5 w-5 animate-spin rtl:mr-2 rtl:ml-0" /> : <Download className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0" />}
                  تصدير {exportFormats[type].toUpperCase()}
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
