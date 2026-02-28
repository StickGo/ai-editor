import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // Use the REST API to execute SQL directly
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  })

  // Try creating via Supabase client — check if table exists first
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Test if table is accessible
  const { error: testError } = await supabase
    .from('document_shares')
    .select('id')
    .limit(1)

  if (!testError) {
    return NextResponse.json({ status: 'Table already exists and is accessible!' })
  }

  // Return the error for debugging
  return NextResponse.json({
    status: 'Table NOT accessible',
    error: testError,
    supabaseUrl,
    hint: 'Please create the table manually in Supabase Dashboard → Table Editor → New Table. Name: document_shares. See instructions below.',
    restApiTest: res.status,
  })
}
