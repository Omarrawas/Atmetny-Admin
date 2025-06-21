
// src/app/dashboard/questions/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, RefreshCw, CheckCircle2, AlertTriangle, TagsIcon, Loader2, Save, Search, Download, Upload, Info, Sparkles, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Renamed DialogTrigger import below
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input as UiInput } from '@/components/ui/input'; // Renamed to avoid conflict
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { getQuestions, deleteQuestion as deleteQuestionFromDb, updateQuestion as updateQuestionInDb, getTags, addTag as createTagInDb, getSubjects, convertTimestampsToDates } from '@/lib/firestore';
import type { Question, Tag, Subject, Option } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { arabicQuestionSanityCheck } from '@/ai/flows/arabic-question-sanity-check';
import { suggestQuestionTags } from '@/ai/flows/suggest-question-tags-flow'; // Import the new flow
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as XLSX from 'xlsx';
import { Timestamp } from 'firebase/firestore';
import { DialogTrigger as UiDialogTrigger } from "@/components/ui/dialog"; 
import { useAuth } from '@/hooks/use-auth';
import NextImage from 'next/image'; // Import NextImage


export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [managingTagsForQuestion, setManagingTagsForQuestion] = useState<Question | null>(null);
  const [selectedTagIdsInDialog, setSelectedTagIdsInDialog] = useState<string[]>([]);
  const [newTagNameInDialog, setNewTagNameInDialog] = useState('');
  const [isAddingTagInDialog, setIsAddingTagInDialog] = useState(false);
  const [isSuggestingTagsInDialog, setIsSuggestingTagsInDialog] = useState(false);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [activeAccordionSubject, setActiveAccordionSubject] = useState<string | null>(null);

  const [actionDialogState, setActionDialogState] = useState<{
    type: 'export' | 'import' | null;
    subject: Subject | null;
    importFormat?: 'xlsx' | 'json' | 'csv';
  }>({ type: null, subject: null });


  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const fetchPageData = useCallback(async () => {
    if (!user || !userProfile) return;
    
    setIsLoading(true);
    setIsLoadingTags(true);
    setIsLoadingSubjects(true);
    try {
      const [fetchedQuestions, fetchedTags, fetchedSubjects] = await Promise.all([
        getQuestions(user.id, userProfile.role),
        getTags(),
        getSubjects(user.id, userProfile.role),
      ]);
      setQuestions(fetchedQuestions);
      setAllTags(fetchedTags);
      setAvailableSubjects(fetchedSubjects);
    } catch (error) {
      console.error("Error fetching page data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch questions, tags, or subjects.",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingTags(false);
      setIsLoadingSubjects(false);
    }
  }, [toast, user, userProfile]);

  useEffect(() => {
    if (user && userProfile) {
      fetchPageData();
    }
  }, [fetchPageData, user, userProfile]);

  const tagsMap = useMemo(() => {
    const map = new Map<string, string>();
    allTags.forEach(tag => {
      if (tag.id) map.set(tag.id, tag.name);
    });
    return map;
  }, [allTags]);

  const subjectsMap = useMemo(() => {
    const map = new Map<string, { name: string, branch: string }>();
    availableSubjects.forEach(subject => {
      if (subject.id) map.set(subject.id, { name: subject.name, branch: subject.branch });
    });
    return map;
  }, [availableSubjects]);

  const handleDeleteQuestion = async () => {
    if (!deletingQuestionId) return;
    try {
      await deleteQuestionFromDb(deletingQuestionId);
      setQuestions(questions.filter(q => q.id !== deletingQuestionId));
      toast({
        title: "Success",
        description: "Question deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete question.",
      });
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleSanityCheck = async (question: Question) => {
    if (!question.id) return;
    const originalIsLoading = isLoading;
    setIsLoading(true);
    try {
      const result = await arabicQuestionSanityCheck({ question: question.questionText });
      await updateQuestionInDb(question.id, { isSane: result.isSane, sanityExplanation: result.explanation });
      setQuestions(prevQuestions => prevQuestions.map(q =>
        q.id === question.id ? { ...q, isSane: result.isSane, sanityExplanation: result.explanation } : q
      ));
      toast({
        title: "Sanity Check Complete",
        description: `Question sanity: ${result.isSane ? 'Valid' : 'Invalid'}.`,
      });
    } catch (error) {
      console.error("Error during sanity check:", error);
      toast({
        variant: "destructive",
        title: "AI Check Error",
        description: "Failed to perform sanity check.",
      });
    } finally {
      setIsLoading(originalIsLoading);
    }
  };

  const filteredQuestions = useMemo(() => {
    if (!searchTerm) return questions;
    return questions.filter(q =>
      q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.subject && q.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.subjectId && subjectsMap.get(q.subjectId)?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.tagIds && q.tagIds.some(tagId => tagsMap.get(tagId)?.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  }, [questions, searchTerm, tagsMap, subjectsMap]);

  const questionsGroupedBySubject = useMemo(() => {
    const grouped = new Map<string, Question[]>();
    filteredQuestions.forEach(question => {
      const subjectId = question.subjectId || 'uncategorized';
      if (!grouped.has(subjectId)) {
        grouped.set(subjectId, []);
      }
      grouped.get(subjectId)!.push(question);
    });
    // Ensure all available subjects have an entry, even if empty, for consistent accordion rendering
    availableSubjects.forEach(subject => {
        if (subject.id && !grouped.has(subject.id)) {
            grouped.set(subject.id, []);
        }
    });
    if (!grouped.has('uncategorized') && filteredQuestions.some(q => !q.subjectId)) {
        grouped.set('uncategorized', []); // Ensure uncategorized exists if relevant
    }
    return grouped;
  }, [filteredQuestions, availableSubjects]);


  const getTagDisplay = (tagIds?: string[]) => {
    if (!tagIds || tagIds.length === 0) return 'No Tags';
    const tagNames = tagIds.map(id => tagsMap.get(id) || 'Unknown Tag').filter(name => name !== 'Unknown Tag');
    if (tagNames.length === 0) return 'No Tags';
    if (tagNames.length > 2) return `${tagNames.slice(0, 2).join(', ')}, ... (${tagNames.length} total)`;
    return tagNames.join(', ');
  };

  const handleOpenManageTagsDialog = (question: Question) => {
    setManagingTagsForQuestion(question);
    setSelectedTagIdsInDialog(question.tagIds || []);
    setNewTagNameInDialog('');
  };

  const handleTagSelectionChangeInDialog = (tagId: string) => {
    setSelectedTagIdsInDialog(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAddNewTagFromDialog = async () => {
    if (!newTagNameInDialog.trim() || !managingTagsForQuestion) return;
    if (allTags.some(tag => tag.name.toLowerCase() === newTagNameInDialog.trim().toLowerCase())) {
        toast({ variant: "destructive", title: "Duplicate Tag", description: "A tag with this name already exists." });
        return;
    }
    setIsAddingTagInDialog(true);
    try {
      const newTagId = await createTagInDb({ name: newTagNameInDialog.trim() });
      const newTagObject = { id: newTagId, name: newTagNameInDialog.trim(), createdAt: new Date() as any, updatedAt: new Date() as any } as Tag;
      setAllTags(prev => [...prev, newTagObject]);
      setSelectedTagIdsInDialog(prev => [...prev, newTagId]);
      setNewTagNameInDialog('');
      toast({ title: "Tag Added", description: `Tag "${newTagObject.name}" added and selected.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to add new tag." });
    } finally {
      setIsAddingTagInDialog(false);
    }
  };

  const handleAiSuggestTagsInDialog = async () => {
    if (!managingTagsForQuestion || !managingTagsForQuestion.questionText) {
        toast({ variant: "destructive", title: "No Question Text", description: "Cannot suggest tags without question text." });
        return;
    }
    setIsSuggestingTagsInDialog(true);
    try {
        const result = await suggestQuestionTags({ questionText: managingTagsForQuestion.questionText });
        let newTagsCreatedCount = 0;
        let existingTagsSelectedCount = 0;
        const updatedTagIds = new Set<string>(selectedTagIdsInDialog);

        for (const suggestedTagName of result.suggestedTags) {
            const normalizedSuggestedName = suggestedTagName.trim().toLowerCase();
            let existingTag = allTags.find(tag => tag.name.toLowerCase() === normalizedSuggestedName);

            if (existingTag && existingTag.id) {
                if (!updatedTagIds.has(existingTag.id)) {
                    updatedTagIds.add(existingTag.id);
                    existingTagsSelectedCount++;
                }
            } else {
                const newTagId = await createTagInDb({ name: suggestedTagName.trim() });
                const newTag: Tag = { id: newTagId, name: suggestedTagName.trim(), createdAt: new Date() as any, updatedAt: new Date() as any };
                setAllTags(prev => [...prev, newTag]); 
                updatedTagIds.add(newTagId);
                newTagsCreatedCount++;
            }
        }
        setSelectedTagIdsInDialog(Array.from(updatedTagIds));
        let toastMessage = "AI suggestions applied.";
        if (newTagsCreatedCount > 0) toastMessage += ` ${newTagsCreatedCount} new tags created.`;
        if (existingTagsSelectedCount > 0) toastMessage += ` ${existingTagsSelectedCount} existing tags selected.`;
        toast({ title: "Tag Suggestions", description: toastMessage });
    } catch (error) {
        console.error("AI Tag Suggestion Error in Dialog:", error);
        toast({ variant: "destructive", title: "AI Suggestion Failed", description: "Could not get tag suggestions." });
    } finally {
        setIsSuggestingTagsInDialog(false);
    }
  };


  const handleSaveQuestionTags = async () => {
    if (!managingTagsForQuestion || !managingTagsForQuestion.id) return;
    setIsSavingTags(true);
    try {
      await updateQuestionInDb(managingTagsForQuestion.id, { tagIds: selectedTagIdsInDialog });
      setQuestions(prev => prev.map(q =>
        q.id === managingTagsForQuestion.id ? { ...q, tagIds: selectedTagIdsInDialog } : q
      ));
      toast({ title: "Success", description: "Question tags updated." });
      setManagingTagsForQuestion(null); // Close dialog
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update question tags." });
    } finally {
      setIsSavingTags(false);
    }
  };

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

  const handleExportSubjectQuestions = (subject: Subject, questionsToExport: Question[], format: 'xlsx' | 'json') => {
    if (!questionsToExport || questionsToExport.length === 0) {
      toast({ title: "No Data", description: `No questions available to export for ${subject.name}.` });
      return;
    }

    const filename = `questions_${subject.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;

    try {
      if (format === 'json') {
        const processedData = convertTimestampsToDates(questionsToExport);
        const jsonString = JSON.stringify(processedData, null, 2);
        downloadFile(jsonString, `${filename}.json`, 'application/json');
        toast({ title: "Success", description: `Questions for ${subject.name} exported as JSON.` });
      } else if (format === 'xlsx') {
        const processedDataForSheet = questionsToExport.map(q => {
          const flatQuestion: { [key: string]: any } = {
            questionText: q.questionText,
            imageUrl: q.imageUrl,
            imageHint: q.imageHint,
            difficulty: q.difficulty,
            subject: q.subject,
            subjectId: q.subjectId,
            lessonId: q.lessonId,
            isSane: q.isSane,
            sanityExplanation: q.sanityExplanation,
            tagIds: q.tagIds?.map(id => tagsMap.get(id) || id).join(', ') || '',
          };
          if(q.questionType === 'mcq'){
            (q.options as Option[]).forEach((opt, index) => {
                flatQuestion[`option${index + 1}`] = opt.text;
            });
            const correctOption = (q.options as Option[]).find(opt => opt.id === q.correctOptionId);
            flatQuestion['correctOptionText'] = correctOption ? correctOption.text : 'N/A';
            flatQuestion['correctOptionId'] = q.correctOptionId;
          } else if (q.questionType === 'true_false'){
            flatQuestion['correctOptionId'] = q.correctOptionId; // true or false
          } else if (q.questionType === 'fill_in_the_blanks'){
            flatQuestion['correctAnswers'] = q.correctAnswers?.join('; ');
          } else if (q.questionType === 'short_answer'){
            flatQuestion['modelAnswer'] = q.modelAnswer;
          }

          if (q.created_at && (q.created_at as any).toDate) flatQuestion['createdAt'] = (q.created_at as unknown as Timestamp).toDate().toISOString();
          if (q.updated_at && (q.updated_at as any).toDate) flatQuestion['updatedAt'] = (q.updated_at as unknown as Timestamp).toDate().toISOString();
          return flatQuestion;
        });

        const worksheet = XLSX.utils.json_to_sheet(processedDataForSheet);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        toast({ title: "Success", description: `Questions for ${subject.name} exported as XLSX.` });
      }
    } catch (error) {
      console.error(`Error exporting questions for ${subject.name}:`, error);
      toast({ variant: "destructive", title: "Export Error", description: `Failed to export questions for ${subject.name}.` });
    }
    setActionDialogState({ type: null, subject: null }); // Close dialog
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Questions</h1>
          <p className="text-muted-foreground">
            Browse, add, edit, or delete questions. Questions are grouped by subject.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPageData} disabled={isLoading || isLoadingTags || isLoadingSubjects}>
            <RefreshCw className={`mr-2 h-4 w-4 ${(isLoading || isLoadingTags || isLoadingSubjects) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/dashboard/questions/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Question
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question List by Subject</CardTitle>
          <CardDescription>
            Questions are grouped by subject. Use the search to filter by text, subject name, or tag name.
          </CardDescription>
          <UiInput
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-2 max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {(isLoading || isLoadingSubjects || isLoadingTags) && questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2"/> Loading data...
            </div>
          ) : availableSubjects.length === 0 && !isLoadingSubjects ? (
            <div className="text-center py-8 text-muted-foreground">No subjects found. Please add subjects first.</div>
          ) : (
            <Accordion
                type="single"
                collapsible
                className="w-full"
                value={activeAccordionSubject}
                onValueChange={setActiveAccordionSubject}
            >
              {availableSubjects.map(subject => {
                const subjectQuestions = questionsGroupedBySubject.get(subject.id!) || [];
                if (subjectQuestions.length === 0 && searchTerm && !Object.keys(questionsGroupedBySubject).includes(subject.id!)) return null;

                return (
                  <AccordionItem value={subject.id!} key={subject.id}>
                    <div className="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/50 rounded-t-md">
                      <AccordionTrigger className="flex-grow p-0 text-left hover:no-underline data-[state=closed]:hover:underline data-[state=open]:hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm [&>svg]:ml-2 rtl:[&>svg]:mr-2 rtl:[&>svg]:ml-0">
                        <span className="font-semibold">{subject.name} ({subject.branch})</span>
                      </AccordionTrigger>
                      <div className="flex items-center gap-1 ml-3 rtl:mr-3 rtl:ml-0 shrink-0">
                        <Badge variant="outline" className="px-1.5 py-0.5 text-xs whitespace-nowrap">{subjectQuestions.length} Questions</Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); setActionDialogState({ type: 'export', subject }); }}
                                disabled={subjectQuestions.length === 0}
                              >
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Export Questions for {subject.name}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Export Questions for {subject.name}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); setActionDialogState({ type: 'import', subject }); }}
                              >
                                <Upload className="h-4 w-4" />
                                <span className="sr-only">Import Questions for {subject.name}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Import Questions for {subject.name}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <AccordionContent>
                      {subjectQuestions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {searchTerm ? `No questions match your search for "${subject.name}".` : `No questions found for "${subject.name}".`}
                        </p>
                      ) : (
                        <div className="overflow-x-auto border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[30%]">Question Text</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead>Sanity Check</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subjectQuestions.map((question) => (
                                <TableRow key={question.id}>
                                  <TableCell className="font-medium max-w-xs" title={question.questionText}>
                                    <div className="flex items-center gap-2">
                                      {question.imageUrl && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <ImageIcon className="h-4 w-4 text-primary flex-shrink-0" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>هذا السؤال يحتوي على صورة.</p>
                                              <div className="relative mt-2 h-24 w-auto max-w-xs rounded-md overflow-hidden">
                                                <NextImage src={question.imageUrl} alt="Question Preview" layout="fill" objectFit="contain"/>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                      <span className="truncate">{question.questionText}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      question.difficulty === 'easy' ? 'default' :
                                      question.difficulty === 'medium' ? 'secondary' : 'destructive'
                                    } className={`capitalize ${
                                      question.difficulty === 'easy' ? 'bg-green-500 hover:bg-green-600' :
                                      question.difficulty === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                      'bg-red-500 hover:bg-red-600'
                                    } text-white`}>
                                      {question.difficulty}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {question.isSane === undefined || question.isSane === null ? (
                                      <Button size="sm" variant="outline" onClick={() => handleSanityCheck(question)} disabled={isLoading} className="text-xs px-2 py-1 h-auto">
                                        Check
                                      </Button>
                                    ) : (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            {question.isSane ? (
                                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                              <AlertTriangle className="h-5 w-5 text-red-600" />
                                            )}
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs text-sm bg-popover text-popover-foreground p-2 rounded shadow-lg">
                                            <p>{question.sanityExplanation || (question.isSane ? "Looks good!" : "Needs review.")}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <TooltipProvider>
                                        <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="cursor-default truncate max-w-[120px] text-xs">
                                            {getTagDisplay(question.tagIds)}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs text-sm bg-popover text-popover-foreground p-2 rounded shadow-lg">
                                            <p>{question.tagIds && question.tagIds.length > 0 ? (question.tagIds.map(id => tagsMap.get(id)).filter(Boolean).join(', ') || 'No valid tags') : 'No tags assigned'}</p>
                                        </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-right space-x-1 rtl:space-x-reverse">
                                    <Dialog open={managingTagsForQuestion?.id === question.id} onOpenChange={(open) => { if (!open) setManagingTagsForQuestion(null); }}>
                                      <UiDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" aria-label="Manage tags" onClick={() => handleOpenManageTagsDialog(question)}>
                                          <TagsIcon className="h-4 w-4" />
                                        </Button>
                                      </UiDialogTrigger>
                                      {managingTagsForQuestion && managingTagsForQuestion.id === question.id && (
                                        <DialogContent className="sm:max-w-md" dir="rtl">
                                          <DialogHeader className="text-right">
                                            <DialogTitle>إدارة التصنيفات للسؤال: "{managingTagsForQuestion.questionText.substring(0, 30)}..."</DialogTitle>
                                            <DialogDescription>
                                              اختر التصنيفات لربطها بهذا السؤال. يمكنك أيضًا إضافة تصنيفات جديدة.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4 py-2">
                                            <div className="flex items-end gap-2">
                                              <div className="flex-grow">
                                                  <Label htmlFor="new-tag-name-dialog" className="text-sm">إضافة تصنيف جديد</Label>
                                                  <UiInput
                                                    id="new-tag-name-dialog"
                                                    value={newTagNameInDialog}
                                                    onChange={(e) => setNewTagNameInDialog(e.target.value)}
                                                    placeholder="أدخل اسم التصنيف الجديد"
                                                    className="mt-1"
                                                  />
                                              </div>
                                              <Button type="button" onClick={handleAddNewTagFromDialog} disabled={isAddingTagInDialog || !newTagNameInDialog.trim()} size="sm">
                                                {isAddingTagInDialog ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-1 h-4 w-4"/>} أضف
                                              </Button>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={handleAiSuggestTagsInDialog} disabled={isSuggestingTagsInDialog || isAddingTagInDialog || !managingTagsForQuestion.questionText} className="w-full">
                                                {isSuggestingTagsInDialog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                اقتراح تصنيفات بالذكاء الاصطناعي
                                            </Button>
                                            <ScrollArea className="h-48 border rounded-md p-2">
                                              <div className="space-y-1">
                                              {isLoadingTags && allTags.length === 0 ? (
                                                  <p className="text-sm text-muted-foreground text-center py-2">جاري تحميل التصنيفات...</p>
                                              ) : allTags.length === 0 ? (
                                                  <p className="text-sm text-muted-foreground text-center py-2">لا توجد تصنيفات متاحة. أضف تصنيفًا جديدًا أعلاه أو من <Link href="/dashboard/tags" className="text-primary hover:underline">صفحة التصنيفات</Link>.</p>
                                              ) : (
                                                  allTags.map(tag => (
                                                    <div key={tag.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                                                        <Checkbox
                                                        id={`dialog-tag-${tag.id}`}
                                                        checked={selectedTagIdsInDialog.includes(tag.id!)}
                                                        onCheckedChange={() => handleTagSelectionChangeInDialog(tag.id!)}
                                                        />
                                                        <Label htmlFor={`dialog-tag-${tag.id}`} className="font-normal text-sm cursor-pointer">
                                                        {tag.name}
                                                        </Label>
                                                    </div>
                                                  ))
                                              )}
                                              </div>
                                            </ScrollArea>
                                          </div>
                                          <DialogFooter className="sm:justify-end gap-2 pt-4 flex-row-reverse">
                                            <DialogClose asChild>
                                              <Button type="button" variant="outline">إلغاء</Button>
                                            </DialogClose>
                                            <Button type="button" onClick={handleSaveQuestionTags} disabled={isSavingTags}>
                                              {isSavingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                              حفظ التصنيفات
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      )}
                                    </Dialog>
                                    <Link href={`/dashboard/questions/edit/${question.id}`}>
                                      <Button variant="outline" size="icon" aria-label="Edit question">
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" aria-label="Delete question" onClick={() => setDeletingQuestionId(question.id!)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent dir="rtl">
                                        <AlertDialogHeader className="text-right">
                                          <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            سيتم حذف هذا السؤال بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-row-reverse">
                                          <AlertDialogCancel onClick={() => setDeletingQuestionId(null)}>إلغاء</AlertDialogCancel>
                                          <AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
              {/* Fallback for uncategorized questions */}
             {Array.from(questionsGroupedBySubject.keys()).filter(key => key === 'uncategorized' && (questionsGroupedBySubject.get(key) || []).length > 0).map(subjectId => {
                const subjectQuestions = questionsGroupedBySubject.get(subjectId)!;
                const uncategorizedSubjectPlaceholder: Subject = { id: 'uncategorized', name: 'Uncategorized Questions', branch: 'general' };
                return (
                  <AccordionItem value={subjectId} key={subjectId}>
                     <div className="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/50 rounded-t-md">
                        <AccordionTrigger className="flex-grow p-0 text-left hover:no-underline data-[state=closed]:hover:underline data-[state=open]:hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm [&>svg]:ml-2 rtl:[&>svg]:mr-2 rtl:[&>svg]:ml-0">
                          <span className="font-semibold">أسئلة غير مصنفة لمادة</span>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 ml-3 rtl:mr-3 rtl:ml-0 shrink-0">
                            <Badge variant="outline" className="px-1.5 py-0.5 text-xs whitespace-nowrap">{subjectQuestions.length} Questions</Badge>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); setActionDialogState({ type: 'export', subject: uncategorizedSubjectPlaceholder });}}
                                    disabled={subjectQuestions.length === 0}
                                    >
                                    <Download className="h-4 w-4" />
                                    <span className="sr-only">Export Uncategorized Questions</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Export Uncategorized Questions</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); setActionDialogState({ type: 'import', subject: uncategorizedSubjectPlaceholder });}}
                                    >
                                    <Upload className="h-4 w-4" />
                                    <span className="sr-only">Import Uncategorized Questions</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Import Uncategorized Questions</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                    <AccordionContent>
                        <div className="overflow-x-auto border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[30%]">Question Text</TableHead>
                                <TableHead>Difficulty</TableHead>
                                <TableHead>Sanity Check</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subjectQuestions.map((question) => (
                                <TableRow key={question.id}>
                                  <TableCell className="font-medium max-w-xs truncate" title={question.questionText}>
                                    {question.questionText}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      question.difficulty === 'easy' ? 'default' :
                                      question.difficulty === 'medium' ? 'secondary' : 'destructive'
                                    } className={`capitalize ${
                                      question.difficulty === 'easy' ? 'bg-green-500 hover:bg-green-600' :
                                      question.difficulty === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                      'bg-red-500 hover:bg-red-600'
                                    } text-white`}>
                                      {question.difficulty}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {question.isSane === undefined || question.isSane === null ? (
                                      <Button size="sm" variant="outline" onClick={() => handleSanityCheck(question)} disabled={isLoading} className="text-xs px-2 py-1 h-auto">
                                        Check
                                      </Button>
                                    ) : (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            {question.isSane ? (
                                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                              <AlertTriangle className="h-5 w-5 text-red-600" />
                                            )}
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs text-sm bg-popover text-popover-foreground p-2 rounded shadow-lg">
                                            <p>{question.sanityExplanation || (question.isSane ? "Looks good!" : "Needs review.")}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <TooltipProvider>
                                        <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="cursor-default truncate max-w-[120px] text-xs">
                                            {getTagDisplay(question.tagIds)}
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs text-sm bg-popover text-popover-foreground p-2 rounded shadow-lg">
                                            <p>{question.tagIds && question.tagIds.length > 0 ? (question.tagIds.map(id => tagsMap.get(id)).filter(Boolean).join(', ') || 'No valid tags') : 'No tags assigned'}</p>
                                        </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-right space-x-1 rtl:space-x-reverse">
                                    <Dialog open={managingTagsForQuestion?.id === question.id} onOpenChange={(open) => { if (!open) setManagingTagsForQuestion(null); }}>
                                      <UiDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" aria-label="Manage tags" onClick={() => handleOpenManageTagsDialog(question)}>
                                          <TagsIcon className="h-4 w-4" />
                                        </Button>
                                      </UiDialogTrigger>
                                      {managingTagsForQuestion && managingTagsForQuestion.id === question.id && (
                                        <DialogContent className="sm:max-w-md" dir="rtl">
                                          <DialogHeader className="text-right">
                                            <DialogTitle>إدارة التصنيفات للسؤال: "{managingTagsForQuestion.questionText.substring(0, 30)}..."</DialogTitle>
                                            <DialogDescription>
                                              اختر التصنيفات لربطها بهذا السؤال. يمكنك أيضًا إضافة تصنيفات جديدة.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4 py-2">
                                            <div className="flex items-end gap-2">
                                              <div className="flex-grow">
                                                  <Label htmlFor="new-tag-name-dialog" className="text-sm">إضافة تصنيف جديد</Label>
                                                  <UiInput
                                                    id="new-tag-name-dialog"
                                                    value={newTagNameInDialog}
                                                    onChange={(e) => setNewTagNameInDialog(e.target.value)}
                                                    placeholder="أدخل اسم التصنيف الجديد"
                                                    className="mt-1"
                                                  />
                                              </div>
                                              <Button type="button" onClick={handleAddNewTagFromDialog} disabled={isAddingTagInDialog || !newTagNameInDialog.trim()} size="sm">
                                                {isAddingTagInDialog ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-1 h-4 w-4"/>} أضف
                                              </Button>
                                            </div>
                                             <Button type="button" variant="outline" size="sm" onClick={handleAiSuggestTagsInDialog} disabled={isSuggestingTagsInDialog || isAddingTagInDialog || !managingTagsForQuestion.questionText} className="w-full">
                                                {isSuggestingTagsInDialog ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                اقتراح تصنيفات بالذكاء الاصطناعي
                                            </Button>
                                            <ScrollArea className="h-48 border rounded-md p-2">
                                              <div className="space-y-1">
                                              {isLoadingTags && allTags.length === 0 ? (
                                                  <p className="text-sm text-muted-foreground text-center py-2">جاري تحميل التصنيفات...</p>
                                              ) : allTags.length === 0 ? (
                                                  <p className="text-sm text-muted-foreground text-center py-2">لا توجد تصنيفات متاحة. أضف تصنيفًا جديدًا أعلاه أو من <Link href="/dashboard/tags" className="text-primary hover:underline">صفحة التصنيفات</Link>.</p>
                                              ) : (
                                                  allTags.map(tag => (
                                                    <div key={tag.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                                                        <Checkbox
                                                        id={`dialog-tag-${tag.id}`}
                                                        checked={selectedTagIdsInDialog.includes(tag.id!)}
                                                        onCheckedChange={() => handleTagSelectionChangeInDialog(tag.id!)}
                                                        />
                                                        <Label htmlFor={`dialog-tag-${tag.id}`} className="font-normal text-sm cursor-pointer">
                                                        {tag.name}
                                                        </Label>
                                                    </div>
                                                  ))
                                              )}
                                              </div>
                                            </ScrollArea>
                                          </div>
                                          <DialogFooter className="sm:justify-end gap-2 pt-4 flex-row-reverse">
                                            <DialogClose asChild>
                                              <Button type="button" variant="outline">إلغاء</Button>
                                            </DialogClose>
                                            <Button type="button" onClick={handleSaveQuestionTags} disabled={isSavingTags}>
                                              {isSavingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                              حفظ التصنيفات
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      )}
                                    </Dialog>
                                    <Link href={`/dashboard/questions/edit/${question.id}`}>
                                      <Button variant="outline" size="icon" aria-label="Edit question">
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                    </Link>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" aria-label="Delete question" onClick={() => setDeletingQuestionId(question.id!)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent dir="rtl">
                                        <AlertDialogHeader className="text-right">
                                          <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            سيتم حذف هذا السؤال بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-row-reverse">
                                          <AlertDialogCancel onClick={() => setDeletingQuestionId(null)}>إلغاء</AlertDialogCancel>
                                          <AlertDialogAction onClick={handleDeleteQuestion} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
             {Array.from(questionsGroupedBySubject.keys()).length === 0 && !searchTerm && (
                <p className="text-center text-muted-foreground py-4">لا توجد أسئلة مضافة لأي مادة بعد.</p>
             )}
             {Array.from(questionsGroupedBySubject.keys()).length > 0 &&
              !Array.from(questionsGroupedBySubject.values()).some(qArray => qArray.length > 0) &&
              searchTerm && (
                <p className="text-center text-muted-foreground py-4">لا توجد أسئلة تطابق بحثك.</p>
             )}


            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Subject-Specific Import/Export Dialog */}
      <Dialog
        open={actionDialogState.type !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialogState({ type: null, subject: null });
          }
        }}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          {actionDialogState.subject && (
            <>
              <DialogHeader className="text-right">
                <DialogTitle>
                  {actionDialogState.type === 'export' ? 'تصدير أسئلة لـ: ' : 'استيراد أسئلة لـ: '}
                  {actionDialogState.subject.name}
                </DialogTitle>
                <DialogDescription>
                  {actionDialogState.type === 'export'
                    ? 'اختر الصيغة التي ترغب بتصدير الأسئلة بها لهذه المادة.'
                    : 'اختر الصيغة التي ترغب باستيراد الأسئلة منها لهذه المادة.'
                  }
                </DialogDescription>
              </DialogHeader>

              {actionDialogState.type === 'export' && actionDialogState.subject && (
                <div className="space-y-3 py-4">
                  <p className="text-sm text-muted-foreground">سيتم تصدير الأسئلة المطابقة للبحث الحالي (إن وجد) لهذه المادة.</p>
                  <Button
                    onClick={() => handleExportSubjectQuestions(actionDialogState.subject!, questionsGroupedBySubject.get(actionDialogState.subject!.id || 'uncategorized') || [], 'xlsx')}
                    className="w-full"
                  >
                    <Download className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> تصدير كـ XLSX (Excel)
                  </Button>
                  <Button
                    onClick={() => handleExportSubjectQuestions(actionDialogState.subject!, questionsGroupedBySubject.get(actionDialogState.subject!.id || 'uncategorized') || [], 'json')}
                    className="w-full"
                  >
                     <Download className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> تصدير كـ JSON
                  </Button>
                </div>
              )}

              {actionDialogState.type === 'import' && (
                <div className="space-y-4 py-4">
                   <RadioGroup
                    onValueChange={(value) => setActionDialogState(prev => ({...prev, importFormat: value as 'xlsx' | 'json' | 'csv'}))}
                    defaultValue={actionDialogState.importFormat}
                    className="space-y-1"
                  >
                    <Label className="text-base font-medium mb-2 block">اختر صيغة الملف للاستيراد:</Label>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="xlsx" id="import-xlsx" />
                      <Label htmlFor="import-xlsx">Excel (.xlsx)</Label>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="json" id="import-json" />
                      <Label htmlFor="import-json">JSON (.json)</Label>
                    </div>
                     <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value="csv" id="import-csv" />
                      <Label htmlFor="import-csv">CSV (.csv)</Label>
                    </div>
                  </RadioGroup>

                  {actionDialogState.importFormat && (
                     <Alert variant="default" className="mt-4">
                        <Info className="h-4 w-4" />
                        <AlertTitle>ملاحظة</AlertTitle>
                        <AlertDescription>
                            لاستيراد ملفات الأسئلة ({actionDialogState.importFormat.toUpperCase()}) لهذه المادة، يرجى استخدام <Link href="/dashboard/import" className="font-medium text-primary hover:underline">صفحة الاستيراد العامة</Link>.
                            <br/>
                            سيتم ربط الأسئلة بالمادة المحددة هنا تلقائيًا إذا تطابق اسم المادة في الملف مع اسم هذه المادة، أو إذا كان عمود `subjectId` موجودًا في الملف ويحمل معرّف هذه المادة.
                            <br/>
                            (سيتم دعم استيراد الملفات مباشرة من هذا المربع الحواري في تحديث لاحق.)
                        </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <DialogFooter className="flex-row-reverse">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setActionDialogState({ type: null, subject: null })}>إغلاق</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
