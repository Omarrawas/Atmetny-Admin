// src/app/dashboard/sections/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LayoutList, Info } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button'; // Added this import

export default function SectionsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
            <LayoutList className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">إدارة الأقسام</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            عرض وإدارة الأقسام الأكاديمية للمواد الدراسية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4 !text-foreground" /> {/* Ensure icon color contrasts */}
            <AlertTitle className="font-semibold">ملاحظة هامة</AlertTitle>
            <AlertDescription>
              تتم إدارة الأقسام (مثل الفصول أو الوحدات الدراسية) ضمن تفاصيل كل مادة دراسية على حدة. 
              لإضافة، تعديل، أو حذف الأقسام، يرجى الانتقال إلى صفحة 
              <Link href="/dashboard/subjects" className="font-medium text-primary hover:underline mx-1">
                المواد الدراسية
              </Link>
              ، ثم اختيار المادة المطلوبة والنقر على زر "عرض التفاصيل" أو "إدارة الدروس" للوصول إلى إدارة أقسامها.
            </AlertDescription>
          </Alert>
          <div className="border-2 border-dashed border-border rounded-lg p-8 bg-muted/30 min-h-[200px] flex flex-col items-center justify-center text-center">
            <LayoutList className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-xl text-muted-foreground">
              لإدارة الأقسام، يرجى الرجوع إلى صفحة تفاصيل المادة الدراسية.
            </p>
            <Link href="/dashboard/subjects">
              <Button variant="outline" className="mt-4">
                الذهاب إلى صفحة المواد
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
