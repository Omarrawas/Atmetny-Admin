// src/app/login/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, Loader2, School } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني الذي أدخلته غير صالح." }),
  password: z.string().min(6, { message: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const authError = searchParams.get('error');
    if (authError === 'unauthorized') {
      setError("أنت لست أدمن أو ليس لديك صلاحية الوصول.");
    }
  }, [searchParams]);
  
  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsLoading(true);
    console.log("[Login Page] Submitting form with email:", data.email);
    try {
      console.log("[Login Page] Attempting Supabase sign-in...");
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        console.error("[Login Page] Supabase sign-in error:", signInError);
        // Map Supabase error messages if needed, or use a generic one
        if (signInError.message.includes("Invalid login credentials")) {
            setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        } else if (signInError.message.includes("Email not confirmed")) {
            setError("الرجاء تأكيد بريدك الإلكتروني قبل تسجيل الدخول.");
        } else {
            setError(signInError.message || "فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
        }
      } else {
        console.log("[Login Page] Supabase sign-in successful. AuthProvider will handle next steps.");
        // AuthProvider will handle role check and redirect if successful.
        // If login is successful but user is not admin, AuthProvider/ProtectedPage will redirect to /login?error=unauthorized
      }
    } catch (err: any) {
      console.error("[Login Page] Unexpected login error:", err);
      setError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
      console.log("[Login Page] isLoading set to false in finally block.");
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  
  if (user && isAdmin) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg text-foreground">جار التحويل إلى لوحة التحكم...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <School className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Atmetny Admin Lite</CardTitle>
          <CardDescription className="text-muted-foreground">
            سجل الدخول لإدارة المحتوى التعليمي الخاص بك (Supabase Auth).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input dir="ltr" type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input dir="ltr" type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>خطأ في تسجيل الدخول</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                تسجيل الدخول
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Atmetny. جميع الحقوق محفوظة.
      </p>
    </div>
  );
}
