
// src/app/dashboard/qr-codes/page.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import QRCodeStyling from 'react-qr-code';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { addAccessCode, getAccessCodes, getSubjects, updateAccessCode, deleteAccessCode } from '@/lib/firestore'; // These will throw errors
import type { AccessCode, AccessCodeType, Subject } from '@/types';
import { QrCode, Download, Save, Loader2, CalendarIcon, Trash2, Edit3, CheckCircle, XCircle, ListChecks, PackagePlus, Printer, CheckSquare, Square, MinusSquare, CircleSlash, HelpCircle } from 'lucide-react';
import { format, addMonths, addYears, isValid, addQuarters, parseISO } from 'date-fns'; // Added parseISO
// Removed: import { Timestamp } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


const accessCodeSchema = z.object({
  name: z.string().min(3, "Code name must be at least 3 characters."),
  codeType: z.enum([
    'subject_specific',
    'subject_monthly',
    'subject_yearly',
    'general_monthly',
    'general_6_months',
    'general_yearly',
    'choose_single_subject_monthly',
    'choose_single_subject_quarterly',
    'choose_single_subject_yearly'
  ], {
    required_error: "Please select a code type.",
  }),
  subjectId: z.string().optional().nullable(),
  validFrom: z.date().optional().nullable(), // Dates from form will be Date objects
  validUntil: z.date().optional().nullable(),
  quantity: z.number().min(1, "Quantity must be at least 1.").optional().default(1),
}).superRefine((data, ctx) => {
  if (data.codeType === 'subject_specific' && (!data.validFrom || !data.validUntil)) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start and end dates are required for custom duration.",
      path: ["validFrom"],
    });
  }
  if (codeTypeRequiresAdminSelectedSubject(data.codeType) && !data.subjectId) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Subject selection is required for this code type.",
        path: ["subjectId"],
    });
  }
  if (data.validFrom && data.validUntil && data.validUntil < data.validFrom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date cannot be before start date.",
      path: ["validUntil"],
    });
  }
});

type AccessCodeFormValues = z.infer<typeof accessCodeSchema>;
type FilterStatus = 'all' | 'used' | 'active' | 'inactive';

const codeTypeRequiresAdminSelectedSubject = (type?: AccessCodeType) => {
  if (!type) return false;
  return type.startsWith('subject_');
};

const codeTypeStudentChoosesSubject = (type?: AccessCodeType) => {
  if (!type) return false;
  return type.startsWith('choose_single_subject_');
};


export default function QRCodesPage() {
  const [generatedQRValue, setGeneratedQRValue] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingCodes, setIsLoadingCodes] = useState(true);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([]);
  const [isHeaderChecked, setIsHeaderChecked] = useState<boolean | "indeterminate">(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');


  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const form = useForm<AccessCodeFormValues>({
    resolver: zodResolver(accessCodeSchema),
    defaultValues: {
      name: '',
      codeType: undefined,
      subjectId: null,
      validFrom: null,
      validUntil: null,
      quantity: 1,
    },
  });

  const watchedCodeType = form.watch("codeType");
  const watchedQuantity = form.watch("quantity");

  const fetchPageData = useCallback(async () => {
    setIsLoadingSubjects(true);
    setIsLoadingCodes(true);
    try {
      const [fetchedSubjectsData, fetchedCodesData] = await Promise.all([
        getSubjects(),
        getAccessCodes()
      ]);
      setSubjects(fetchedSubjectsData);
      setAccessCodes(fetchedCodesData);
    } catch (error: any) {
      console.error("Error fetching QR page data:", error);
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "QR Code functionality requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to load data for QR codes page." });
      }
      setSubjects([]);
      setAccessCodes([]);
    } finally {
      setIsLoadingSubjects(false);
      setIsLoadingCodes(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    if (editingCode) return;
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change' && name !== 'quantity' && name !== 'name' && !editingCode) {
        setGeneratedQRValue(uuidv4());
      }
    });
    if (!editingCode) {
        setGeneratedQRValue(uuidv4());
    }
    return () => subscription.unsubscribe();
  }, [form.watch, form, editingCode]);

  const filteredAccessCodes = useMemo(() => {
    if (filterStatus === 'all') {
      return accessCodes;
    }
    return accessCodes.filter(code => {
      const isActiveAndNotUsed = code.isActive && !code.isUsed;
      const isInactiveAndNotUsed = !code.isActive && !code.isUsed;

      if (filterStatus === 'used') return code.isUsed;
      if (filterStatus === 'active') return isActiveAndNotUsed;
      if (filterStatus === 'inactive') return isInactiveAndNotUsed;
      return true;
    });
  }, [accessCodes, filterStatus]);

  useEffect(() => {
    if (filteredAccessCodes.length === 0) {
      setIsHeaderChecked(false);
      return;
    }
    if (selectedCodeIds.length === 0) {
      setIsHeaderChecked(false);
    } else if (selectedCodeIds.length === filteredAccessCodes.length) {
      setIsHeaderChecked(true);
    } else {
      setIsHeaderChecked("indeterminate");
    }
  }, [selectedCodeIds, filteredAccessCodes]);


  const onSubmit = async (data: AccessCodeFormValues) => {
    setIsSubmitting(true);
    const { name, codeType, quantity } = data;
    let { validFrom, validUntil, subjectId: formSubjectId } = data;

    const now = new Date();
    if (codeType === 'subject_monthly' || codeType === 'general_monthly' || codeType === 'choose_single_subject_monthly') {
      validFrom = now;
      validUntil = addMonths(now, 1);
    } else if (codeType === 'choose_single_subject_quarterly') {
      validFrom = now;
      validUntil = addQuarters(now, 1);
    } else if (codeType === 'general_6_months') {
      validFrom = now;
      validUntil = addMonths(now, 6);
    } else if (codeType === 'subject_yearly' || codeType === 'general_yearly' || codeType === 'choose_single_subject_yearly') {
      validFrom = now;
      validUntil = addYears(now, 1);
    } else if (codeType === 'subject_specific') {
      if (!validFrom || !validUntil) {
        toast({ variant: "destructive", title: "Validation Error", description: "Start and End dates are required for subject specific codes with custom duration."});
        setIsSubmitting(false);
        return;
      }
    }

    if (!validFrom || !validUntil || !isValid(validFrom) || !isValid(validUntil) ) {
         toast({ variant: "destructive", title: "Invalid Dates", description: "Please ensure valid dates are set."});
         setIsSubmitting(false);
         return;
    }

    let finalSubjectId: string | null = null;
    let finalSubjectName: string | null = null;

    if (codeTypeRequiresAdminSelectedSubject(codeType) && formSubjectId) {
        const selectedAdminSubject = subjects.find(s => s.id === formSubjectId);
        if (selectedAdminSubject) {
            finalSubjectId = selectedAdminSubject.id!;
            finalSubjectName = selectedAdminSubject.name;
        } else {
            toast({ variant: "destructive", title: "Subject Error", description: "Selected subject not found." });
            setIsSubmitting(false);
            return;
        }
    }

    try {
      if (editingCode && editingCode.id) {
        const accessCodePayload: Partial<Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>> = {
          name,
          encodedValue: editingCode.encodedValue,
          type: codeType,
          subjectId: finalSubjectId,
          subjectName: finalSubjectName,
          validFrom: validFrom.toISOString(), // Convert Date to ISO string
          validUntil: validUntil.toISOString(), // Convert Date to ISO string
          isUsed: editingCode.isUsed || false,
          usedAt: editingCode.usedAt || null,
          usedByUserId: editingCode.usedByUserId || null,
        };
        await updateAccessCode(editingCode.id, accessCodePayload);
        toast({ title: "Success", description: "Access code updated successfully." });
      } else {
        const numCodesToGenerate = quantity || 1;
        const codesToGenerate: Omit<AccessCode, 'id' | 'created_at' | 'updated_at'>[] = [];
        for (let i = 0; i < numCodesToGenerate; i++) {
          const uniqueEncodedValue = uuidv4();
          const currentName = numCodesToGenerate > 1 ? `${name} #${i + 1}` : name;

          codesToGenerate.push({
            name: currentName,
            encodedValue: uniqueEncodedValue,
            type: codeType,
            subjectId: finalSubjectId,
            subjectName: finalSubjectName,
            validFrom: validFrom.toISOString(), // Convert Date to ISO string
            validUntil: validUntil.toISOString(), // Convert Date to ISO string
            isActive: true, 
            isUsed: false,
            usedAt: null,
            usedByUserId: null,
          });
        }

        for (const codePayload of codesToGenerate) {
          await addAccessCode(codePayload);
        }
        toast({ title: "Success", description: `${numCodesToGenerate} access code(s) generated and saved.` });
      }

      form.reset({ name: '', codeType: undefined, subjectId: null, validFrom: null, validUntil: null, quantity: 1 });
      if (!editingCode) setGeneratedQRValue(uuidv4());
      setEditingCode(null);
      setSelectedCodeIds([]);
      fetchPageData();
    } catch (error: any) {
      console.error("Error saving access code(s):", error);
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "QR Code saving requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to save access code(s)." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQR = () => {
    const svgElement = qrCodeRef.current?.querySelector('svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        const codeName = editingCode?.name || form.getValues("name") || "qrcode";
        downloadLink.download = `${codeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not find QR code SVG to download." });
    }
  };
  
  const handleDownloadListedQR = (encodedValue: string, name: string) => {
    setGeneratedQRValue(encodedValue); // Temporarily set main QR for rendering
    setTimeout(() => { // Allow state to update and QR to render
        const svgElement = qrCodeRef.current?.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const img = new Image();
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
          };
          img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
        } else {
          toast({ variant: "destructive", title: "Error", description: "Could not find QR code SVG for listed item." });
        }
        // Optionally reset generatedQRValue if it was only for this download
        if (editingCode) setGeneratedQRValue(editingCode.encodedValue);
        else if (form.getValues("name")) { /* keep form based QR */ }
        else setGeneratedQRValue(uuidv4());

    }, 100); // Small delay
  };


  const handleEditCode = (code: AccessCode) => {
    setEditingCode(code);
    form.reset({
      name: code.name,
      codeType: code.type,
      subjectId: code.subjectId,
      validFrom: code.validFrom ? parseISO(code.validFrom as string) : null,
      validUntil: code.validUntil ? parseISO(code.validUntil as string) : null,
      quantity: 1,
    });
    setGeneratedQRValue(code.encodedValue);
    setSelectedCodeIds([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCode = async () => {
    if (!deletingCodeId) return;
    try {
      await deleteAccessCode(deletingCodeId);
      toast({ title: "Success", description: "Access code deleted." });
      setSelectedCodeIds(prev => prev.filter(id => id !== deletingCodeId));
      fetchPageData();
    } catch (error: any) {
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Deleting QR Code requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete access code." });
      }
    } finally {
      setDeletingCodeId(null);
    }
  };

  const handleToggleActive = async (code: AccessCode) => {
    if (!code.id || code.isUsed) {
        toast({ variant: "destructive", title: "Action Not Allowed", description: "Used codes cannot be reactivated or deactivated." });
        return;
    }
    try {
        await updateAccessCode(code.id, { isActive: !code.isActive });
        toast({ title: "Status Updated", description: `Code "${code.name}" is now ${!code.isActive ? 'active' : 'inactive'}.`});
        fetchPageData();
    } catch (error: any) {
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Updating QR Code status requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to update code status."});
      }
    }
  };

  const handleHeaderCheckboxChange = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedCodeIds(filteredAccessCodes.map(code => code.id!));
    } else {
      setSelectedCodeIds([]);
    }
    setIsHeaderChecked(checked === true);
  };

  const handleRowCheckboxChange = (codeId: string) => {
    setSelectedCodeIds(prevSelected =>
      prevSelected.includes(codeId)
        ? prevSelected.filter(id => id !== codeId)
        : [...prevSelected, codeId]
    );
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedCodeIds.length === 0) return;
    try {
      for (const codeId of selectedCodeIds) {
        await deleteAccessCode(codeId);
      }
      toast({ title: "Success", description: `${selectedCodeIds.length} access code(s) deleted.` });
      setSelectedCodeIds([]);
      fetchPageData();
    } catch (error: any) {
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Bulk deleting QR Codes requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete selected access codes." });
      }
    } finally {
      setShowBulkDeleteDialog(false);
    }
  };

  const handleToggleActiveSelected = async (newActiveState: boolean) => {
    if (selectedCodeIds.length === 0) return;
    let SucceededCount = 0;
    let FailedUsedCount = 0;
    try {
      for (const codeId of selectedCodeIds) {
        const codeToToggle = accessCodes.find(c => c.id === codeId);
        if (codeToToggle?.isUsed && newActiveState) {
          FailedUsedCount++;
          continue;
        }
        await updateAccessCode(codeId, { isActive: newActiveState });
        SucceededCount++;
      }
      let message = "";
      if (SucceededCount > 0) {
         message += `${SucceededCount} code(s) status updated to ${newActiveState ? 'active' : 'inactive'}. `;
      }
      if (FailedUsedCount > 0) {
          message += `${FailedUsedCount} code(s) were already used and could not be activated.`;
      }
      if (message) {
        toast({ title: "Bulk Action Complete", description: message.trim() });
      }
      fetchPageData();
      setSelectedCodeIds([]);
    } catch (error: any) {
      if (error.message && error.message.includes(NOT_IMPLEMENTED_ERROR)) {
         toast({ variant: "destructive", title: "Function Not Implemented", description: "Bulk updating QR Code status requires Supabase backend implementation." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to update status for selected codes." });
      }
    }
  };
  
  const NOT_IMPLEMENTED_ERROR = "This function is not implemented for Supabase.";


  const handleDownloadSelected = () => {
    if (selectedCodeIds.length === 1) {
        const codeToDownload = accessCodes.find(c => c.id === selectedCodeIds[0]);
        if (codeToDownload) {
            handleDownloadListedQR(codeToDownload.encodedValue, codeToDownload.name);
        }
    } else if (selectedCodeIds.length > 1) {
        toast({ title: "Info", description: "Bulk download for multiple codes is not yet supported. Please download one by one or use Print." });
    } else {
        toast({ title: "Info", description: "No codes selected for download." });
    }
};

const handlePrintSelected = () => {
    if (selectedCodeIds.length === 0) {
        toast({ title: "Info", description: "No codes selected to print." });
        return;
    }

    if (selectedCodeIds.length === 1) {
        const codeToDownload = accessCodes.find(c => c.id === selectedCodeIds[0]);
        if (codeToDownload) {
            handleDownloadListedQR(codeToDownload.encodedValue, codeToDownload.name);
            toast({ title: "Print", description: "QR code downloaded. You can print it from your image viewer." });
            return;
        }
    }

    const codesToPrint = accessCodes.filter(code => selectedCodeIds.includes(code.id!));
    if (codesToPrint.length > 0) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            let printContent = `
                <html>
                <head>
                    <title>Print QR Codes</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; text-align: right;}
                        .qr-container {
                            display: inline-block;
                            text-align: center;
                            margin: 15px;
                            padding: 10px;
                            border: 1px solid #eee;
                            page-break-inside: avoid;
                            width: 120px; 
                        }
                        .qr-code svg { width: 100px !important; height: 100px !important; }
                        .qr-name { font-size: 12px; margin-top: 5px; word-wrap: break-word; }
                        @media print {
                            .no-print { display: none; }
                            body { margin: 0.5cm; }
                            .qr-container { border: 1px solid #ccc; }
                        }
                    </style>
                </head>
                <body>
                    <button class="no-print" onclick="window.print()">اطبع الرموز</button>
                    <hr class="no-print">
            `;
            codesToPrint.forEach(code => {
                 const tempSvgContainer = document.createElement('div');
                 // We need react-dom/client to render this temporarily if not already available
                 // For simplicity, we'll just put a placeholder or use the main QR ref technique if safe
                 // This is a limitation if QRCodeStyling doesn't allow direct SVG string generation easily
                 // The safest way without client-side react-dom is to generate QR SVG string on server or use a library that supports it.
                 // For now, using a placeholder for print SVG.
                 const qrCodeInstance = React.createElement(QRCodeStyling, { value: code.encodedValue, size: 100, level: 'H' });
                 
                 // This is a hacky way to get SVG string. Better to use a library that gives SVG string directly or render to hidden canvas.
                 // Since QRCodeStyling renders to a div that contains an SVG, we can try to grab its innerHTML.
                 // This requires QRCodeStyling to be rendered somewhere.
                 // A cleaner solution involves a QR lib that directly outputs SVG string or data URL.
                 // For now, this will likely not render correctly in printWindow without complex setup.
                 // FALLBACK: Show encoded value if SVG cannot be rendered.
                let svgString = `<p style="font-size:8px;word-break:break-all;">${code.encodedValue}</p><p style="color:red;font-size:10px;">(QR render in print preview needs improvement)</p>`;


                printContent += `
                    <div class="qr-container">
                        <div class="qr-code" id="print-qr-${code.id}">${svgString}</div>
                        <div class="qr-name">${code.name}</div>
                    </div>
                `;
            });
            printContent += '</body></html>';
            printWindow.document.write(printContent);
            printWindow.document.close();
            // After writing, try to render QR codes into the new window (complex and might not work due to timing/context)
        } else {
            toast({ variant: "destructive", title: "خطأ", description: "Could not open print window. Please check popup blocker." });
        }
    }
};


  const getCodeTypeFriendlyName = (type: AccessCodeType) => {
    switch (type) {
      case 'subject_specific': return 'مخصص للمادة (تواريخ محددة)';
      case 'subject_monthly': return 'مخصص للمادة (شهري)';
      case 'subject_yearly': return 'مخصص للمادة (سنوي)';
      case 'general_monthly': return 'وصول عام (شهري)';
      case 'general_6_months': return 'وصول عام (6 شهور)';
      case 'general_yearly': return 'وصول عام (سنوي)';
      case 'choose_single_subject_monthly': return 'اختيار مادة واحدة (شهري)';
      case 'choose_single_subject_quarterly': return 'اختيار مادة واحدة (فصلي - 3 أشهر)';
      case 'choose_single_subject_yearly': return 'اختيار مادة واحدة (سنوي)';
      default: return 'نوع غير معروف';
    }
  };

  const getCodeStatusBadge = (code: AccessCode) => {
    if (code.isUsed) {
      return <Badge variant="destructive" className="mt-1 flex items-center"><CircleSlash className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/>مستخدم</Badge>;
    }
    if (code.isActive) {
      return <Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-700 flex items-center"><CheckCircle className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/>فعال</Badge>;
    }
    return <Badge variant="secondary" className="mt-1 flex items-center"><XCircle className="mr-1 h-3 w-3 rtl:ml-1 rtl:mr-0"/>غير فعال</Badge>;
  };


  const HeaderCheckboxIcon = isHeaderChecked === true ? CheckSquare : (isHeaderChecked === "indeterminate" ? MinusSquare : Square);


  return (
    <div className="space-y-6" dir="rtl">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
            <QrCode className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">{editingCode ? 'تعديل رمز الدخول' : 'إدارة رموز QR'}</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            {editingCode ? 'قم بتحديث تفاصيل رمز الدخول هذا.' : 'أنشئ وأدر رموز QR للدخول لأغراض متنوعة.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الرمز / اسم الدفعة</FormLabel>
                      <FormControl><Input placeholder="مثال: دخول امتحان الرياضيات، دفعة يوليو" {...field} /></FormControl>
                      <FormDescription>في حال إنشاء دفعة، سيُستخدم هذا الاسم كقاعدة (مثال: "دفعة يوليو #1"، "دفعة يوليو #2").</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!editingCode && (
                   <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عدد الرموز المراد إنشاؤها</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1"
                              {...field}
                              onChange={event => field.onChange(+event.target.value)}
                              min="1"
                            />
                          </FormControl>
                          <FormDescription>أدخل 1 لرمز واحد، أو أكثر لإنشاء دفعة.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                )}
                <FormField
                  control={form.control}
                  name="codeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع الرمز</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        if (!codeTypeRequiresAdminSelectedSubject(value as AccessCodeType)) {
                            form.setValue('subjectId', null);
                        }
                      }} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر نوع الرمز" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="subject_specific">مخصص للمادة (تواريخ محددة)</SelectItem>
                          <SelectItem value="subject_monthly">مخصص للمادة (شهر واحد)</SelectItem>
                          <SelectItem value="subject_yearly">مخصص للمادة (سنة واحدة)</SelectItem>
                          <SelectItem value="choose_single_subject_monthly">اختيار مادة واحدة (شهري)</SelectItem>
                          <SelectItem value="choose_single_subject_quarterly">اختيار مادة واحدة (فصلي - 3 أشهر)</SelectItem>
                          <SelectItem value="choose_single_subject_yearly">اختيار مادة واحدة (سنوي)</SelectItem>
                          <SelectItem value="general_monthly">وصول عام (شهر واحد)</SelectItem>
                          <SelectItem value="general_6_months">وصول عام (6 شهور)</SelectItem>
                          <SelectItem value="general_yearly">وصول عام (سنة واحدة)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="subjectId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center">
                            المادة
                            {!codeTypeRequiresAdminSelectedSubject(watchedCodeType) && (
                                <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-3.5 w-3.5 ml-1.5 rtl:mr-1.5 rtl:ml-0 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p className="text-xs max-w-xs">
                                        {codeTypeStudentChoosesSubject(watchedCodeType)
                                            ? "سيقوم الطالب باختيار المادة عند تفعيل الرمز."
                                            : "هذا النوع من الرموز لا يتطلب تحديد مادة من قبل المسؤول."}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                                </TooltipProvider>
                            )}
                        </FormLabel>
                        <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={isLoadingSubjects || !codeTypeRequiresAdminSelectedSubject(watchedCodeType)}
                        >
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={
                                codeTypeStudentChoosesSubject(watchedCodeType) ? "يختارها الطالب" :
                                !codeTypeRequiresAdminSelectedSubject(watchedCodeType) ? "لا يتطلب تحديد مادة" :
                                "اختر المادة"
                            } />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {isLoadingSubjects ? (
                            <SelectItem value="loading" disabled>جاري تحميل المواد...</SelectItem>
                            ) : subjects.length === 0 && codeTypeRequiresAdminSelectedSubject(watchedCodeType) ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                لا توجد مواد مضافة. يرجى <Link href="/dashboard/subjects" className="text-primary hover:underline">إضافة مادة</Link> أولاً.
                            </div>
                            ) : (
                            subjects.map(subject => (
                                <SelectItem key={subject.id} value={subject.id!}>{subject.name} ({subject.branch})</SelectItem>
                            ))
                            )}
                        </SelectContent>
                        </Select>
                        <FormDescription>
                        {codeTypeRequiresAdminSelectedSubject(watchedCodeType)
                            ? "اختر المادة التي سيتم ربط الرمز بها."
                            : codeTypeStudentChoosesSubject(watchedCodeType)
                            ? "سيقوم الطالب باختيار المادة عند تفعيل الرمز."
                            : "هذا النوع من الرموز لا يرتبط بمادة محددة من قبل المسؤول."}
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />


                {watchedCodeType === 'subject_specific' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="validFrom"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>صالح من</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                                  {field.value ? format(field.value, "PPP") : <span>اختر تاريخًا</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50 rtl:mr-auto rtl:ml-0" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="validUntil"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>صالح حتى</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                                  {field.value ? format(field.value, "PPP") : <span>اختر تاريخًا</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50 rtl:mr-auto rtl:ml-0" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-1 space-y-4 flex flex-col items-center">
                <Label className="text-lg font-semibold">رمز QR المُنشأ {editingCode ? `لـ "${editingCode.name}"` : (watchedQuantity && watchedQuantity > 1 ? '(عينة للدفعة)' : '')}</Label>
                <div ref={qrCodeRef} className="p-4 bg-white rounded-lg shadow-md inline-block">
                  {generatedQRValue ? (
                    <QRCodeStyling value={generatedQRValue} size={160} level="H" />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-muted-foreground bg-gray-100 rounded">
                      سيظهر QR هنا
                    </div>
                  )}
                </div>
                {generatedQRValue && (
                  <Button type="button" variant="outline" onClick={handleDownloadQR} className="w-full max-w-xs">
                    <Download className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />
                    {editingCode || (watchedQuantity && watchedQuantity === 1) ? 'تحميل QR' : 'تحميل عينة QR'}
                  </Button>
                )}
                <Button type="submit" className="w-full max-w-xs" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin rtl:mr-2 rtl:ml-0" /> : (editingCode ? <Save className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> : <PackagePlus className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />)}
                  {editingCode ? 'تحديث الرمز' : (watchedQuantity && watchedQuantity > 1 ? `إنشاء وحفظ ${watchedQuantity} رموز` : 'إنشاء وحفظ الرمز')}
                </Button>
                {editingCode && (
                   <Button type="button" variant="ghost" onClick={() => { setEditingCode(null); form.reset({ name: '', codeType: undefined, subjectId: null, validFrom: null, validUntil: null, quantity: 1}); setGeneratedQRValue(uuidv4()); setSelectedCodeIds([]); }} className="w-full max-w-xs">
                     إلغاء التعديل
                   </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="mt-8 shadow-lg">
        <CardHeader>
           <div className="flex items-center justify-between space-x-3 rtl:space-x-reverse mb-2">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <ListChecks className="h-7 w-7 text-primary" />
                    <CardTitle className="text-2xl font-bold">رموز الدخول المحفوظة</CardTitle>
                </div>
            </div>
          <CardDescription>أدر رموز الدخول الموجودة لديك. قم بتحميل رموز QR فردية من هذه القائمة.</CardDescription>
          <Tabs value={filterStatus} onValueChange={(value) => {
              setFilterStatus(value as FilterStatus);
              setSelectedCodeIds([]);
            }} className="mt-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="all">الكل ({accessCodes.length})</TabsTrigger>
                <TabsTrigger value="active">
                    فعالة ({accessCodes.filter(c => c.isActive && !c.isUsed).length})
                </TabsTrigger>
                <TabsTrigger value="inactive">
                    غير فعالة ({accessCodes.filter(c => !c.isActive && !c.isUsed).length})
                </TabsTrigger>
                <TabsTrigger value="used">
                    مستخدمة ({accessCodes.filter(c => c.isUsed).length})
                </TabsTrigger>
            </TabsList>
          </Tabs>
          {filteredAccessCodes.length > 0 && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse border-t pt-4 mt-4 flex-wrap gap-2">
                <div className="flex items-center">
                    <Checkbox
                        id="selectAllCodes"
                        checked={isHeaderChecked}
                        onCheckedChange={handleHeaderCheckboxChange}
                        aria-label="Select all codes"
                    />
                    <Label htmlFor="selectAllCodes" className="text-sm font-medium mr-2 rtl:ml-2 rtl:mr-0 cursor-pointer">
                        {isHeaderChecked === "indeterminate" ? "بعضها محدد" : "تحديد الكل"} ({selectedCodeIds.length} / {filteredAccessCodes.length})
                    </Label>
                </div>
                {selectedCodeIds.length > 0 && (
                <div className="flex gap-2 flex-wrap mr-auto rtl:ml-auto rtl:mr-0">
                    <Button variant="outline" size="sm" onClick={() => handleToggleActiveSelected(true)}><CheckCircle className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0"/>تفعيل</Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleActiveSelected(false)}><XCircle className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0"/>إلغاء تفعيل</Button>
                    <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2 className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0"/>حذف المحدد</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                            <AlertDialogHeader className="text-right">
                            <AlertDialogTitle>حذف الرموز المحددة؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                سيتم حذف {selectedCodeIds.length} رمز (رموز) دخول بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleBulkDeleteSelected} className="bg-destructive hover:bg-destructive/90">حذف المحدد</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="secondary" size="sm" onClick={handleDownloadSelected} disabled={selectedCodeIds.length !== 1}><Download className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0"/>تحميل</Button>
                    <Button variant="outline" size="sm" onClick={handlePrintSelected} disabled={selectedCodeIds.length === 0}><Printer className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0"/>طباعة</Button>
                </div>
                )}
            </div>
            )}
        </CardHeader>
        <CardContent>
          {isLoadingCodes ? (
            <div className="flex justify-center items-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="mr-2 rtl:ml-0 rtl:mr-2">جاري تحميل الرموز...</span></div>
          ) : filteredAccessCodes.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
                {filterStatus === 'all' ? 'لم يتم إنشاء رموز دخول بعد.' : `لا توجد رموز دخول ${filterStatus === 'active' ? 'فعالة' : filterStatus === 'inactive' ? 'غير فعالة' : 'مستخدمة'}.`}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredAccessCodes.map(code => (
                <Card key={code.id} className={`flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4 ${selectedCodeIds.includes(code.id!) ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'} transition-shadow`}>
                   <div className="flex items-center flex-shrink-0 self-start sm:self-center">
                        <Checkbox
                            id={`select-code-${code.id}`}
                            checked={selectedCodeIds.includes(code.id!)}
                            onCheckedChange={() => handleRowCheckboxChange(code.id!)}
                            aria-labelledby={`label-code-${code.id}`}
                            className="ml-3 rtl:mr-3 rtl:ml-0"
                        />
                        <div id={`qr-list-item-${code.id}`} className="bg-white p-1 rounded-md shadow-sm">
                            <QRCodeStyling value={code.encodedValue} size={80} level="H" />
                        </div>
                    </div>
                  <div className="flex-grow" id={`label-code-${code.id}`}>
                    <h3 className="font-semibold text-lg">{code.name}</h3>
                    <p className="text-sm text-muted-foreground">النوع: {getCodeTypeFriendlyName(code.type)}</p>
                    <p className="text-sm text-muted-foreground">
                        المادة: {codeTypeStudentChoosesSubject(code.type) ? "يختارها الطالب" : (code.subjectName || "عام / غير محدد")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      الصلاحية: {format(parseISO(code.validFrom as string), "PP")} - {format(parseISO(code.validUntil as string), "PP")}
                    </p>
                    {getCodeStatusBadge(code)}
                    {code.isUsed && code.usedAt && (
                       <p className="text-xs text-muted-foreground mt-1">استخدم في: {format(parseISO(code.usedAt as string), "PPp")} {code.usedByUserId ? `بواسطة ${code.usedByUserId}` : ''}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 mt-2 sm:mt-0 self-start sm:self-center items-stretch w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(code)} disabled={code.isUsed}>
                        {code.isActive ? <><XCircle className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0" /> إلغاء التفعيل</> : <><CheckCircle className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0" /> تفعيل</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditCode(code)}><Edit3 className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0" /> تعديل</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDownloadListedQR(code.encodedValue, code.name)}><Download className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0" /> تحميل QR</Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setDeletingCodeId(code.id!)}><Trash2 className="ml-1 h-4 w-4 rtl:mr-1 rtl:ml-0" /> حذف</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                            <AlertDialogHeader className="text-right">
                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                سيتم حذف رمز الدخول "{code.name}" بشكل دائم. هذا الإجراء لا يمكن التراجع عنه.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse">
                            <AlertDialogCancel onClick={() => setDeletingCodeId(null)}>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteCode} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
