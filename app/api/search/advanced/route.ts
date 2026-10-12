
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { performAdvancedSearch } from '@/app/lib/search';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filters = {
      ageMin: parseInt(request.nextUrl.searchParams.get('ageMin') || '18'),
      ageMax: parseInt(request.nextUrl.searchParams.get('ageMax') || '100'),
      region: request.nextUrl.searchParams.get('region') || '',
      mbti: request.nextUrl.searchParams.get('mbti') || '',
      interests: request.nextUrl.searchParams.get('interests')?.split(',') || [],
      gender: request.nextUrl.searchParams.get('gender') || undefined,
    };

    const results = await performAdvancedSearch(filters, user.id);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
