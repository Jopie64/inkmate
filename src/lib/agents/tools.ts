import { tool } from 'ai';
import { z } from 'zod';
import { getChapterContentAction, saveChapterAction } from '@/app/actions/chapters';
import { getOctokit, getFileContent, REPO_NAME } from '@/lib/github';
import { auth } from '@/auth';

export const createProjectTools = (projectId: string) => ({
  // @ts-ignore - 'name' is required for Harmony compatibility despite Vercel AI types
  listChapters: tool({
    name: 'listChapters',
    description: 'List all chapters in the current story project, including their UUID, title, and summaries.',
    parameters: z.object({}),
    execute: async () => {
      const session = await auth();
      if (!session?.user?.name || !session?.accessToken) throw new Error("Unauthorized");
      const octokit = await getOctokit(session.accessToken as string);
      const indexStr = await getFileContent(octokit, session.user.name, `${projectId}/index.json`);
      if (!indexStr) return { chapters: [] };
      const projectIndex = JSON.parse(indexStr);
      return { chapters: projectIndex.chapters || [] };
    },
  }),

  // @ts-ignore
  readChapter: tool({
    name: 'readChapter',
    description: 'Read the full markdown content of a specific chapter.',
    parameters: z.object({
      chapterId: z.string().describe('The UUID of the chapter'),
    }),
    execute: async ({ chapterId }: { chapterId: string }) => {
      const text = await getChapterContentAction(projectId, chapterId);
      return { content: text || "Chapter is empty or not found." };
    },
  }),

  // @ts-ignore
  saveChapter: tool({
    name: 'saveChapter',
    description: 'Create a new chapter or update an existing chapter with markdown content. Always supply the full modified content.',
    parameters: z.object({
      chapterId: z.string().optional().describe('The UUID of the chapter. Omit this if creating a NEW chapter.'),
      title: z.string().describe('The title of the chapter'),
      content: z.string().describe('The full markdown content of the chapter'),
    }),
    execute: async ({ chapterId, title, content }: { chapterId?: string, title: string, content: string }) => {
      const newId = await saveChapterAction(projectId, title, content, chapterId);
      return { success: true, newChapterId: newId, title };
    },
  })
});
