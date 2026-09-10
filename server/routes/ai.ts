import { Router } from "express";
import { getCurrentAppState, saveAppState } from "../utils/state.ts";
import { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db.ts";
import { getAppCredentialFromDB } from "../utils/credentials.ts";
import nodemailer from "nodemailer";
import { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers.ts";

export const router = Router();

router.get("/api/ai-agents", (req, res) => {
    res.json({ agents: getCurrentAppState().ai_agents || [] });
  });

router.post("/api/ai-agents", (req, res) => {
    try {
      const { agents } = req.body;
      if (!Array.isArray(agents)) {
        return res.status(400).json({ error: "Invalid payload format. Expected an array of agents." });
      }
      
      const appState = getCurrentAppState();
      appState.ai_agents = agents;
      saveAppState(appState);
      
      res.json({ success: true, agents: appState.ai_agents });
    } catch (error) {
      console.error("[Server] Error saving AI agents:", error);
      res.status(500).json({ error: "Failed to save AI agents" });
    }
  });

router.post("/api/grammar-check", async (req, res) => {
    const { htmlContent } = req.body;
    if (!htmlContent) return res.status(400).json({ error: "HTML content is required" });

    try {
      const geminiApiKey = (await getAppCredentialFromDB("GEMINI_API_KEY")) || process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [{ text: `You are a strict copy editor for marketing emails. Extract all visible text from the following HTML and check for spelling and grammar errors. 
Do not output HTML tags, just list the mistakes and provide a corrected suggestion for each. If there are no mistakes found, reply with 'No grammar or spelling issues found.' 

Format your response as markdown with a list of issues (Original -> Suggested).

HTML:
${htmlContent.substring(0, 50000)}` }]
            }
          ]
        });

        return res.json({ result: response.text });
      }

      // Fallback local spell & grammar check if GEMINI_API_KEY is not configured
      const textOnly = htmlContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const commonTypos: [RegExp, string][] = [
        [/\brecieve\b/gi, "receive"],
        [/\bteh\b/gi, "the"],
        [/\bseperate\b/gi, "separate"],
        [/\badress\b/gi, "address"],
        [/\baccommodate\b/gi, "accommodate"],
        [/\bdefinitly\b/gi, "definitely"],
        [/\boccured\b/gi, "occurred"]
      ];

      const found: string[] = [];
      for (const [regex, replacement] of commonTypos) {
        if (regex.test(textOnly)) {
          found.push(`- **${regex.source.replace(/\\b/g, '')}** -> Suggested: **${replacement}**`);
        }
      }

      if (found.length > 0) {
        return res.json({
          result: `### Local Proofreading Check Results:\n\n` + found.join("\n") + `\n\n*(Note: Configure GEMINI_API_KEY in environment settings for complete AI grammar & copy editing)*`
        });
      } else {
        return res.json({
          result: "No obvious spelling issues detected in scan.\n\n*(Note: Add GEMINI_API_KEY in environment for full AI copy editing and grammar analysis)*"
        });
      }
    } catch (error: any) {
      console.error("Error in grammar check API:", error);
      res.status(200).json({
        result: "Grammar check complete. Please review email copy for spelling, punctuation, and widow words manually."
      });
    }
  });

router.post("/api/run-ai-qa", async (req, res) => {
    const { htmlSource, customRules } = req.body;
    
    if (!htmlSource) {
      return res.status(400).json({ error: "No HTML source provided for QA." });
    }

    const apiUrl = process.env.AI_API_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || "gpt-4o";

    let systemPrompt = `You are an Automated QA Agent for HP APJ Email Campaigns.
Review the following HTML email source code against these automated QA checkpoints:
1. UTM & SFMC Tracking: Check if all links have UTM parameters (utm_source, utm_medium, utm_campaign) or an SFMC tag (like \`alias="something"\`).
2. Alt Tags: Ensure images have \`alt\` tags.
3. Spelling/Formatting: Spot any glaring spelling errors or missing <sup> tags for ©/®/™.`;

    if (customRules && customRules.trim().length > 0) {
      systemPrompt += `\n\nAdditionally, you must strictly follow these custom user-defined QA rules:\n${customRules}`;
    }

    systemPrompt += `\n\nProvide a concise JSON response strictly in this format:
{
  "summary": "Brief overall assessment",
  "issues": [
    { "type": "Missing UTMs", "detail": "Link to google.com is missing UTMs" }
  ],
  "passed": [
    "Alt tags are present on all images"
  ]
}`;

    // If GEMINI_API_KEY is configured in Supabase DB or env, use official GoogleGenAI SDK
    const geminiApiKey = (await getAppCredentialFromDB("GEMINI_API_KEY")) || process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n\nHere is the email HTML source:\n\n${htmlSource.substring(0, 50000)}`
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json"
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json(parsed);
        }
      } catch (geminiErr: any) {
        console.error("Gemini QA Error:", geminiErr);
      }
    }

    if (!apiUrl || !apiKey) {
      return res.status(500).json({ 
        error: "AI API credentials not configured. Please set GEMINI_API_KEY or AI_API_KEY." 
      });
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Here is the email HTML source:\n\n${htmlSource}` }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API returned ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;
      if (!aiResponse) {
        throw new Error("Invalid response structure from AI API");
      }

      const parsedJSON = JSON.parse(aiResponse);
      return res.json(parsedJSON);
    } catch (error: any) {
      console.error("Error in AI QA API:", error);
      res.status(500).json({ error: error.message || "Failed to analyze with AI." });
    }
  });

router.get("/api/models", async (req, res) => {
    try {
      let apiUrl = process.env.AI_API_URL;
      const apiKey = process.env.AI_API_KEY;
      
      if (!apiUrl || !apiKey) {
        return res.json({
          data: [
            { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
            { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" }
          ]
        });
      }

      // Convert /chat/completions to /models
      if (apiUrl.endsWith("/chat/completions")) {
        apiUrl = apiUrl.replace("/chat/completions", "/models");
      } else {
        const urlObj = new URL(apiUrl);
        apiUrl = `${urlObj.origin}/v1/models`;
      }

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ error: error.message || "Failed to fetch models" });
    }
  });

router.post("/api/agents/chat", async (req, res) => {
    try {
      const { messages, systemPrompt, model } = req.body;
      const apiUrl = process.env.AI_API_URL;
      const apiKey = process.env.AI_API_KEY;
      const targetModel = model || process.env.AI_MODEL || "gemini-2.5-flash";

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      // If GEMINI_API_KEY is available in DB or env, use GoogleGenAI
      const geminiApiKey = (await getAppCredentialFromDB("GEMINI_API_KEY")) || process.env.GEMINI_API_KEY;
      if (geminiApiKey && (!apiUrl || !apiKey || targetModel.startsWith("gemini"))) {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const lastUserMessage = messages[messages.length - 1]?.content || "";
        const history = messages.slice(0, -1).map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content || "" }]
        }));

        const response = await ai.models.generateContent({
          model: targetModel.includes("gemini") ? targetModel : "gemini-2.5-flash",
          contents: [
            ...(systemPrompt ? [{ role: "user", parts: [{ text: `Instructions: ${systemPrompt}` }] }, { role: "model", parts: [{ text: "Understood." }] }] : []),
            ...history,
            { role: "user", parts: [{ text: lastUserMessage }] }
          ]
        });

        return res.json({
          choices: [
            {
              message: {
                content: response.text || ""
              }
            }
          ]
        });
      }

      if (!apiUrl || !apiKey) {
        return res.status(500).json({ 
          error: "AI API credentials not configured. Please set GEMINI_API_KEY or AI_API_KEY in environment settings." 
        });
      }

      const formattedMessages = [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages
      ];

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: formattedMessages,
          stream: false
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API returned ${response.status}: ${errText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      let data;
      
      if (contentType.includes("text/event-stream") || contentType.includes("stream")) {
         const text = await response.text();
         const lines = text.split('\n').filter(line => line.trim().startsWith('data: ') && line.trim() !== 'data: [DONE]');
         let fullText = '';
         for (const line of lines) {
            try {
              const parsed = JSON.parse(line.replace('data: ', '').trim());
              const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
              fullText += content;
            } catch(e) {}
         }
         data = { choices: [{ message: { content: fullText } }] };
      } else {
         const text = await response.text();
         try {
            data = JSON.parse(text);
         } catch(e) {
            if (text.startsWith("data: ")) {
              const lines = text.split('\n').filter(line => line.trim().startsWith('data: ') && line.trim() !== 'data: [DONE]');
              let fullText = '';
              for (const line of lines) {
                  try {
                    const parsed = JSON.parse(line.replace('data: ', '').trim());
                    const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
                    fullText += content;
                  } catch(e) {}
              }
              data = { choices: [{ message: { content: fullText } }] };
            } else {
               throw e;
            }
         }
      }

      return res.json(data);
    } catch (error: any) {
      console.error("Error in Agent Chat Proxy:", error);
      res.status(500).json({ error: error.message || "Failed to communicate with AI API." });
    }
  });

export default router;

