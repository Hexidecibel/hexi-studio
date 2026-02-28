-- Add PKCE code_verifier to oauth_states
ALTER TABLE oauth_states ADD COLUMN code_verifier TEXT;
