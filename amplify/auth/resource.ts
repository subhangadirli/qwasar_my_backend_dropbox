import { defineAuth } from '@aws-amplify/backend';

/**
 * Cognito user pool for My Backend Dropbox.
 * Users sign up and sign in with their email address.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
