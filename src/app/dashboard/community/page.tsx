// src/app/dashboard/community/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, Construction } from 'lucide-react';

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <MessageSquare className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">إدارة المجتمع</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            أدوات ومؤشرات لإدارة وتتبع نشاط المجتمع داخل تطبيق الطالب.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 min-h-[300px]">
            <Construction className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">قيد الإنشاء</h2>
            <p className="text-muted-foreground max-w-md">
              هذه الصفحة مخصصة لإدارة المجتمع (مثل مراجعة المنشورات، إدارة المستخدمين، عرض الإحصائيات، إلخ).
              الميزات المحددة سيتم تطويرها لاحقًا.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
