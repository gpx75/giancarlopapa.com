import { defaultProfile } from '~/data/profile';

export default defineEventHandler(() => {
  return { profile: defaultProfile, source: 'static' as const };
});
