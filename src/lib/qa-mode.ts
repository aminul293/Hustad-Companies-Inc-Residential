/**
 * Hustad Platform QA/Staging Mode Isolation
 * 
 * Centralized control for all testing artifacts.
 * QA features are strictly disabled unless NEXT_PUBLIC_QA_MODE is "true".
 */

export const IS_QA_MODE = process.env.NEXT_PUBLIC_QA_MODE === "true";

export function isQAEnabled(): boolean {
  return IS_QA_MODE;
}

/**
 * Returns a mock representative identity ONLY if QA_MODE is enabled.
 */
export function getMockRep(repId: string | null) {
  if (!IS_QA_MODE || !repId || repId !== 'rep_001') return null;
  
  return {
    id: 'rep_001',
    name: 'QA Tester (Mock)',
    email: 'qa@hustadcompanies.com',
    role: 'rep'
  };
}

/**
 * Returns whether a given rep ID should bypass standard enterprise auth
 * during E2E testing.
 */
export function isMockRep(repId: string | null): boolean {
  return IS_QA_MODE && repId === 'rep_001';
}
