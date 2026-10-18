import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getServerInfo = createServerFn({ method: "GET" }).handler(async () => ({
  renderedAt: new Date().toISOString(),
}));

const ScanInput = z.object({
  file_uri: z.string().min(1),
  question_count: z.number().int().min(1).max(200),
  options_count: z.number().int().min(2).max(6),
});

const AnswersSchema = {
  type: "object",
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "number" },
          option: { type: "string" },
        },
        required: ["question", "option"],
      },
    },
  },
  required: ["answers"],
};

export const processOMRScan = createServerFn({ method: "POST" })
  .validator(ScanInput)
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const admin = b44.asServiceRole;

    const { signed_url } = await admin.integrations.Core.CreateFileSignedUrl({
      file_uri: data.file_uri,
      expires_in: 600,
    });

    const optionLetters = Array.from({ length: data.options_count }, (_, i) =>
      String.fromCharCode(65 + i)
    );
    const lastOption = optionLetters[optionLetters.length - 1];

    const prompt = `You are a precise OMR (Optical Mark Recognition) system. Analyze the attached image of a filled multiple-choice OMR answer sheet.

The sheet contains exactly ${data.question_count} questions, numbered 1 to ${data.question_count}. Each question has ${data.options_count} options labeled ${optionLetters.join(", ")} (A through ${lastOption}).

For EACH question, identify which single option bubble the respondent has clearly filled in or darkened. A marked bubble is noticeably darker and filled compared to unmarked (empty) bubbles, which appear as light outlines.

Rules:
- Return exactly one entry per question, for every question from 1 to ${data.question_count}.
- "option" must be the letter of the marked bubble (e.g. "A", "B", "C").
- If no bubble is marked for a question, use "BLANK".
- If multiple bubbles appear marked for a question, use "MULTIPLE".
- If it is genuinely ambiguous which bubble is marked, use "UNCLEAR".
- Account for lighting, slight scan rotation, and pencil or pen marks.

Return JSON matching the schema: an object with an "answers" array where each item has "question" (number) and "option" (string).`;

    const result = await admin.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [signed_url],
      response_json_schema: AnswersSchema,
    });

    const answers = Array.isArray(result?.answers) ? result.answers : [];

    const scan = await b44.entities.Scan.create({
      file_uri: data.file_uri,
      question_count: data.question_count,
      options_count: data.options_count,
      answers,
    });

    return { scan_id: scan.id, answers };
  });

export const listScans = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  const b44 = context.getBase44();
  const page = await b44.entities.Scan.filter({}, { sort: "-created_date", limit: 50 });
  return { items: page.items || [], has_more: page.has_more };
});

export const getScan = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const b44 = context.getBase44();
    const scan = await b44.entities.Scan.get(data.id).catch((e) => {
      if (e?.status === 404) return null;
      throw e;
    });
    if (!scan) return null;
    let image_url = null;
    try {
      const r = await b44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: scan.file_uri,
        expires_in: 600,
      });
      image_url = r.signed_url;
    } catch {
      /* image may be unavailable */
    }
    return { ...scan, image_url };
  });

export const deleteScan = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    await context.getBase44().entities.Scan.delete(data.id);
    return { ok: true };
  });