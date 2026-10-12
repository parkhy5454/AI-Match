
import { prisma } from '@/lib/db';

export interface SearchFilters {
  ageMin: number;
  ageMax: number;
  region: string;
  mbti: string;
  interests: string[];
  gender?: string;
  distance?: number;
}

export async function performAdvancedSearch(filters: SearchFilters, userId: string) {
  const query: any = {
    NOT: {
      OR: [
        { id: userId },
        { blocks: { some: { blockerId: userId } } },
        { blockedBy: { some: { blockedUserId: userId } } },
      ],
    },
  };

  if (filters.ageMin || filters.ageMax) {
    query.profile = { age: {} };
    if (filters.ageMin) query.profile.age.gte = filters.ageMin;
    if (filters.ageMax) query.profile.age.lte = filters.ageMax;
  }

  if (filters.region) {
    if (!query.profile) query.profile = {};
    query.profile.region = { contains: filters.region };
  }

  if (filters.mbti) {
    if (!query.profile) query.profile = {};
    query.profile.mbti = filters.mbti;
  }

  if (filters.interests && filters.interests.length > 0) {
    if (!query.profile) query.profile = {};
    query.profile.interests = { hasSome: filters.interests };
  }

  const results = await prisma.user.findMany({
    where: query,
    include: { profile: true },
    take: 50,
  });

  return results.map(user => ({
    id: user.id,
    username: user.username,
    age: user.profile?.age,
    region: user.profile?.region,
    mbti: user.profile?.mbti,
    image: user.image,
  }));
}
