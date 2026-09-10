export const TEST_USERS = {
  admin: {
    email: 'admin@zeta.global',
    name: 'QA Admin',
    role: 'admin',
  },
  standardUser: {
    email: 'qa.user@zeta.global',
    name: 'QA Analyst',
    role: 'user',
  },
  invalidUser: {
    email: 'invalid.user@zeta.global',
    password: 'wrongpassword123',
  }
};

export const MOCK_CAMPAIGN = {
  name: 'E2E Automated Test Campaign',
  team: 'HP-APJ',
  country: 'AU',
  versionName: 'v1.0-e2e',
  webViewUrl: 'https://example.com/email-preview',
  htmlSource: '<!DOCTYPE html><html><head><title>E2E Test Email</title></head><body><h1>Hello E2E Test</h1><a href="https://hp.com">Shop Now</a></body></html>',
};

export function getMockSession(role: 'admin' | 'user' = 'user') {
  const user = role === 'admin' ? TEST_USERS.admin : TEST_USERS.standardUser;
  return {
    email: user.email,
    role: user.role,
    name: user.name,
    timestamp: new Date().toISOString()
  };
}
