
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
    getUsers // For user import validation/lookup
} from '@/lib/firestore'; // These functions will now throw errors until implemented for Supabase
import type { Question, Option, Subject, QuestionType, Exam, NewsArticle, AccessCode, UserProfile, AccessCodeType } from '@/types';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from '@/components/ui/label';
// Removed: import { Timestamp } from 'firebase/firestore';

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
            console.warn("Import page: getSubjects/getUsers not implemented for Supabase yet. Form lookups might be affected.");
        } else {
            console.error("Error fetching subjects/users for import validation:", error);
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
          error: "Invalid file type. Please upload a CSV, XLSX, or JSON file.", 
          file: null, 
          fileName: null 
        });
        event.target.value = ''; 
      }
    }
  };

  const processParsedData = async (dataType: DataType, parsedData: any[]): Promise<any[] | string> => {
    if (!parsedData || parsedData.length === 0) {
      return "The selected file is empty or could not be parsed correctly.";
    }

    const itemsToImport: any[] = [];
    const subjectsMapByName = new Map(availableSubjects.map(s => [s.name.toLowerCase(), s.id]));
    const usersMapByEmail = new Map(availableUsers.map(u => [u.email?.toLowerCase(), u.id])); // use 'id' for Supabase

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
            // ... (existing question processing logic, assuming types are compatible or handled in batch function)
            // For now, pass through to batch function
            itemsToImport.push(normalizedRow); // Simplified for now, actual mapping in batch function
            break;
          case 'exams':
            // ... (existing exam processing logic)
             if (!normalizedRow.title || !normalizedRow.subjectname) { console.warn("Skipping exam: missing title or subjectName", normalizedRow); continue; }
            const examSubjectId = subjectsMapByName.get(String(normalizedRow.subjectname).toLowerCase());
            if (!examSubjectId && normalizedRow.subjectname) { console.warn("Skipping exam: subject not found", normalizedRow.subjectname); continue; }
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
            // ... (existing news processing logic)
            if (!normalizedRow.title || !normalizedRow.content) { console.warn("Skipping news: missing title or content", normalizedRow); continue; }
            itemsToImport.push({
              title: String(normalizedRow.title),
              content: String(normalizedRow.content),
              imageUrl: String(normalizedRow.imageurl || ''),
            });
            break;
          case 'accessCodes':
            if (!normalizedRow.name || !normalizedRow.encodedvalue || !normalizedRow.type || !normalizedRow.validfrom || !normalizedRow.validuntil) {
              console.warn("Skipping access code: missing required fields", normalizedRow); continue;
            }
            const codeType = String(normalizedRow.type).toLowerCase() as AccessCodeType;
            const validFromDate = new Date(String(normalizedRow.validfrom));
            const validUntilDate = new Date(String(normalizedRow.validuntil));
            if (isNaN(validFromDate.getTime()) || isNaN(validUntilDate.getTime())) { 
                console.warn("Skipping access code: invalid date format", normalizedRow); continue; 
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
              validFrom: validFromDate.toISOString(), // Convert to ISO string for Supabase
              validUntil: validUntilDate.toISOString(), // Convert to ISO string for Supabase
              isActive: normalizedRow.isactive !== undefined ? String(normalizedRow.isactive).toLowerCase() === 'true' : true,
            });
            break;
          case 'users': // User Profiles
            const userEmail = String(normalizedRow.email || '').toLowerCase();
            if (!userEmail) { console.warn("Skipping user: missing email", normalizedRow); continue; }
            let userId = normalizedRow.id || normalizedRow.uid ? String(normalizedRow.id || normalizedRow.uid) : usersMapByEmail.get(userEmail);

            itemsToImport.push({
              id: userId, // Use 'id' for Supabase
              email: userEmail,
              displayName: String(normalizedRow.displayname || ''),
              role: String(normalizedRow.role || 'user').toLowerCase() as UserProfile['role'],
              subjectsTaughtIds: String(normalizedRow.subjectstaughtids || '').split(',').map(id => id.trim()).filter(id => id),
              youtubeChannelUrl: String(normalizedRow.youtubechannelurl || ''),
            });
            break;
          case 'subjects':
            if (!normalizedRow.name || !normalizedRow.branch) { console.warn("Skipping subject: missing name or branch", normalizedRow); continue; }
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
            console.warn(`Skipping row: Unknown data type '${dataType}'`);
        }
      } catch (parseError) {
        console.error(`Error parsing row for ${dataType}:`, parseError, "Row data:", normalizedRow);
        return `Error parsing row data for ${dataType}. Please check file content and console for details.`;
      }
    }
    
    if (itemsToImport.length === 0) {
      return "No valid items found in the file to import. Please check the file content, format, and console for details on skipped rows.";
    }
    return itemsToImport;
  };


  const handleImport = useCallback(async (dataType: DataType) => {
    const state = importStates[dataType];
    if (!state.file) {
      updateImportState(dataType, { error: "Please select a file to import." });
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
            if (results.errors.length > 0) reject(new Error(`Error parsing CSV: ${results.errors[0].message}`));
            else resolve(results.data as any[]);
          },
          error: (err: any) => reject(new Error(`Failed to parse CSV file: ${err.message}`)),
        });
      });
    } else if (fileExtension === 'xlsx' || state.file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      parsedDataPromise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            if (!data) { reject(new Error("Failed to read XLSX file.")); return; }
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            resolve(XLSX.utils.sheet_to_json(worksheet));
          } catch (xlsxError) { reject(new Error(`Failed to parse XLSX file. Error: ${(xlsxError as Error).message}`)); }
        };
        reader.onerror = () => reject(new Error("Error reading XLSX file."));
        reader.readAsArrayBuffer(state.file!);
      });
    } else if (fileExtension === 'json' || state.file.type === 'application/json') {
      parsedDataPromise = new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            if (!text) { reject(new Error("Failed to read JSON file.")); return; }
            const jsonData = JSON.parse(text);
            if (!Array.isArray(jsonData)) { reject(new Error("Invalid JSON format. Expected an array.")); return; }
            resolve(jsonData);
          } catch (jsonError) { reject(new Error(`Failed to parse JSON file. Error: ${(jsonError as Error).message}`)); }
        };
        reader.onerror = () => reject(new Error("Error reading JSON file."));
        reader.readAsText(state.file!);
      });
    } else {
      updateImportState(dataType, { error: "Unsupported file type.", isLoading: false });
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
        default: throw new Error(`Unknown data type for import: ${dataType}`);
      }
      
      updateImportState(dataType, { 
        successMessage: `${itemsToImport.length} ${dataType} imported successfully from ${state.fileName}!`,
        file: null, 
        fileName: null 
      });
      toast({ title: "Success", description: `${itemsToImport.length} ${dataType} imported.` });
      const fileInput = document.getElementById(`file-import-input-${dataType}`) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      console.error(`Error processing or importing ${dataType}:`, err);
      if (err.message && err.message.includes("This function is not implemented for Supabase")) {
         updateImportState(dataType, { 
           error: `Import for ${dataType} failed: The backend function needs to be implemented for Supabase.`,
         });
         toast({ variant: "destructive", title: `Import Not Implemented for ${dataType}`, description: `Could not import ${dataType}. Backend logic pending.` });
      } else {
        updateImportState(dataType, { 
          error: `An error occurred during the import process for ${dataType}: ${(err as Error).message}. Check console for details.`,
        });
        toast({ variant: "destructive", title: `Import Failed for ${dataType}`, description: `Could not import ${dataType}.` });
      }
    } finally {
      updateImportState(dataType, { isLoading: false });
    }
  }, [importStates, toast, availableSubjects, availableUsers]); // Removed processParsedData from deps as it's defined inside

  const importSections: {
    type: DataType;
    title: string;
    icon: React.ElementType;
    instructions: React.ReactNode;
  }[] = [
    {
      type: 'questions',
      title: 'Import Questions',
      icon: ListChecks,
      instructions: (
        <>
          Required: <code>questionType</code> (mcq, true_false, fill_in_the_blanks, short_answer), <code>questionText</code>, <code>difficulty</code>, <code>subject</code> (name) or <code>subjectId</code>.<br/>
          MCQ/TrueFalse: <code>option1..6</code>, <code>correctOptionIndex</code> (1-based) or <code>correctOptionText</code>.<br/>
          FillInTheBlanks: <code>correctAnswers</code> (if multiple, semicolon ';' separated).<br/>
          ShortAnswer: <code>modelAnswer</code> (optional).<br/>
          Optional: <code>lessonId</code>, <code>tagIds</code> (comma-separated), <code>isSane</code>, <code>sanityExplanation</code>.<br/>
          JSON: Array of question objects.
        </>
      ),
    },
    {
      type: 'exams',
      title: 'Import Exams',
      icon: ListChecks,
      instructions: (
        <>
          Required: <code>title</code>, <code>subjectName</code> (must match an existing subject name).<br/>
          Optional: <code>description</code>, <code>questionIds</code> (comma-separated string of question IDs), <code>published</code> (true/false), <code>image</code> (URL), <code>imageHint</code>, <code>teacherName</code>, <code>teacherId</code>, <code>durationInMinutes</code> (number).<br/>
          JSON: Array of exam objects.
        </>
      ),
    },
    {
      type: 'news',
      title: 'Import News Articles',
      icon: NewspaperIcon,
      instructions: (
        <>
          Required: <code>title</code>, <code>content</code>.<br/>
          Optional: <code>imageUrl</code> (URL).<br/>
          JSON: Array of news article objects.
        </>
      ),
    },
    {
      type: 'accessCodes',
      title: 'Import Access Codes',
      icon: QrCodeIcon,
      instructions: (
        <>
          Required: <code>name</code>, <code>encodedValue</code> (unique string for QR), <code>type</code> (e.g., subject_monthly), <code>validFrom</code> (YYYY-MM-DD), <code>validUntil</code> (YYYY-MM-DD).<br/>
          Optional: <code>subjectName</code> (if type requires it, must match existing subject), <code>isActive</code> (true/false, defaults to true).<br/>
          JSON: Array of access code objects (ensure dates are ISO strings or parseable).
        </>
      ),
    },
    {
      type: 'users',
      title: 'Import User Profiles',
      icon: UsersIcon,
      instructions: (
        <>
          Required: <code>email</code>.<br/>
          Optional: <code>id</code> (Supabase user ID, if updating existing profile), <code>displayName</code>, <code>role</code> (student, teacher, admin, user), <code>subjectsTaughtIds</code> (comma-separated subject IDs), <code>youtubeChannelUrl</code>.<br/>
          **Note:** This does NOT create Supabase Auth users. Users must exist in Supabase Auth. Use <code>id</code> or <code>email</code> to target profiles.
          <br/>
          JSON: Array of user profile objects.
        </>
      ),
    },
    {
      type: 'subjects',
      title: 'Import Subjects',
      icon: BookOpenIcon,
      instructions: (
        <>
          Required: <code>name</code>, <code>branch</code> (scientific, literary, general).<br/>
          Optional: <code>description</code>, <code>image</code> (URL), <code>iconName</code> (Lucide icon name), <code>imageHint</code>, <code>order</code> (number).<br/>
          CSV/XLSX imports top-level details. Full nested import (sections, lessons) via JSON is an advanced feature requiring specific structure.
          <br/>
          JSON: Array of subject objects (top-level fields).
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
            <CardTitle className="text-3xl font-bold tracking-tight">Import Data</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            Upload CSV, Excel (.xlsx), or JSON files to batch import. (Note: Data import will fail until Firestore functions are migrated to Supabase).
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
                    <Label htmlFor={`file-import-input-${type}`} className="text-base font-medium">Select File</Label>
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
                        <FileText className="h-4 w-4 mr-2 text-primary rtl:ml-2 rtl:mr-0" /> Selected: {state.fileName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground pt-1">{instructions}</p>
                  </div>

                  {state.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Import Error for {title}</AlertTitle>
                      <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                  )}
                  {state.successMessage && (
                    <Alert variant="default" className="bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300">
                      <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
                      <AlertTitle>Import Successful for {title}</AlertTitle>
                      <AlertDescription>{state.successMessage}</AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={() => handleImport(type)} disabled={state.isLoading || !state.file} size="lg" className="w-full sm:w-auto">
                    {state.isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin rtl:ml-2 rtl:mr-0" /> : <Upload className="mr-2 h-5 w-5 rtl:ml-2 rtl:mr-0" />}
                    Import {title.replace('Import ', '')}
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
