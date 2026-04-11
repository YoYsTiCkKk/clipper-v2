// Convex auth configuration for Clerk integration
// This file tells Convex how to validate JWTs issued by Clerk
export default {
  providers: [
    {
      domain: "https://legal-frog-6.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
