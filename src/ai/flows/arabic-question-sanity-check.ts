'use server';
/**
 * @fileOverview AI flow for checking the grammatical correctness of Arabic questions.
 *
 * - arabicQuestionSanityCheck - A function that checks the sanity of an Arabic question using AI.
 * - ArabicQuestionSanityCheckInput - The input type for the arabicQuestionSanityCheck function.
 * - ArabicQuestionSanityCheckOutput - The return type for the arabicQuestionSanityCheck function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ArabicQuestionSanityCheckInputSchema = z.object({
  question: z.string().describe('The Arabic question to check for grammatical correctness.'),
});
export type ArabicQuestionSanityCheckInput = z.infer<
  typeof ArabicQuestionSanityCheckInputSchema
>;

const ArabicQuestionSanityCheckOutputSchema = z.object({
  isGrammaticallyCorrect: z
    .boolean()
    .describe('Whether the question is grammatically correct.'),
  suggestedCorrections: z
    .string()
    .describe('Suggested corrections for the question, if any.'),
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
  prompt: `You are an expert in Arabic grammar and syntax. Your task is to check the grammatical correctness of Arabic questions and suggest corrections if needed.

Question: {{{question}}}

Respond in JSON format, indicating whether the question is grammatically correct (isGrammaticallyCorrect: true/false) and providing suggested corrections (suggestedCorrections: "...") if it is not.
`,}
);

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
