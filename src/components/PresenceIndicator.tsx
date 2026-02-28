'use client'

import type { CollaboratorPresence } from '@/hooks/useCollaboration'

interface PresenceIndicatorProps {
  collaborators: CollaboratorPresence[]
  isConnected: boolean
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function PresenceIndicator({ collaborators, isConnected }: PresenceIndicatorProps) {
  if (!isConnected) {
    return (
      <div className="presence-indicator presence-connecting">
        <span className="presence-dot presence-dot--gray" />
        <span>Connecting...</span>
      </div>
    )
  }

  return (
    <div className="presence-indicator">
      {/* Avatar stack */}
      <div className="presence-avatars">
        {collaborators.slice(0, 5).map((user) => (
          <div
            key={user.userId}
            className="presence-avatar"
            title={user.displayName}
            style={{ backgroundColor: user.color }}
          >
            {getInitials(user.displayName)}
          </div>
        ))}
        {collaborators.length > 5 && (
          <div className="presence-avatar presence-avatar--overflow">
            +{collaborators.length - 5}
          </div>
        )}
      </div>

      {/* Count label */}
      {collaborators.length > 0 && (
        <span className="presence-count">
          {collaborators.length === 1
            ? '1 orang lagi di sini'
            : `${collaborators.length} orang lagi di sini`}
        </span>
      )}

      {/* Live dot */}
      <div className="presence-live">
        <span className="presence-dot presence-dot--green" />
        <span>Live</span>
      </div>
    </div>
  )
}
