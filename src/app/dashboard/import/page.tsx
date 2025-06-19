// src/app/dashboard/import/page.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, AlertCircle, FileText, CheckCircle, ListChecks, NewspaperIcon, QrCodeIcon, UsersIcon, BookOpenIcon } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { 
    importQuestionsBatch, 
    addExamsBatch,
    addNewsArticlesBatch,
    addAccessCodesBatch,
    addUsersBatch,
    addSubjectsBatch,
    getSubjects,
    getUsers 
} from '@/lib/firestore'; 
import type { Question, Option, Subject, QuestionType, Exam, NewsArticle, AccessCode, UserProfile, AccessCodeType } from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from '@/components/ui/label';

type DataType = 'questions' | 'exams' | 'news' | 'accessCodes' | 'users' | 'subjects';

interface ImportState {
  file: File | null;
  fileName: string | null;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialImportState: ImportState = {
  file: null,
  fileName: null,
  isLoading: false,
  error: null,
  successMessage: null,
};

export default function ImportPage() {
  const [importStates, setImportStates] = useState<Record<DataType, ImportState>>({
    questions: { ...initialImportState },
    exams: { ...initialImportState },
    news: { ...initialImportState },
    accessCodes: { ...initialImportState },
    users: { ...initialImportState },
    subjects: { ...initialImportState },
  });

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);

  const { toast } = useToast();

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [subjectsData, usersData] = await Promise.all([getSubjects(), getUsers()]);
        setAvailableSubjects(subjectsData);
        setAvailableUsers(usersData);
      } catch (error: any) {
        if (error.message && error.message.includes("This function is not implemented for Supabase")) {
            console.warn("صفحة الاستيراد: وظائف getSubjects/getUsers لم يتم تنفيذها لـ Supabase بعد. قد تتأثر عمليات البحث في النموذج.");
        } else {
            console.error("خطأ في جلب المواد/المستخدمين للتحقق من صحة الاستيراد:", error);
        }
      }
    };
    fetchInitialData();
  }, []);

  const updateImportState = (dataType: DataType, updates: Partial<ImportState>) => {
    setImportStates(prev => ({
      ...prev,
      [dataType]: { ...prev[dataType], ...updates },
    }));
  };

  const handleFileChangeWrapper = (dataType: DataType) => (event: React.ChangeEvent<HTMLInputElement>) => {
    updateImportState(dataType, { error: null, successMessage: null });
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/json'];
      const allowedExtensions = ['.csv', '.xlsx', '.json'];
      const fileTypeIsAllowed = allowedTypes.includes(selectedFile.type);
      const fileNameEndsWithAllowedExtension = allowedExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

      if (fileTypeIsAllowed || fileNameEndsWithAllowedExtension) {
        updateImportState(dataType, { file: selectedFile, fileName: selectedFile.name });
      } else {
        updateImportState(dataType, { 
          error: "نوع ملف غير صالح. الرجاء تحميل ملف CSV أو XLSX أو JSON.", 
          file: null, 
          fileName: null 
        });
        event.target.value = ''; 
      }
    }
  };

  const processParsedData = async (dataType: DataType, parsedData: any[]): Promise<any[] | string> => {
    if (!parsedData || parsedData.length === 0) {
      return "الملف المحدد فارغ أو لا يمكن تحليله بشكل صحيح.";
    }

    const itemsToImport: any[] = [];
    const subjectsMapByName = new Map(availableSubjects.map(s => [s.name.toLowerCase(), s.id]));
    const usersMapByEmail = new Map(availableUsers.map(u => [u.email?.toLowerCase(), u.id])); 

    for (const row of parsedData) {
      const normalizedRow: { [key: string]: any } = {};
      const isFlatStructure = !Object.keys(row).some(k => typeof row[k] === 'object' && row[k] !== null && !Array.isArray(row[k]));
      
      if (isFlatStructure) {
        for (const key in row) {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '');
          normalizedRow[normalizedKey] = typeof row[key] === 'string' ? String(row[key]).trim() : row[key];
        }
      } else {
         Object.keys(row).forEach(key => {
            normalizedRow[key.trim().toLowerCase()] = typeof row[key] === 'string' ? String(row[key]).trim() : row[key];
        });
      }
      
      try {
        switch (dataType) {
          case 'questions':
            itemsToImport.push(normalizedRow); 
            break;
          case 'exams':
             if (!normalizedRow.title || !normalizedRow.subjectname) { console.warn("تجاوز الامتحان: العنوان أو اسم المادة مفقود", normalizedRow); continue; }
            const examSubjectId = subjectsMapByName.get(String(normalizedRow.subjectname).toLowerCase());
            if (!examSubjectId && normalizedRow.subjectname) { console.warn("تجاوز الامتحان: المادة غير موجودة", normalizedRow.subjectname); continue; }
            itemsToImport.push({
              title: String(normalizedRow.title),
              description: String(normalizedRow.description || ''),
              subjectId: examSubjectId,
              questionIds: String(normalizedRow.questionids || '').split(',').map(id => id.trim()).filter(id => id),
              published: String(normalizedRow.published).toLowerCase() === 'true',
              image: String(normalizedRow.image || ''),
              imageHint: String(normalizedRow.imagehint || ''),
              teacherName: String(normalizedRow.teachername || ''),
              teacherId: String(normalizedRow.teacherid || ''),
              durationInMinutes: normalizedRow.durationinminutes ? parseInt(String(normalizedRow.durationinminutes)) : null,
            });
            break;
          case 'news':
            if (!normalizedRow.title || !normalizedRow.content) { console.warn("تجاوز الخبر: العنوان أو المحتوى مفقود", normalizedRow); continue; }
            itemsToImport.push({
              title: String(normalizedRow.title),
              content: String(normalizedRow.content),
              imageUrl: String(normalizedRow.imageurl || ''),
            });
            break;
          case 'accessCodes':
            if (!normalizedRow.name || !normalizedRow.encodedvalue || !normalizedRow.type || !normalizedRow.validfrom || !normalizedRow.validuntil) {
              console.warn("تجاوز رمز الدخول: حقول مطلوبة مفقودة", normalizedRow); continue;
            }
            const codeType = String(normalizedRow.type).toLowerCase() as AccessCodeType;
            const validFromDate = new Date(String(normalizedRow.validfrom));
            const validUntilDate = new Date(String(normalizedRow.validuntil));
            if (isNaN(validFromDate.getTime()) || isNaN(validUntilDate.getTime())) { 
                console.warn("تجاوز رمز الدخول: تنسيق تاريخ غير صالح", normalizedRow); continue; 
            }
            
            let acSubjectId: string | null = null;
            if(normalizedRow.subjectname && (codeType.startsWith('subject_') || codeType.startsWith('choose_single_subject_'))){
                acSubjectId = subjectsMapByName.get(String(normalizedRow.subjectname).toLowerCase()) || null;
            }

            itemsToImport.push({
              name: String(normalizedRow.name),
              encodedValue: String(normalizedRow.encodedvalue),
              type: codeType,
              subjectId: acSubjectId,
              subjectName: normalizedRow.subjectname ? String(normalizedRow.subjectname) : null,
              validFrom: validFromDate.toISOString(), 
              validUntil: validUntilDate.toISOString(), 
              isActive: normalizedRow.isactive !== undefined ? String(normalizedRow.isactive).toLowerCase() === 'true' : true,
            });
            break;
          case 'users': 
            const userEmail = String(normalizedRow.email || '').toLowerCase();
            if (!userEmail) { console.warn("تجاوز المستخدم: البريد الإلكتروني مفقود", normalizedRow); continue; }
            let userId = normalizedRow.id || normalizedRow.uid ? String(normalizedRow.id || normalizedRow.uid) : usersMapByEmail.get(userEmail);

            itemsToImport.push({
              id: userId, 
              email: userEmail,
              displayName: String(normalizedRow.displayname || ''),
              role: String(normalizedRow.role || 'user').toLowerCase() as UserProfile['role'],
              subjectsTaughtIds: String(normalizedRow.subjectstaughtids || '').split(',').map(id => id.trim()).filter(id => id),
              youtubeChannelUrl: String(normalizedRow.youtubechannelurl || ''),
            });
            break;
          case 'subjects':
            if (!normalizedRow.name || !normalizedRow.branch) { console.warn("تجاوز المادة: الاسم أو الفرع مفقود", normalizedRow); continue; }
            itemsToImport.push({
              name: String(normalizedRow.name),
              description: String(normalizedRow.description || ''),
              branch: String(normalizedRow.branch).toLowerCase() as Subject['branch'],
              image: String(normalizedRow.image || ''),
              iconName: String(normalizedRow.iconname || ''),
              imageHint: String(normalizedRow.imagehint || ''),
              order: normalizedRow.order ? parseInt(String(normalizedRow.order)) : null,
            });
            break;
          default:
            console.warn(`تجاوز الصف: نوع بيانات غير معروف '${dataType}'`);
        }
      } catch (parseError) {
        console.error(`خطأ في تحليل الصف لـ ${dataType}:`, parseError, "بيانات الصف:", normalizedRow);
        return `خطأ في تحليل بيانات الصف لـ ${dataType}. يرجى التحقق من محتوى الملف ووحدة التحكم للحصول على التفاصيل.`;
      }
    }
    
    if (itemsToImport.length === 0) {
      return "لم يتم العثور على عناصر صالحة للاستيراد في الملف. يرجى التحقق من محتوى الملف وتنسيقه ووحدة التحكم للحصول على تفاصيل حول الصفوف التي تم تجاوزها.";
    }
    return itemsToImport;
  };


  const handleImport = useCallback(async (dataType: DataType) => {
    const state = importStates[dataType];
    if (!state.file) {
      updateImportState(dataType, { error: "الرجاء اختيار ملف للاستيراد." });
      return;
    }

    updateImportState(dataType, { isLoading: true, error: null, successMessage: null });

    const fileExtension = state.file.name.split('.').pop()?.toLowerCase();
    let parsedDataPromise: Promise<any[]>;

    if (fileExtension === 'csv' || state.file.type === 'text/csv') {
      parsedDataPromise = new Promise((resolve, reject) => {
        Papa.parse(state.file!, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) reject(new Error(`خطأ في تحليل CSV: ${results.errors[0].message}`));
            else resolve(results.data as any[]);
          },
          error: (err: any) => reject(new Error(`فشل تحليل ملف CSV: ${err.message}`)),
        });
      });
    } else if (fileExtension === 'xlsx' || state.file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      parsedDataPromise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            if (!data) { reject(new Error("فشل قراءة ملف XLSX.")); return; }
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            resolve(XLSX.utils.sheet_to_json(worksheet));
          } catch (xlsxError) { reject(new Error(`فشل تحليل ملف XLSX. الخطأ: ${(xlsxError as Error).message}`)); }
        };
        reader.onerror = () => reject(new Error("خطأ في قراءة ملف XLSX."));
        reader.readAsArrayBuffer(state.file!);
      });
    } else if (fileExtension === 'json' || state.file.type === 'application/json') {
      parsedDataPromise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            if (!text) { reject(new Error("فشل قراءة ملف JSON.")); return; }
            const jsonData = JSON.parse(text);
            if (!Array.isArray(jsonData)) { reject(new Error("تنسيق JSON غير صالح. كان المتوقع مصفوفة.")); return; }
            resolve(jsonData);
          } catch (jsonError) { reject(new Error(`فشل تحليل ملف JSON. الخطأ: ${(jsonError as Error).message}`)); }
        };
        reader.onerror = () => reject(new Error("خطأ في قراءة ملف JSON."));
        reader.readAsText(state.file!);
      });
    } else {
      updateImportState(dataType, { error: "نوع ملف غير مدعوم.", isLoading: false });
      return;
    }

    try {
      const parsedData = await parsedDataPromise;
      const itemsToImportResult = await processParsedData(dataType, parsedData);

      if (typeof itemsToImportResult === 'string') { 
        updateImportState(dataType, { error: itemsToImportResult, isLoading: false });
        return;
      }
      
      const itemsToImport = itemsToImportResult as any[];

      switch (dataType) {
        case 'questions': await importQuestionsBatch(itemsToImport); break;
        case 'exams': await addExamsBatch(itemsToImport); break;
        case 'news': await addNewsArticlesBatch(itemsToImport); break;
        case 'accessCodes': await addAccessCodesBatch(itemsToImport); break;
        case 'users': await addUsersBatch(itemsToImport); break;
        case 'subjects': await addSubjectsBatch(itemsToImport); break;
        default: throw new Error(`نوع بيانات غير معروف للاستيراد: ${dataType}`);
      }
      
      updateImportState(dataType, { 
        successMessage: `تم استيراد ${itemsToImport.length} ${dataType} بنجاح من ${state.fileName}!`,
        file: null, 
        fileName: null 
      });
      toast({ title: "نجاح", description: `تم استيراد ${itemsToImport.length} ${dataType}.` });
      const fileInput = document.getElementById(`file-import-input-${dataType}`) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      console.error(`خطأ في معالجة أو استيراد ${dataType}:`, err);
      if (err.message && err.message.includes("This function is not implemented for Supabase")) {
         updateImportState(dataType, { 
           error: `فشل استيراد ${dataType}: وظيفة الواجهة الخلفية تحتاج إلى تنفيذ لـ Supabase.`,
         });
         toast({ variant: "destructive", title: `استيراد غير منفذ لـ ${dataType}`, description: `لم يتم استيراد ${dataType}. منطق الواجهة الخلفية معلق.` });
      } else {
        updateImportState(dataType, { 
          error: `حدث خطأ أثناء عملية الاستيراد لـ ${dataType}: ${(err as Error).message}. تحقق من وحدة التحكم للحصول على التفاصيل.`,
        });
        toast({ variant: "destructive", title: `فشل استيراد ${dataType}`, description: `لم يتم استيراد ${dataType}.` });
      }
    } finally {
      updateImportState(dataType, { isLoading: false });
    }
  }, [importStates, toast, availableSubjects, availableUsers]); 

  const importSections: {
    type: DataType;
    title: string;
    icon: React.ElementType;
    instructions: React.ReactNode;
  }[] = [
    {
      type: 'questions',
      title: 'استيراد الأسئلة',
      icon: ListChecks,
      instructions: (
        <>
          مطلوب: <code>questionType</code> (mcq, true_false, fill_in_the_blanks, short_answer), <code>questionText</code>, <code>difficulty</code>, <code>subject</code> (name) أو <code>subjectId</code>.<br/>
          MCQ/TrueFalse: <code>option1..6</code>, <code>correctOptionIndex</code> (1-based) أو <code>correctOptionText</code>.<br/>
          FillInTheBlanks: <code>correctAnswers</code> (إذا كانت متعددة، مفصولة بفاصلة منقوطة ';').<br/>
          ShortAnswer: <code>modelAnswer</code> (اختياري).<br/>
          اختياري: <code>lessonId</code>, <code>tagIds</code> (مفصولة بفاصلة), <code>isSane</code>, <code>sanityExplanation</code>.<br/>
          JSON: مصفوفة من كائنات الأسئلة.
        </>
      ),
    },
    {
      type: 'exams',
      title: 'استيراد الامتحانات',
      icon: ListChecks,
      instructions: (
        <>
          مطلوب: <code>title</code>, <code>subjectName</code> (يجب أن يتطابق مع اسم مادة موجودة).<br/>
          اختياري: <code>description</code>, <code>questionIds</code> (سلسلة من معرفات الأسئلة مفصولة بفاصلة), <code>published</code> (true/false), <code>image</code> (URL), <code>imageHint</code>, <code>teacherName</code>, <code>teacherId</code>, <code>durationInMinutes</code> (رقم).<br/>
          JSON: مصفوفة من كائنات الامتحانات.
        </>
      ),
    },
    {
      type: 'news',
      title: 'استيراد الأخبار',
      icon: NewspaperIcon,
      instructions: (
        <>
          مطلوب: <code>title</code>, <code>content</code>.<br/>
          اختياري: <code>imageUrl</code> (URL).<br/>
          JSON: مصفوفة من كائنات الأخبار.
        </>
      ),
    },
    {
      type: 'accessCodes',
      title: 'استيراد رموز الدخول',
      icon: QrCodeIcon,
      instructions: (
        <>
          مطلوب: <code>name</code>, <code>encodedValue</code> (سلسلة فريدة لـ QR), <code>type</code> (مثال: subject_monthly), <code>validFrom</code> (YYYY-MM-DD), <code>validUntil</code> (YYYY-MM-DD).<br/>
          اختياري: <code>subjectName</code> (إذا كان النوع يتطلبه، يجب أن يتطابق مع مادة موجودة), <code>isActive</code> (true/false, الافتراضي true).<br/>
          JSON: مصفوفة من كائنات رموز الدخول (تأكد من أن التواريخ هي سلاسل ISO أو قابلة للتحليل).
        </>
      ),
    },
    {
      type: 'users',
      title: 'استيراد ملفات تعريف المستخدمين',
      icon: UsersIcon,
      instructions: (
        <>
          مطلوب: <code>email</code>.<br/>
          اختياري: <code>id</code> (معرف مستخدم Supabase، إذا كان لتحديث ملف تعريف موجود), <code>displayName</code>, <code>role</code> (student, teacher, admin, user), <code>subjectsTaughtIds</code> (معرفات مواد مفصولة بفاصلة), <code>youtubeChannelUrl</code>.<br/>
          **ملاحظة:** هذا لا ينشئ مستخدمي Supabase Auth. يجب أن يكون المستخدمون موجودين في Supabase Auth. استخدم <code>id</code> أو <code>email</code> لاستهداف الملفات الشخصية.
          <br/>
          JSON: مصفوفة من كائنات ملفات تعريف المستخدمين.
        </>
      ),
    },
    {
      type: 'subjects',
      title: 'استيراد المواد',
      icon: BookOpenIcon,
      instructions: (
        <>
          مطلوب: <code>name</code>, <code>branch</code> (scientific, literary, general).<br/>
          اختياري: <code>description</code>, <code>image</code> (URL), <code>iconName</code> (اسم أيقونة Lucide), <code>imageHint</code>, <code>order</code> (رقم).<br/>
          استيراد CSV/XLSX للتفاصيل ذات المستوى الأعلى. الاستيراد المتداخل الكامل (الأقسام، الدروس) عبر JSON هو ميزة متقدمة تتطلب هيكلًا محددًا.
          <br/>
          JSON: مصفوفة من كائنات المواد (حقول المستوى الأعلى).
        </>
      ),
    },
  ];


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2 rtl:space-x-reverse">
            <Upload className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">استيراد البيانات</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            قم بتحميل ملفات CSV أو Excel (.xlsx) أو JSON لاستيراد البيانات دفعة واحدة. (ملاحظة: سيفشل استيراد البيانات حتى يتم ترحيل وظائف Firestore إلى Supabase).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {importSections.map(({ type, title, icon: Icon, instructions }) => {
            const state = importStates[type];
            return (
              <Card key={type} className="shadow-md">
                <CardHeader>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Icon className="h-6 w-6 text-primary" />
                    <CardTitle className="text-xl">{title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor={`file-import-input-${type}`} className="text-base font-medium">اختر ملفًا</Label>
                    <Input
                      id={`file-import-input-${type}`}
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json"
                      onChange={handleFileChangeWrapper(type)}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      disabled={state.isLoading}
                    />
                    {state.fileName && !state.error && (
                      <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <FileText className="h-4 w-4 ml-2 rtl:mr-2 rtl:ml-0 text-primary" /> المحدد: {state.fileName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground pt-1">{instructions}</p>
                  </div>

                  {state.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>خطأ في الاستيراد لـ {title}</AlertTitle>
                      <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                  )}
                  {state.successMessage && (
                    <Alert variant="default" className="bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300">
                      <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
                      <AlertTitle>نجح الاستيراد لـ {title}</AlertTitle>
                      <AlertDescription>{state.successMessage}</AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={() => handleImport(type)} disabled={state.isLoading || !state.file} size="lg" className="w-full sm:w-auto">
                    {state.isLoading ? <Loader2 className="ml-2 h-5 w-5 animate-spin rtl:mr-2 rtl:ml-0" /> : <Upload className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0" />}
                    استيراد {title.replace('استيراد ', '')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
