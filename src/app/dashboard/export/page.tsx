
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
    convertTimestampsToDates // This function might need adjustment or might not be needed if Supabase returns ISO strings
} from '@/lib/firestore'; // These functions will now throw errors until implemented for Supabase
import type { Question, Option } from '@/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
// Removed: import { Timestamp } from 'firebase/firestore'; 

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
      toast({ title: "No Data", description: `No data available to export for ${filename}.` });
      return;
    }
    try {
      // Assuming convertTimestampsToDates ensures all date-like fields are ISO strings
      const processedData = convertTimestampsToDates(data); 
      const jsonString = JSON.stringify(processedData, null, 2);
      downloadFile(jsonString, `${filename}.json`, 'application/json');
      toast({ title: "Success", description: `${filename} exported successfully as JSON.` });
    } catch (error) {
      console.error(`Error exporting ${filename} to JSON:`, error);
      toast({ variant: "destructive", title: "Export Error", description: `Failed to export ${filename} as JSON.` });
    }
  };

  const downloadXLSX = (data: any[], filename: string, dataType: DataType) => {
    if (!Array.isArray(data) || data.length === 0) {
      toast({ title: "No Data", description: `No data available to export for ${filename}.` });
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
          // Assuming options is an array of {id: string, text: string}
          if (q.options && Array.isArray(q.options)) {
            q.options.forEach((opt, index) => {
              flatQuestion[`option${index + 1}`] = opt.text;
            });
            const correctOption = q.options.find(opt => opt.id === q.correctOptionId);
            flatQuestion['correctOptionText'] = correctOption ? correctOption.text : 'N/A';
          }
          flatQuestion['correctOptionId'] = q.correctOptionId;
          // Timestamps are now strings (ISO dates) from Supabase, no conversion needed here
          flatQuestion['createdAt'] = q.created_at;
          flatQuestion['updatedAt'] = q.updated_at;
          return flatQuestion;
        });
      } else {
        // Generic processing for other data types
        // Assuming convertTimestampsToDates handles date conversions if necessary
        processedDataForSheet = convertTimestampsToDates(data.map(item => {
          const flatItem: {[key: string]: any} = {};
          for (const key in item) {
            if (Array.isArray(item[key])) {
              flatItem[key] = JSON.stringify(item[key]); // Stringify arrays for XLSX
            } else if (typeof item[key] === 'object' && item[key] !== null && !(item[key] instanceof Date)) {
              // Skip complex objects not suitable for simple XLSX representation or stringify them
              // flatItem[key] = JSON.stringify(item[key]);
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
      toast({ title: "Success", description: `${filename} exported successfully as XLSX.` });
    } catch (error) {
      console.error(`Error exporting ${filename} to XLSX:`, error);
      toast({ variant: "destructive", title: "Export Error", description: `Failed to export ${filename} as XLSX.` });
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
      // Check if it's the "Not Implemented" error
      if (error.message && error.message.includes("This function is not implemented for Supabase")) {
        toast({ variant: "destructive", title: "Function Not Implemented", description: `The '${dataType}' data export relies on functions that need to be migrated to Supabase.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Failed to fetch ${dataType} for export.` });
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [dataType]: false }));
    }
  };
  
  const handleFormatChange = (dataType: DataType, format: ExportFormat) => {
    setExportFormats(prev => ({ ...prev, [dataType]: format }));
  };

  const exportConfig: { type: DataType, label: string, fetchData: () => Promise<any[]>, filename: string, supportedFormats: ExportFormat[] }[] = [
    { type: 'questions', label: 'Export Questions', fetchData: getQuestions, filename: 'questions_export', supportedFormats: ['xlsx', 'json'] },
    { type: 'exams', label: 'Export Exams', fetchData: getExams, filename: 'exams_export', supportedFormats: ['xlsx', 'json'] },
    { type: 'news', label: 'Export News', fetchData: getNewsArticles, filename: 'news_export', supportedFormats: ['xlsx', 'json'] },
    { type: 'accessCodes', label: 'Export Access Codes', fetchData: getAccessCodes, filename: 'access_codes_export', supportedFormats: ['xlsx', 'json'] },
    { type: 'users', label: 'Export Users', fetchData: getUsers, filename: 'users_export', supportedFormats: ['xlsx', 'json'] },
    { type: 'subjects', label: 'Export Subjects (with details)', fetchData: getSubjectsWithDetails, filename: 'subjects_with_details_export', supportedFormats: ['json'] },
  ];

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2 rtl:space-x-reverse">
            <Download className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">Export Data</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            Download your application data in various formats. 
            (Note: Data fetching will fail until Firestore functions are migrated to Supabase).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <p className="text-sm text-muted-foreground">
            Select the data type and format you wish to export. 
            Date fields will be exported as ISO date strings.
            For nested data like Subjects (with sections and lessons), JSON format is recommended.
            For Questions exported to XLSX, options and correct answers will be in separate columns.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {exportConfig.map(({ type, label, fetchData, filename, supportedFormats }) => (
              <Card key={type} className="p-4">
                <h3 className="text-lg font-semibold mb-2">{label}</h3>
                <RadioGroup 
                  defaultValue={exportFormats[type]} 
                  onValueChange={(value) => handleFormatChange(type, value as ExportFormat)}
                  className="mb-4"
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
                  {loadingStates[type] ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                  Export {exportFormats[type].toUpperCase()}
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
