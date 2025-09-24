import { NextRequest, NextResponse } from 'next/server';
import { getPersonalizedAgent } from '@/lib/personalized-agent-service';

export async function GET(request: NextRequest) {
  try {
    const personalizedAgent = getPersonalizedAgent();
    const profile = personalizedAgent.getUserProfile();

    return NextResponse.json({
      profile,
      success: true
    });

  } catch (error: any) {
    console.error('Failed to get user profile:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, updateType } = body;

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      );
    }

    const personalizedAgent = getPersonalizedAgent();

    // Update different parts of the profile based on updateType
    switch (updateType) {
      case 'preferences':
        await personalizedAgent.updatePreferences(profile.preferences);
        break;
      case 'goals':
        await personalizedAgent.updateGoals(profile.goals);
        break;
      case 'full':
      default:
        // Update the entire profile by updating each section
        if (profile.preferences) {
          await personalizedAgent.updatePreferences(profile.preferences);
        }
        if (profile.goals) {
          await personalizedAgent.updateGoals(profile.goals);
        }
        // Note: personalityTraits would need a similar method in the service
        break;
    }

    // Get the updated profile
    const updatedProfile = personalizedAgent.getUserProfile();

    return NextResponse.json({
      profile: updatedProfile,
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Failed to update user profile:', error);
    
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const personalizedAgent = getPersonalizedAgent();
    
    // Reset to default profile
    const defaultProfile = {
      preferences: {
        workoutTypes: ['cardio', 'strength training'],
        dietaryRestrictions: [],
        workingHours: { start: '9:00', end: '17:00' },
        mealTimes: { breakfast: '8:00', lunch: '12:00', dinner: '19:00' }
      },
      goals: {
        fitness: ['stay active', 'maintain health'],
        productivity: ['focused work', 'work-life balance'],
        wellness: ['manage stress', 'adequate rest']
      },
      personalityTraits: {
        energyPeaks: 'morning' as const,
        workStyle: 'focused-blocks' as const,
        stressManagement: ['breaks', 'exercise', 'breathing']
      }
    };

    await personalizedAgent.updatePreferences(defaultProfile.preferences);
    await personalizedAgent.updateGoals(defaultProfile.goals);

    return NextResponse.json({
      profile: defaultProfile,
      success: true,
      message: 'Profile reset to defaults'
    });

  } catch (error: any) {
    console.error('Failed to reset user profile:', error);
    
    return NextResponse.json(
      { error: 'Failed to reset user profile' },
      { status: 500 }
    );
  }
}
