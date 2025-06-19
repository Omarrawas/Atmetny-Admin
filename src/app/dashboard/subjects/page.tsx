
// src/app/dashboard/subjects/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import SubjectDetails from '@/components/subjects/SubjectDetails';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, Loader2, BookOpenCheck, Edit3, Trash2, PlusCircle, Image as ImageIcon, HelpCircle, AlertTriangle } from 'lucide-react';
import * =>