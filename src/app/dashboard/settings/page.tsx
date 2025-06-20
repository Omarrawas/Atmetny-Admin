// src/app/dashboard/settings/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; 
import { useToast } from '@/hooks/use-toast';
import { getAppSettings, updateAppSettings } from '@/lib/firestore';
import type { AppSettings, SocialMediaLink, SocialPlatform } from '@/types';
import { Loader2, Save, Settings, PlusCircle, Trash2 } from 'lucide-react';
import UserTable from '@/components/UserTable'; // Import UserTable
import { Separator } from '@/components/ui/separator'; // Import Separator

const platformValues = [
  "Facebook", "whatsapp", "Instagram", "Telegram", "Twitter", 
  "LinkedIn", "YouTube", "TikTok", "Discord", "" 
] as const; 

const socialMediaLinkSchema = z.object({
  platform: z.enum(platformValues, { required_error: "اختيار المنصة مطلوب." }),
  url: z.string().url({ message: "الرجاء إدخال رابط URL صحيح." }),
});

const appSettingsSchema = z.object({
  appName: z.string().optional().nullable(),
  appLogoUrl: z.string().url({ message: "الرجاء إدخال رابط URL صالح للشعار." }).optional().or(z.literal('')).nullable(),
  supportPhoneNumber: z.string().optional().nullable(),
  supportEmail: z.string().email({ message: "الرجاء إدخال عنوان بريد إلكتروني صالح." }).optional().or(z.literal('')).nullable(),
  socialMediaLinks: z.array(socialMediaLinkSchema).optional(),
  termsOfServiceUrl: z.string().url({ message: "الرجاء إدخال رابط URL صالح." }).optional().or(z.literal('')).nullable(),
  privacyPolicyUrl: z.string().url({ message: "الرجاء إدخال رابط URL صالح." }).optional().or(z.literal('')).nullable(),
});

type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

const socialPlatformOptions: { label: string; value: SocialPlatform }[] = [
  { label: "Facebook", value: "Facebook" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Instagram", value: "Instagram" },
  { label: "Telegram", value: "Telegram" },
  { label: "Twitter / X", value: "Twitter" },
  { label: "LinkedIn", value: "LinkedIn" },
  { label: "YouTube", value: "YouTube" },
  { label: "TikTok", value: "TikTok" },
  { label: "Discord", value: "Discord" },
];


export default function ApplicationSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      appName: '',
      appLogoUrl: '',
      supportPhoneNumber: '',
      supportEmail: '',
      socialMediaLinks: [{ platform: '', url: '' }],
      termsOfServiceUrl: '',
      privacyPolicyUrl: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socialMediaLinks",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const settings = await getAppSettings();
        if (settings) {
          form.reset({
            appName: settings.appName || '',
            appLogoUrl: settings.appLogoUrl || '',
            supportPhoneNumber: settings.supportPhoneNumber || '',
            supportEmail: settings.supportEmail || '',
            socialMediaLinks: settings.socialMediaLinks && settings.socialMediaLinks.length > 0 ? settings.socialMediaLinks : [{ platform: '', url: '' }],
            termsOfServiceUrl: settings.termsOfServiceUrl || '',
            privacyPolicyUrl: settings.privacyPolicyUrl || '',
          });
        }
      } catch (error) {
        console.error("Error fetching app settings:", error);
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "تعذر تحميل إعدادات التطبيق.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (data: AppSettingsFormValues) => {
    setIsSaving(true);
    try {
      const settingsToSave: Partial<AppSettings> = {
        appName: data.appName || null,
        appLogoUrl: data.appLogoUrl || null,
        supportPhoneNumber: data.supportPhoneNumber || null,
        supportEmail: data.supportEmail || null,
        socialMediaLinks: data.socialMediaLinks?.filter(link => link.platform && link.url),
        termsOfServiceUrl: data.termsOfServiceUrl || null,
        privacyPolicyUrl: data.privacyPolicyUrl || null,
      };
      await updateAppSettings(settingsToSave);
      toast({
        title: "نجاح!",
        description: "تم حفظ إعدادات التطبيق بنجاح.",
      });
    } catch (error) {
      console.error("Error saving app settings:", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "فشل حفظ إعدادات التطبيق.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground rtl:mr-3">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold tracking-tight">إعدادات التطبيق</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            إدارة الإعدادات العامة للتطبيق التي قد تظهر للطلاب.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="appName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم التطبيق</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: اتمتني - منصتك التعليمية" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>الاسم الذي يظهر للطلاب.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appLogoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط شعار التطبيق</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com/logo.png" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>أدخل رابط URL مباشر لصورة الشعار.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supportPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم هاتف الدعم الفني</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1234567890" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supportEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني للدعم الفني</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="support@example.com" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label className="text-base mb-2 block">روابط وسائل التواصل الاجتماعي</Label>
                {fields.map((item, index) => (
                  <Card key={item.id} className="p-4 mb-3 border bg-muted/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <FormField
                        control={form.control}
                        name={`socialMediaLinks.${index}.platform`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor={`socialMediaLinks.${index}.platform`} className="text-sm">المنصة</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر منصة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {socialPlatformOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`socialMediaLinks.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel htmlFor={`socialMediaLinks.${index}.url`} className="text-sm">رابط URL</FormLabel>
                            <Input type="url" placeholder="https://facebook.com/yourpage" {...field} />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <div className="flex justify-end mt-3">
                        <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1 && (!form.getValues(`socialMediaLinks.${index}.platform`) && !form.getValues(`socialMediaLinks.${index}.url`))}
                        >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </Card>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ platform: '', url: '' })}
                  className="mt-2"
                >
                  <PlusCircle className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" /> إضافة رابط تواصل اجتماعي
                </Button>
              </div>

              <FormField
                control={form.control}
                name="termsOfServiceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط شروط الخدمة</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com/terms" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="privacyPolicyUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط سياسة الخصوصية</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com/privacy" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" /> : <Save className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />}
                  حفظ الإعدادات
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Separator className="my-8" />

      <UserTable />
    </div>
  );
}
