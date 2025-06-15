// src/ai/flows/arabic-question-sanity-check.ts
'use server';

/**
 * @fileOverview Flow to check the sanity of Arabic questions using GenAI.
 *
 * - arabicQuestionSanityCheck - A function that checks the sanity of an Arabic question.
 * - ArabicQuestionSanityCheckInput - The input type for the arabicQuestionSanityCheck function.
 * - ArabicQuestionSanityCheckOutput - The return type for the arabicQuestionSanityCheck function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ArabicQuestionSanityCheckInputSchema = z.object({
  question: z.string().describe('The Arabic question to check.'),
});

export type ArabicQuestionSanityCheckInput = z.infer<
  typeof ArabicQuestionSanityCheckInputSchema
>;

const ArabicQuestionSanityCheckOutputSchema = z.object({
  isSane: z.boolean().describe('Whether the question is grammatically correct and uses appropriate vocabulary.'),
  explanation: z.string().describe('Explanation of why the question is sane or insane.'),
});

export type ArabicQuestionSanityCheckOutput = z.infer<
  typeof ArabicQuestionSanityCheckOutputSchema
>;

export async function arabicQuestionSanityCheck(
  input: ArabicQuestionSanityCheckInput
): Promise<ArabicQuestionSanityCheckOutput> {
  return arabicQuestionSanityCheckFlow(input);
}

const arabicQuestionSanityCheckPrompt = ai.definePrompt({
  name: 'arabicQuestionSanityCheckPrompt',
  input: {schema: ArabicQuestionSanityCheckInputSchema},
  output: {schema: ArabicQuestionSanityCheckOutputSchema},
  prompt: `You are an expert Arabic language teacher. Your task is to check if a given Arabic question is grammatically correct and uses appropriate vocabulary for educational purposes.

  Question: {{{question}}}
  
  Determine if the question is sane (grammatically correct and uses appropriate vocabulary). Return a boolean value for isSane and provide a brief explanation.
  `,
});

const arabicQuestionSanityCheckFlow = ai.defineFlow(
  {
    name: 'arabicQuestionSanityCheckFlow',
    inputSchema: ArabicQuestionSanityCheckInputSchema,
    outputSchema: ArabicQuestionSanityCheckOutputSchema,
  },
  async input => {
    const {output} = await arabicQuestionSanityCheckPrompt(input);
    return output!;
  }
);
