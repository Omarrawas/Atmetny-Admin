'use server';

/**
 * @fileOverview AI-powered tag suggestion for questions.
 *
 * - suggestQuestionTags - A function that suggests tags for a given question.
 * - SuggestQuestionTagsInput - The input type for the suggestQuestionTags function.
 * - SuggestQuestionTagsOutput - The return type for the suggestQuestionTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestQuestionTagsInputSchema = z.object({
  questionText: z
    .string()
    .describe('The text of the question for which tags are to be suggested.'),
});

export type SuggestQuestionTagsInput = z.infer<typeof SuggestQuestionTagsInputSchema>;

const SuggestQuestionTagsOutputSchema = z.object({
  suggestedTags: z
    .array(z.string())
    .describe('An array of suggested tags for the question.'),
});

export type SuggestQuestionTagsOutput = z.infer<typeof SuggestQuestionTagsOutputSchema>;

export async function suggestQuestionTags(input: SuggestQuestionTagsInput): Promise<SuggestQuestionTagsOutput> {
  return suggestQuestionTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestQuestionTagsPrompt',
  input: {schema: SuggestQuestionTagsInputSchema},
  output: {schema: SuggestQuestionTagsOutputSchema},
  prompt: `You are an expert in categorizing educational questions. Based on the
  following question, suggest relevant tags that can be used to categorize it.
  Return a JSON array of strings.

  Question: {{{questionText}}}
  `,
});

const suggestQuestionTagsFlow = ai.defineFlow(
  {
    name: 'suggestQuestionTagsFlow',
    inputSchema: SuggestQuestionTagsInputSchema,
    outputSchema: SuggestQuestionTagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
