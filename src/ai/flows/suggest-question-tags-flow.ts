
'use server';
/**
 * @fileOverview A Genkit flow to suggest relevant tags for an educational question.
 *
 * - suggestQuestionTags - A function that takes question text and returns suggested tags.
 * - SuggestQuestionTagsInput - The input type for the suggestQuestionTags function.
 * - SuggestQuestionTagsOutput - The return type for the suggestQuestionTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestQuestionTagsInputSchema = z.object({
  questionText: z.string().describe('The text of the educational question for which to suggest tags.'),
});
export type SuggestQuestionTagsInput = z.infer<typeof SuggestQuestionTagsInputSchema>;

const SuggestQuestionTagsOutputSchema = z.object({
  suggestedTags: z.array(z.string()).describe('An array of 2-4 suggested, concise tags (single or two-word phrases). Tags should be in Arabic if the question is in Arabic.'),
});
export type SuggestQuestionTagsOutput = z.infer<typeof SuggestQuestionTagsOutputSchema>;

export async function suggestQuestionTags(input: SuggestQuestionTagsInput): Promise<SuggestQuestionTagsOutput> {
  return suggestQuestionTagsFlow(input);
}

const suggestTagsPrompt = ai.definePrompt({
  name: 'suggestQuestionTagsPrompt',
  input: {schema: SuggestQuestionTagsInputSchema},
  output: {schema: SuggestQuestionTagsOutputSchema},
  prompt: `You are an expert in educational content categorization.
Given the following educational question, please suggest 2 to 4 relevant, concise tags.
Tags should ideally be single words or short two-word phrases.
If the question is in Arabic, the suggested tags should also be in Arabic.

Question:
{{{questionText}}}

Return your suggestions as an array of strings in the 'suggestedTags' field.
Example for an Arabic question: ["كيمياء", "تفاعلات", "أكسدة واختزال"]
Example for an English question: ["Physics", "Newtonian Mechanics", "Force"]
`,
});

const suggestQuestionTagsFlow = ai.defineFlow(
  {
    name: 'suggestQuestionTagsFlow',
    inputSchema: SuggestQuestionTagsInputSchema,
    outputSchema: SuggestQuestionTagsOutputSchema,
  },
  async (input) => {
    const {output} = await suggestTagsPrompt(input);
    // Ensure output and suggestedTags are not null/undefined
    if (output && output.suggestedTags) {
      return { suggestedTags: output.suggestedTags.map(tag => tag.trim()).filter(tag => tag.length > 0) };
    }
    return { suggestedTags: [] }; // Return empty array if no suggestions
  }
);
