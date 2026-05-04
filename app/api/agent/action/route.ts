import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getDefaultModel } from '@/lib/ai/provider';
import { performCheckIn, updateBudgetLimit, createFlashOffer, shareReferralCode } from '@/lib/ai/agent-actions';
import { TEEN_AGENT_PROMPT, PARENT_AGENT_PROMPT, PARTNER_AGENT_PROMPT, AMBASSADOR_AGENT_PROMPT, ADMIN_AGENT_PROMPT } from '@/lib/ai/prompts/roles';
import { ContextEngine } from '@/lib/ai/context-engine';
import { createClient } from '@/lib/supabase/server';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20; // Max requests per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute window

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count };
}

// Define schemas for tools
const checkInSchema = z.object({
  venueName: z.string().describe('The name of the venue'),
  xpReward: z.number().optional().describe('XP reward amount'),
});

const questSuggestionsSchema = z.object({
  count: z.number().optional().describe('Number of suggestions'),
});

const budgetLimitSchema = z.object({
  category: z.string().describe('Budget category (restauration, transport, shopping, etc.)'),
  amount: z.number().describe('New limit in MAD'),
});

const flashOfferSchema = z.object({
  title: z.string().describe('Offer title'),
  discount: z.number().describe('Discount percentage (e.g. 20 for 20%)'),
});

const emptySchema = z.object({});

// Helper to create tools with proper types - using any to avoid SDK type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTool(config: { description: string; parameters: any; execute: any }): any {
  return tool(config as unknown as Parameters<typeof tool>[0]);
}

export async function POST(req: Request) {
  // Check for API Key
  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ 
      error: "AI service unavailable. Please try again later.",
      code: "NO_API_KEY"
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: "Authentication required",
        code: "UNAUTHORIZED"
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Rate limit check
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: "Too many requests. Please wait a moment.",
        code: "RATE_LIMITED",
        retryAfter: 60
      }), { 
        status: 429, 
        headers: { 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60'
        } 
      });
    }

    const body = await req.json();
    const { messages, role, context: clientContext, currentPage } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ 
        error: "Messages array is required",
        code: "INVALID_REQUEST"
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Build context: prefer server-side context, merge with client context
    let context: Record<string, unknown>;
    try {
      const serverContext = await ContextEngine.gatherContext(
        role || 'teen',
        user.id,
        currentPage || '/'
      );
      
      // Merge server context with any client-provided context
      context = {
        ...serverContext.data,
        ...(clientContext || {}),
        _meta: {
          gatheredAt: serverContext.timestamp,
          role: serverContext.role,
          page: serverContext.currentPage,
        }
      };
    } catch (contextError) {
      console.error('[Agent] Context gathering failed:', contextError);
      // Use client context as fallback
      context = clientContext || { fallback: true };
    }

    // Select the specialized system prompt
    let baseSystemPrompt = "";
    switch (role) {
      case 'teen': baseSystemPrompt = TEEN_AGENT_PROMPT; break;
      case 'parent': baseSystemPrompt = PARENT_AGENT_PROMPT; break;
      case 'partner': baseSystemPrompt = PARTNER_AGENT_PROMPT; break;
      case 'ambassador': baseSystemPrompt = AMBASSADOR_AGENT_PROMPT; break;
      case 'admin': baseSystemPrompt = ADMIN_AGENT_PROMPT; break;
      default: baseSystemPrompt = "You are a helpful assistant for the Teens Party Morocco app."; break;
    }

    // Build enhanced system prompt with context
    const systemPrompt = `
${baseSystemPrompt}

[CONTEXT DATA - Use this to personalize responses]:
${JSON.stringify(context, null, 2)}

[INSTRUCTIONS]:
- Personalize your responses based on the user's context data above.
- Reference specific data points (XP, streak, quests, events) when relevant.
- If the user asks for an action that matches a tool, USE THE TOOL.
- Always respond in the user's language (default: French).
- Be concise but helpful. Gen-Z friendly tone.
- If you don't have enough context, ask clarifying questions.
    `.trim();

    // Build tools based on role using helper function
    const teenTools = {
      performCheckIn: createTool({
        description: 'Check-in at a venue to earn XP. Use when user says "I am at...", "Check-in", or mentions arriving somewhere.',
        parameters: checkInSchema,
        execute: async (params: z.infer<typeof checkInSchema>) => {
          return await performCheckIn(params.venueName, params.xpReward ?? 50);
        },
      }),
      getQuestSuggestions: createTool({
        description: 'Get personalized quest/mission suggestions. Use when user asks "what should I do", "quests", or "missions".',
        parameters: questSuggestionsSchema,
        execute: async (params: z.infer<typeof questSuggestionsSchema>) => {
          const quests = (context?.questDetails as unknown[]) || [];
          const limit = params.count ?? 3;
          return {
            success: true,
            suggestions: quests.slice(0, limit),
            message: quests.length > 0 
              ? `Voici ${Math.min(limit, quests.length)} quêtes pour toi!`
              : "Pas de quêtes actives pour le moment. Explore la map pour en découvrir!"
          };
        },
      }),
      getNearbyEvents: createTool({
        description: 'Get nearby events. Use when user asks about "events", "what\'s happening", or "activities nearby".',
        parameters: emptySchema,
        execute: async () => {
          const events = (context?.nearbyEvents as unknown[]) || [];
          return {
            success: true,
            events,
            count: events.length,
            message: events.length > 0 
              ? `Il y a ${events.length} événements à venir près de toi!`
              : "Aucun événement programmé pour le moment."
          };
        },
      }),
    };

    const parentTools = {
      updateBudgetLimit: createTool({
        description: 'Update spending limit for a category. Use when parent says "limit", "reduce spending", or "set budget".',
        parameters: budgetLimitSchema,
        execute: async (params: z.infer<typeof budgetLimitSchema>) => {
          return await updateBudgetLimit(params.category, params.amount);
        },
      }),
      getChildrenStatus: createTool({
        description: 'Get status of children. Use when parent asks about kids, their activity, or safety.',
        parameters: emptySchema,
        execute: async () => {
          const children = (context?.children as unknown[]) || [];
          return {
            success: true,
            children,
            pendingApprovals: (context?.pendingApprovals as number) || 0,
            message: children.length > 0 
              ? `Vous avez ${children.length} enfant(s) enregistré(s).`
              : "Aucun enfant enregistré."
          };
        },
      }),
    };

    const partnerTools = {
      createFlashOffer: createTool({
        description: 'Create a flash discount offer. Use when partner wants to boost traffic or create a promotion.',
        parameters: flashOfferSchema,
        execute: async (params: z.infer<typeof flashOfferSchema>) => {
          return await createFlashOffer(params.title, params.discount);
        },
      }),
      getVenueStats: createTool({
        description: 'Get venue statistics. Use when partner asks about check-ins, traffic, or performance.',
        parameters: emptySchema,
        execute: async () => {
          return {
            success: true,
            stats: {
              todayCheckins: (context?.todayCheckins as number) || 0,
              activeOffers: (context?.activeOffers as number) || 0,
              upcomingReservations: (context?.upcomingReservations as number) || 0,
            },
            venue: context?.venue || {},
          };
        },
      }),
    };

    const ambassadorTools = {
      shareReferralCode: createTool({
        description: 'Share referral code. Use when ambassador wants to invite friends or earn commissions.',
        parameters: emptySchema,
        execute: async () => {
          return await shareReferralCode();
        },
      }),
      getCommissionStats: createTool({
        description: 'Get commission statistics. Use when ambassador asks about earnings or referrals.',
        parameters: emptySchema,
        execute: async () => {
          return {
            success: true,
            stats: {
              referralCode: context?.referralCode,
              totalEarnings: (context?.totalEarnings as number) || 0,
              currentMonthCommission: (context?.currentMonthCommission as number) || 0,
              referralCount: (context?.referralCount as number) || 0,
              currentRank: (context?.currentRank as string) || 'Bronze',
            }
          };
        },
      }),
    };

    // Select tools based on role
    let tools;
    switch (role) {
      case 'teen':
        tools = teenTools;
        break;
      case 'parent':
        tools = parentTools;
        break;
      case 'partner':
        tools = partnerTools;
        break;
      case 'ambassador':
        tools = ambassadorTools;
        break;
      default:
        tools = teenTools;
        break;
    }

    // Stream the response
    const result = streamText({
      model: getDefaultModel(),
      messages,
      system: systemPrompt,
      tools,
    });

    // Return streaming response with rate limit header
    return result.toTextStreamResponse({
      headers: {
        'X-RateLimit-Remaining': rateCheck.remaining.toString(),
      },
    });
    
  } catch (error: unknown) {
    console.error('[Agent API] Error:', error);
    
    // Determine error type and return appropriate response
    const err = error as { code?: string; message?: string };
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return new Response(JSON.stringify({ 
        error: "AI service temporarily unavailable. Please try again.",
        code: "SERVICE_UNAVAILABLE"
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    
    return new Response(JSON.stringify({ 
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
      ...(process.env.NODE_ENV === 'development' ? { details: err.message } : {})
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
