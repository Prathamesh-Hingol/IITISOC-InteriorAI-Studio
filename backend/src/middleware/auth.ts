import { Request, Response, NextFunction } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { prisma } from "../config/db";

declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
    }
  }
}

/**
 * Middleware that requires authentication via Clerk, verifies the session,
 * and ensures the user profile is synchronized into the PostgreSQL database.
 */
export async function requireAuthAndSyncUser(req: Request, res: Response, next: NextFunction) {
  // Clerk middleware injects the `auth` object on Request.
  const auth = getAuth(req);

  if (!auth || !auth.userId) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
  }

  try {
    const userId = auth.userId;

    // Try to find the user in local PostgreSQL
    let dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    // If not present, retrieve details from Clerk and create local user
    if (!dbUser) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress || `${userId}@clerk-no-email.com`;
        
        dbUser = await prisma.user.upsert({
          where: { id: userId },
          update: {
            email,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
          },
          create: {
            id: userId,
            email,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
          },
        });
      } catch (clerkError) {
        console.error("Error fetching user details from Clerk SDK:", clerkError);
        // Fallback user creation so the application doesn't crash if Clerk API rate limits
        dbUser = await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            email: `${userId}@clerk-no-email.com`,
            firstName: "Interior",
            lastName: "Designer",
          },
        });
      }
    }

    // Attach local DB user context to the request
    req.currentUser = dbUser;
    next();
  } catch (error) {
    console.error("Authentication sync middleware exception:", error);
    res.status(500).json({ error: "Internal Server Error during user validation" });
  }
}
