import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { getClerkUser } from "./lib/clerk";

declare global {
  namespace Express {
    interface Request {
      user?: {
        claims: {
          sub: string;
        };
      };
    }
  }
}

export async function setupAuth(app: Express) {
  app.use(
    clerkMiddleware({
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    }),
  );
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  getClerkUser(auth.userId)
    .then(async (clerkUser) => {
      await storage.upsertUser({
        id: clerkUser.id,
        email: clerkUser.email ?? null,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profileImageUrl: clerkUser.imageUrl ?? null,
      });

      req.user = {
        claims: {
          sub: auth.userId!,
        },
      };

      next();
    })
    .catch((error) => {
      console.error("Failed to synchronize Clerk user:", error);
      res.status(500).json({ message: "Failed to load authenticated user" });
    });
};