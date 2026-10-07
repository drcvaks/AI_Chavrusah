import type { Database } from '../types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AppRole = Database['public']['Enums']['app_role'];
export type DepthMode = Database['public']['Enums']['learning_depth_mode'];
export type FacetType = 'DOMAIN' | 'CORPUS' | 'CONTEXT' | 'TOPIC';
export type IdeaOrigin = 'USER' | 'AI' | 'SOURCE' | 'JOINTLY_DEVELOPED';
export type SourcePolicyState = 'APPROVED' | 'ON_REQUEST' | 'EXCLUDED';

export function canAccessAdmin(userId: string | undefined, profile: Profile | null) {
  return !!userId && profile?.id === userId && profile.role === 'GLOBAL_ADMIN';
}
