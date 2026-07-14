/**
 * Social publishing — extension point for Phase 2+.
 *
 * `SocialPublisher` is the abstract interface a real integration (Meta, LinkedIn,
 * Instagram, or an aggregator like Blotato) will implement later. For now only the
 * `DraftPublisher` exists: it saves generated content to `social_posts` as a draft.
 * NO OAuth / real publishing is implemented yet — that's wired in when validated.
 */
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { socialPosts } from "@/server/db/schema";

export type DraftPost = {
  businessId?: number | null;
  outreachMessageId?: number | null;
  platform: string; // meta | instagram | linkedin | blotato | ...
  content: string;
  media?: string[] | null;
  scheduledFor?: Date | null;
};

export type PublishResult = {
  externalPostId: string | null;
  status: "publicado" | "programado" | "error";
  error?: string;
};

/**
 * Abstract publisher. A future Meta/LinkedIn/Blotato adapter extends this and
 * implements `publish` / `schedule` against the real API. The dashboard and
 * Copywriting flow only depend on this interface, so swapping in a real publisher
 * requires no changes elsewhere.
 */
export abstract class SocialPublisher {
  abstract readonly platform: string;
  /** Publish immediately. */
  abstract publish(post: DraftPost): Promise<PublishResult>;
  /** Schedule for later. */
  abstract schedule(post: DraftPost, when: Date): Promise<PublishResult>;
}

/** Saves content as a draft `social_post`. The only publisher available today. */
export async function saveDraft(post: DraftPost) {
  const [row] = await db
    .insert(socialPosts)
    .values({
      businessId: post.businessId ?? null,
      outreachMessageId: post.outreachMessageId ?? null,
      platform: post.platform,
      content: post.content,
      media: post.media ?? null,
      status: "borrador",
      scheduledFor: post.scheduledFor ?? null,
    })
    .returning();
  return row;
}

/**
 * Placeholder publisher used until a real OAuth-backed integration is connected.
 * Calling publish/schedule simply persists a draft and reports it as not-yet-sent.
 */
export class DraftPublisher extends SocialPublisher {
  readonly platform = "draft";
  async publish(post: DraftPost): Promise<PublishResult> {
    await saveDraft(post);
    return { externalPostId: null, status: "error", error: "Sin integración real conectada (borrador guardado)." };
  }
  async schedule(post: DraftPost, when: Date): Promise<PublishResult> {
    await saveDraft({ ...post, scheduledFor: when });
    return { externalPostId: null, status: "programado" };
  }
}

export async function listSocialPosts(businessId: number) {
  return db.select().from(socialPosts).where(eq(socialPosts.businessId, businessId));
}
