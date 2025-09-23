import { NextRequest, NextResponse } from 'next/server';
import { getMemoryService } from '@/lib/memory-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryService = getMemoryService();
    const permissions = await memoryService.getMemoryPermissions(params.id);
    
    return NextResponse.json({ permissions });
  } catch (error: any) {
    console.error('Failed to get memory permissions:', error);
    return NextResponse.json(
      { error: 'Failed to get memory permissions', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { agentId, actions } = body;

    if (!agentId || !actions) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, actions' },
        { status: 400 }
      );
    }

    const memoryService = getMemoryService();
    const success = await memoryService.grantPermission(params.id, agentId, actions);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to grant permission' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Failed to grant permission:', error);
    return NextResponse.json(
      { error: 'Failed to grant permission', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: agentId' },
        { status: 400 }
      );
    }

    const memoryService = getMemoryService();
    const success = await memoryService.revokePermission(params.id, agentId);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to revoke permission' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Failed to revoke permission:', error);
    return NextResponse.json(
      { error: 'Failed to revoke permission', details: error.message },
      { status: 500 }
    );
  }
}

