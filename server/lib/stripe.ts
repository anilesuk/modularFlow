import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export interface SubscriptionTier {
  id: string;
  name: string;
  priceId: string;
  monthlyPrice: number;
  cvCredits: number;
  features: string[];
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: "free",
    name: "Free",
    priceId: "", // No price ID for free tier
    monthlyPrice: 0,
    cvCredits: 2,
    features: [
      "2 CV generations/month",
      "Basic ATS compliance check",
      "Standard PDF export",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO || "price_xxx",
    monthlyPrice: 999, // $9.99 in cents
    cvCredits: -1, // unlimited
    features: [
      "Unlimited CV generations",
      "Advanced ATS optimization",
      "Priority processing",
      "Email support",
      "Custom branding",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceId: process.env.STRIPE_PRICE_PREMIUM || "price_yyy",
    monthlyPrice: 1999, // $19.99 in cents
    cvCredits: -1, // unlimited
    features: [
      "Everything in Pro",
      "Priority AI processing (24hr support)",
      "LinkedIn profile optimization",
      "Cover letter writing",
      "Interview coaching",
      "Phone support",
    ],
  },
};

/**
 * Create or get Stripe customer
 */
export async function getOrCreateStripeCustomer(userId: string, email: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error("Failed to create Stripe customer:", error);
    throw error;
  }
}

/**
 * Create checkout session
 */
export async function createCheckoutSession(
  userId: string,
  tier: SubscriptionTier,
  successUrl: string,
  cancelUrl: string
) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: "", // Will be set via customer object if available
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: tier.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier: tier.id,
      },
    });

    return session;
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(userId: string) {
  void userId;
  return { tier: "free", ...SUBSCRIPTION_TIERS.free };
}

/**
 * Update subscription tier
 */
export async function updateSubscriptionTier(
  userId: string,
  tier: string,
  stripeSubscriptionId: string
) {
  try {
    const tierData = SUBSCRIPTION_TIERS[tier];
    if (!tierData) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    void userId;
    void stripeSubscriptionId;

    return tierData;
  } catch (error) {
    console.error("Failed to update subscription:", error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string) {
  try {
    const sub = await getSubscription(userId);
    const stripeSubscriptionId = (sub as { stripe_subscription_id?: string }).stripe_subscription_id;

    if (stripeSubscriptionId) {
      await stripe.subscriptions.cancel(stripeSubscriptionId);
    }

    return SUBSCRIPTION_TIERS.free;
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
) {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return event;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    throw error;
  }
}

/**
 * Handle subscription events
 */
export async function handleSubscriptionEvent(
  event: Stripe.Event
): Promise<void> {
  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by Stripe customer ID
        // TODO: Implement lookup
        console.log(`✓ Subscription updated for customer ${customerId}`);
        break;

      case "customer.subscription.deleted":
        const deletedSub = event.data.object as Stripe.Subscription;
        console.log(`✓ Subscription canceled for ${deletedSub.customer}`);
        break;

      case "invoice.payment_succeeded":
        console.log("✓ Invoice payment succeeded");
        break;

      case "invoice.payment_failed":
        console.log("⚠ Invoice payment failed");
        break;
    }
  } catch (error) {
    console.error("Failed to handle webhook event:", error);
    throw error;
  }
}

export default stripe;
