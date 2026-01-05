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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Show welcome message when chat is first opened
  useEffect(() => {
    if (isOpen && !hasShownWelcome) {
      const welcomeMessage: Message = {
        id: Date.now(),
        text: 'Halo! Saya adalah Agil Bot 🎵💻 Saya bisa membantu Anda mengetahui lebih banyak tentang skills, portfolio, dan passion saya di bidang IT & Music. Ada yang bisa saya bantu? 😊',
        sender: 'bot',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
      setHasShownWelcome(true)
      localStorage.setItem('hasShownWelcome', 'true')
    }
  }, [isOpen, hasShownWelcome])

  // Bot auto-reply with contextual responses
  const getBotReply = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()
    
    if (lowerMessage.includes('portfolio') || lowerMessage.includes('project') || lowerMessage.includes('karya')) {
      return 'Saya passionate tentang web development dan music production! Portfolio saya mencakup berbagai project IT dan karya musik. Saya selalu mencari cara untuk mengintegrasikan teknologi dengan seni 🎨💻'
    }
    
    if (lowerMessage.includes('contact') || lowerMessage.includes('kontak') || lowerMessage.includes('hubungi')) {
      return 'Anda bisa menghubungi saya melalui email atau social media yang tertera di portfolio ini. Saya selalu terbuka untuk kolaborasi dan diskusi! 📧'
    }
    
    if (lowerMessage.includes('skill') || lowerMessage.includes('kemampuan') || lowerMessage.includes('keahlian')) {
      return 'Keahlian saya meliputi IT & Development, Music Production, dan Web Design. Saya percaya teknologi dan musik adalah dua aspek kreativitas yang saling melengkapi! 🚀🎵'
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('bantuan') || lowerMessage.includes('bantu')) {
      return 'Saya bisa membantu Anda dengan informasi tentang:\n• Portfolio & Projects\n• Skills & Expertise\n• Contact Information\n• Music & IT Background\n\nSilakan tanya apa saja! 💡'
    }
    
    if (lowerMessage.includes('music') || lowerMessage.includes('musik') || lowerMessage.includes('gitar')) {
      return 'Musik adalah passion saya! Saya menikmati musik sebagai pendengar dan creator. Kombinasi antara musik dan teknologi membuat saya bisa berkreasi dengan cara yang unik 🎸🎹'
    }
    
    if (lowerMessage.includes('halo') || lowerMessage.includes('hai') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Halo! Senang bertemu dengan Anda! Ada yang bisa saya bantu? 😊'
    }
    
    if (lowerMessage.includes('terima kasih') || lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
      return 'Sama-sama! Senang bisa membantu. Jangan ragu untuk bertanya lagi kapan saja! 🙏'
    }
    
    // Default responses
    const defaultResponses = [
      'Interesting! Tell me more 🤔',
      'Saya mengerti. Ada yang lain yang ingin Anda tanyakan?',
      'That\'s a great point! Apa lagi yang ingin Anda ketahui tentang saya?',
      'Noted! Feel free to ask anything about my work or interests 💼🎵',
      'Terima kasih sudah berbagi! Ada pertanyaan lain untuk saya?'
    ]
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  }

  const handleSend = () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Show typing indicator
    setIsTyping(true)

    // Bot reply after delay (simulating typing)
    setTimeout(() => {
      const botReply: Message = {
        id: Date.now() + 1,
        text: getBotReply(inputValue),
        sender: 'bot',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, botReply])
      setIsTyping(false)
    }, 1000 + Math.random() * 1000) // Random delay between 1-2 seconds
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
        <div className="fixed bottom-24 right-6 w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-gray-300 z-50 animate-slideUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-900 text-white p-4 flex justify-between items-center border-b-2 border-gray-400">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div className="flex flex-col">
                <span className="font-bold text-lg">Agil Bot</span>
                <span className="text-xs text-gray-300">Online • Always ready to help</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="hover:bg-gray-600 rounded-full p-2 transition-all duration-200 hover:scale-110"
                aria-label="Clear chat history"
                title="Hapus riwayat chat"
              >
                <span className="text-lg">🗑️</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-gray-600 rounded-full p-2 transition-all duration-200 hover:rotate-90"
                aria-label="Close chat"
              >
                <span className="text-xl">✕</span>
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
