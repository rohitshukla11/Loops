import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    console.log('OAuth callback received:', { code: code ? 'present' : 'missing', error });

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=oauth_error`);
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=no_code`);
    }

    // Check environment variables
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
    
    // Determine redirect URI based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (isProduction ? 'https://better-half-ai.vercel.app' : 'http://localhost:3000');
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${baseUrl}/auth/google/callback`;

    console.log('Environment variables:', {
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'missing',
      clientSecret: clientSecret ? `${clientSecret.substring(0, 10)}...` : 'missing',
      redirectUri
    });

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth credentials');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=missing_credentials`);
    }

    // Exchange code for tokens with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
      }

      const tokens = await tokenResponse.json();
      console.log('Tokens received successfully');
      
      // Store tokens in a secure way (in production, use a database)
      // For now, we'll pass them back to the client via URL parameters
      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
      };

      // Encode the token data to pass to the client
      const encodedTokens = encodeURIComponent(JSON.stringify(tokenData));

      // Redirect back to the app with success and tokens
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?calendar_auth=success&tokens=${encodedTokens}`);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Token exchange timed out');
        throw new Error('Token exchange timed out');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Failed to handle Google OAuth callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?error=auth_failed`);
  }
}
