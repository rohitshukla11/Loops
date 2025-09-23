import { NextRequest, NextResponse } from 'next/server';
import { getMemoryService } from '@/lib/memory-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const type = searchParams.get('type') as any;
    const category = searchParams.get('category') || '';
    const tags = searchParams.get('tags')?.split(',') || [];
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const memoryService = getMemoryService();
    
    // Initialize the service if needed
    await memoryService.initialize();
    
    const searchResult = await memoryService.searchMemories({
      query,
      type,
      category,
      tags,
      limit,
      offset
    });

    return NextResponse.json(searchResult);
  } catch (error: any) {
    console.error('Failed to search memories:', error);
    return NextResponse.json(
      { error: 'Failed to search memories', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, type, category, tags, encrypted } = body;

    if (!content || !type || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: content, type, category' },
        { status: 400 }
      );
    }

    const memoryService = getMemoryService();
    
    // Initialize the service if needed
    await memoryService.initialize();
    
    const memory = await memoryService.createMemory({
      content,
      type,
      category,
      tags: tags || [],
      encrypted: encrypted !== false // Default to true
    });

    return NextResponse.json(memory);
  } catch (error: any) {
    console.error('Failed to create memory:', error);
    return NextResponse.json(
      { error: 'Failed to create memory', details: error.message },
      { status: 500 }
    );
  }
}
