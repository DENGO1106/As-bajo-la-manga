import { getCartas } from '@/lib/notion';
import { NextResponse } from 'next/server';
export const runtime = 'edge';

const DB_MAP = {
  osc: process.env.NOTION_OSC_DB,
  toxic: process.env.NOTION_TOXIC_DB,
  poker: process.env.NOTION_POKER_DB,
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get('modo') || 'osc';
  const dbId = DB_MAP[modo] || DB_MAP.osc;
  
  try {
    const cartas = await getCartas(dbId);
    return NextResponse.json(cartas);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
