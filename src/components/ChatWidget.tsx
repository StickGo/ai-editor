'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: number
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hasShownWelcome, setHasShownWelcome] = useState(false)

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages')
    const savedWelcome = localStorage.getItem('hasShownWelcome')
    
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages)
      setMessages(parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })))
    }
    
    if (savedWelcome) {
      setHasShownWelcome(true)
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages))
    }
  }, [messages])

  // Auto-scroll to bottom when new messages arrive or chat opens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, isOpen])

  // Show welcome message when chat is first opened
  useEffect(() => {
    if (isOpen && !hasShownWelcome) {
      const welcomeMessage: Message = {
        id: Date.now(),
        text: 'Halo! Saya adalah Faqih Bot 🎵💻 Saya bisa membantu Anda mengetahui lebih banyak tentang skills, portfolio, dan passion saya di bidang IT & Music. Ada yang bisa saya bantu? 😊',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
      setHasShownWelcome(true)
      localStorage.setItem('hasShownWelcome', 'true')
    }
  }, [isOpen, hasShownWelcome])

  // Fungsi untuk mengirim pesan ke API
  const sendMessageToAI = async (userMessage: string) => {
    try {
      // Siapkan history untuk context (ambil 10 pesan terakhir)
      const history = messages.slice(-10).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }))

      // Panggil API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: history,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendapatkan response')
      }

      return data.message
    } catch (error) {
      console.error('Error calling AI:', error)
      throw error
    }
  }

  // Handle kirim pesan
  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return

    const userMessage = inputValue.trim()
    setInputValue('')

    // Tambah pesan user
    const userMsg: Message = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])

    // Set loading (typing indicator)
    setIsTyping(true)

    try {
      // Panggil AI
      const aiResponse = await sendMessageToAI(userMessage)

      // Tambah response AI
      const botMsg: Message = {
        id: Date.now() + 1,
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (error) {
      // Tampilkan error message
      const errorMessage = error instanceof Error ? error.message : 'Maaf, terjadi kesalahan. Coba lagi ya! 😅'
      
      const errorMsg: Message = {
        id: Date.now() + 1,
        text: `Error: ${errorMessage}`,
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  // Format timestamp
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Clear chat history
  const handleClearHistory = () => {
    if (window.confirm('Hapus semua riwayat chat? Tindakan ini tidak bisa dibatalkan.')) {
      setMessages([])
      setHasShownWelcome(false)
      localStorage.removeItem('chatMessages')
      localStorage.removeItem('hasShownWelcome')
    }
  }

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`fixed bg-white shadow-2xl flex flex-col overflow-hidden border-2 border-gray-300 z-50 animate-slideUp transition-all duration-300
            ${isFullscreen 
              ? 'top-0 left-0 w-full h-full rounded-none' 
              : 'bottom-24 right-6 w-[380px] h-[550px] rounded-2xl'
            }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4 flex justify-between items-center border-b-2 border-gray-400">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div className="flex flex-col">
                <span className="font-bold text-lg">Faqih Bot</span>
                <span className="text-xs text-gray-300">Online • Always ready to help</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="hover:bg-white/20 rounded-full p-2 transition-all duration-200 text-white/90 hover:text-white"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                title={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
              >
                {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                )}
              </button>
              <button
                onClick={handleClearHistory}
                className="hover:bg-white/20 rounded-full p-2 transition-all duration-200 text-white/90 hover:text-white hover:text-red-300"
                aria-label="Clear chat history"
                title="Hapus riwayat chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-red-500/80 rounded-full p-2 transition-all duration-200 text-white/90 hover:text-white ml-1"
                aria-label="Close chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2 items-end ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg flex-shrink-0 border-2 border-gray-300">
                    🤖
                  </div>
                )}
                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[260px] px-4 py-2.5 rounded-2xl shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-br from-gray-700 to-gray-900 text-white rounded-br-md border-2 border-gray-600'
                        : 'bg-white text-gray-800 rounded-bl-md border-2 border-gray-300'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 px-2">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-lg flex-shrink-0 border-2 border-gray-400">
                    👤
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2 items-end justify-start animate-fadeIn">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg flex-shrink-0 border-2 border-gray-300">
                  🤖
                </div>
                <div className="bg-white text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-md border-2 border-gray-300">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t-2 border-gray-300 bg-gray-50 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ketik pesan..."
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all bg-white"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !inputValue.trim()}
              className="bg-gradient-to-br from-gray-700 to-gray-900 text-white px-5 py-2.5 rounded-full hover:from-gray-600 hover:to-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl border-2 border-gray-600 hover:scale-105"
              aria-label="Send message"
            >
              <span className="text-lg">➤</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center text-3xl z-50 border-2 border-gray-500 hover:border-gray-400 hover:shadow-gray-500/50"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? '✕' : '💬'}
        </span>
      </button>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .fixed.bottom-24 {
            width: calc(100vw - 2rem);
            max-width: 380px;
          }
        }
      `}</style>
    </>
  )
}
