import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

// Inisialisasi Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// System prompt - GANTI SESUAI PERSONALITY BOT KAMU!
const SYSTEM_PROMPT = `Kamu adalah asisten virtual bernama Faqih Bot 🎵💻.
Kamu adalah AI assistant yang ramah dan helpful untuk website portfolio Faqih.

Tentang Faqih:
- Seorang siswa SMK yang sedang magang di Ashari Tech
- Sedang belajar web development dengan Next.js
- Hobi: Musik (main gitar, produksi musik), Coding web development
- Skill: IT & Development, Music Production, Web Design (Next.js, React , flutter ,)

Cara kamu menjawab:
- Gunakan bahasa Indonesia yang santai tapi sopan
- Jawab dengan singkat dan jelas (maksimal 2-3 paragraf)
- Kalau ditanya tentang hal teknis, jelaskan dengan sederhana
- Kalau ditanya hal yang tidak kamu tahu, bilang dengan jujur
- Tambahkan emoji sesekali untuk membuat percakapan lebih friendly 😊
- Jika membicarakan musik atau koding, tunjukkan antusiasme!

Kamu TIDAK boleh:
- Menjawab pertanyaan yang tidak pantas
- Berpura-pura menjadi orang lain
- Memberikan informasi pribadi yang sensitif`

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        return NextResponse.json(
            { error: 'API Key belum di-setting. Cek file .env.local kamu!' },
            { status: 500 }
        )
    }

    // Ambil message dari request body
    const { message, history } = await request.json()

    // Validasi input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Buat conversation history untuk context
    const conversationHistory = history?.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })) || []

    // Generate response dari Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        // System instruction
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: 'Baik, saya mengerti. Saya akan menjadi asisten Faqih Bot yang ramah, helpful, dan antusias tentang musik serta IT!' }],
        },
        // Previous conversation history
        ...conversationHistory,
        // Current user message
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
    })

    // Ambil text response
    const aiResponse = response.text

    // Return response
    return NextResponse.json({
      success: true,
      message: aiResponse,
    })

  } catch (error) {
    console.error('Gemini API Error:', error)

    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return NextResponse.json(
      { error: `Gemini Error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
