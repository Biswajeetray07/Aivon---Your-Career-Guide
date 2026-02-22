import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  
  const prompt = `Problem: median of two sorted arrays (HARD)
Language: python

Student Code:
\`\`\`python
class Solution:
  def findMedianSortedArrays(self, nums1, nums2):
      if len(nums1) > len(nums2):
          nums1, nums2 = nums2, nums1
      m, n = len(nums1), len(nums2)
      left, right = 0, m
      while left <= right:
          cut1 = (left + right) // 2
          cut2 = (m + n + 1) // 2 - cut1
\`\`\`

Error:
  Type: SyntaxError
  Verdict: Compile Error
  Line: 10
  Message: invalid syntax

Analyze this error and help the student fix it.`;

  const systemInstruction = `You are a senior competitive programming mentor.

Your job is to help the student FIX their code, not to give the full solution.

Rules:
- Clearly explain what the error means in plain English.
- Point to the exact line number if available.
- Explain WHY it happened (root cause).
- Give 2-4 step-by-step fix instructions. Each step should be one actionable sentence.
- Do NOT provide full corrected code. Never write more than a single line snippet if needed.
- Suggest what concept the student should review.
- Keep tone supportive, concise, and educational.

Format your response as JSON with keys:
"summary" (one-sentence error explanation),
"rootCause" (why this happened, 1-2 sentences),
"fixSteps" (array of 2-4 short actionable steps),
"conceptToReview" (one concept name),
"likelyIssue" (same as rootCause, for compat),
"whyItHappens" (same as rootCause, for compat),
"debugSteps" (same as fixSteps, for compat),
"edgeCasesToCheck" ([])`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { 
        systemInstruction, 
        responseMimeType: "application/json", 
        temperature: 0.4 
      },
    });
    console.log("SUCCESS:");
    console.log(response.text);
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }
}

test();
