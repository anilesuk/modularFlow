import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Get user from Clerk
 */
export async function getClerkUser(userId: string) {
  try {
    const user = await clerk.users.getUser(userId);
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      metadata: user.publicMetadata,
    };
  } catch (error) {
    console.error("Failed to get Clerk user:", error);
    throw error;
  }
}

/**
 * Update user metadata in Clerk
 */
export async function updateClerkUserMetadata(
  userId: string,
  metadata: Record<string, any>
) {
  try {
    const user = await clerk.users.updateUser(userId, {
      publicMetadata: metadata,
    });
    return user;
  } catch (error) {
    console.error("Failed to update Clerk user metadata:", error);
    throw error;
  }
}

/**
 * List all organizations for a user
 */
export async function getUserOrganizations(userId: string) {
  try {
    const organizations = await clerk.users.getOrganizationMembershipList({
      userId,
    });
    return organizations;
  } catch (error) {
    console.error("Failed to get user organizations:", error);
    throw error;
  }
}

/**
 * Create organization for user
 */
export async function createUserOrganization(
  userId: string,
  organizationName: string
) {
  try {
    const organization = await clerk.organizations.createOrganization({
      name: organizationName,
      createdBy: userId,
    });
    return organization;
  } catch (error) {
    console.error("Failed to create organization:", error);
    throw error;
  }
}

export default clerk;
