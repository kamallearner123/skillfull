/**
 * SmartGuide API client
 * Talks to the Django backend proxy at /api/smartguide/*
 * The Django proxy enforces JWT auth and forwards to the SmartGuide microservice.
 */

import logger from '../utils/logger';

const API_BASE = "/api/smartguide";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssessmentInput {
  attempt_id: string;
  student_name: string;
  domain: string;
  score: number;
  total: number;
  percentage: number;
  weak_topics?: string[];
  strong_topics?: string[];
}

export interface FeedbackResponse {
  attempt_id: string;
  domain: string;
  overall_summary: string;
  strengths: string[];
  improvement_areas: string[];
  priority_topics: string[];
  suggested_resources: { title: string; url: string; type: string }[];
  motivational_note: string;
}

export interface ScheduleRequest {
  student_name: string;
  domain: string;
  weak_topics?: string[];
  strong_topics?: string[];
  target_date: string;
  available_hours_per_day?: number;
  goal?: string;
}

export interface DayPlan {
  date: string;
  day_label: string;
  topic: string;
  tasks: { title: string; description: string; estimated_minutes: number; resource_url?: string }[];
  total_hours: number;
}

export interface ScheduleResponse {
  student_name: string;
  domain: string;
  goal: string;
  start_date: string;
  target_date: string;
  total_days: number;
  plan: DayPlan[];
  overall_strategy: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Fetch AI-generated feedback for a completed assessment */
export async function getFeedback(data: AssessmentInput): Promise<FeedbackResponse> {
  logger.debug('Fetching feedback for attempt:', data.attempt_id);
  const resp = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    logger.error('Feedback request failed:', resp.statusText);
    throw new Error(`Feedback request failed: ${resp.statusText}`);
  }
  const result = await resp.json();
  logger.info('Feedback received successfully');
  return result;
}

/** Fetch a day-by-day preparation schedule */
export async function getSchedule(data: ScheduleRequest): Promise<ScheduleResponse> {
  const resp = await fetch(`${API_BASE}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`Schedule request failed: ${resp.statusText}`);
  return resp.json();
}

/** Get a new session ID for a mock-interview chat session */
export async function newChatSession(): Promise<string> {
  const resp = await fetch(`${API_BASE}/chat/new-session`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error("Could not create new session");
  const data = await resp.json();
  return data.session_id;
}

/** Clear a chat session's conversation history */
export async function clearChatSession(session_id: string): Promise<void> {
  await fetch(`${API_BASE}/chat/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ session_id }),
  });
}

/**
 * Stream a chat response via SSE.
 * Returns an AbortController so the caller can cancel the stream.
 * @param onToken called for each token received
 * @param onDone  called when the stream finishes
 * @param onError called on any error
 */
export function streamChat(
  session_id: string,
  message: string,
  context: string | undefined,
  onToken: (token: string) => void,
  onDone: (historyLength: number) => void,
  onError: (err: string) => void
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const resp = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id, message, context, stream: true }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        onError(`HTTP ${resp.status}: ${resp.statusText}`);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logger.debug('SSE stream completed');
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const event = JSON.parse(payload);
            if (event.token !== undefined) onToken(event.token);
            if (event.done) {
              logger.info('Chat session finished');
              onDone(event.history_length ?? 0);
            }
            if (event.error) {
              logger.error('SSE Error:', event.error);
              onError(event.error);
            }
          } catch (e) {
            logger.debug('Malformed SSE line:', line);
            // Malformed SSE line — skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        onError(err.message);
      }
    }
  })();

  return controller;
}
