/**
 * Object Storage ACL Service
 * Ensures users can only access their own documents
 */

export class ObjectAclService {
  /**
   * Verify if a user has access to a specific storage path
   * Storage paths follow: .private/{userId}/{runId}/{documentType}_{timestamp}.docx
   */
  canAccess(userId: string, storagePath: string): boolean {
    // Extract userId from path
    const pathParts = storagePath.split("/");
    
    // Path should be: .private / userId / runId / filename
    if (pathParts.length < 3) {
      return false;
    }

    // Check if path starts with .private
    if (pathParts[0] !== ".private") {
      return false;
    }

    // Check if the userId in the path matches the requesting user
    const pathUserId = pathParts[1];
    return pathUserId === userId;
  }

  /**
   * Validate storage path format
   * Accepts any non-empty user ID (Replit sub can be various formats like "user-123abc")
   */
  isValidPath(storagePath: string): boolean {
    const pathPattern = /^\.private\/[^/]+\/[^/]+\/.+\.docx$/;
    return pathPattern.test(storagePath);
  }
}

export const objectAcl = new ObjectAclService();
