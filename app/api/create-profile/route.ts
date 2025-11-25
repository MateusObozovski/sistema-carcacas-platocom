import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId, email, name, role } = await request.json()

    console.log("[v0] Creating profile via API:", { userId, email, name, role })

    // Use service role to bypass RLS
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if profile already exists
    const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle()

    if (existing) {
      console.log("[v0] Profile already exists")
      return NextResponse.json({ success: true, profile: existing })
    }

    // Create the profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert([
        {
          id: userId,
          email,
          nome: name,
          role: role || "Vendedor",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating profile:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Profile created successfully:", profile)
    return NextResponse.json({ success: true, profile })
  } catch (error: any) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
