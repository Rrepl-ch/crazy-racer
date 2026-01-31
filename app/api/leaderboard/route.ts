import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, addLeaderboardEntry, getBestScoreByAddress } from '@/app/lib/store';
import {
  isRedisAvailable,
  getLeaderboardRedis,
  addLeaderboardEntryRedis,
  getBestScoreByAddressRedis,
} from '@/app/lib/leaderboard';

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(addr).trim());
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (address) {
    const best = isRedisAvailable()
      ? await getBestScoreByAddressRedis(address)
      : getBestScoreByAddress(address);
    return NextResponse.json({ best });
  }
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 20, 100);
  const entries = isRedisAvailable() ? await getLeaderboardRedis(limit) : getLeaderboard(limit);
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nickname, score, address, carId, avatar } = body;
    if (typeof nickname !== 'string' || typeof score !== 'number' || !address) {
      return NextResponse.json(
        { error: 'Missing or invalid nickname, score, or address' },
        { status: 400 }
      );
    }
    const addr = String(address).trim();
    if (!isValidAddress(addr)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }
    const entry = {
      nickname: nickname.trim(),
      score: Math.floor(score),
      address: addr,
      carId: typeof carId === 'number' ? carId : 0,
      avatar: typeof avatar === 'string' ? avatar : '',
    };
    if (isRedisAvailable()) {
      await addLeaderboardEntryRedis(entry);
    } else {
      addLeaderboardEntry({ ...entry, address: addr.toLowerCase() });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
