import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { notifications } from '@mantine/notifications'
import {
  IconDatabase,
  IconRobot,
  IconChartBar,
  IconBulb,
} from '@tabler/icons-react'
import type { NotificationType } from '@/convex/notifications'
import { Text, Box } from '@mantine/core'

interface TableNotificationsProps {
  tableName: string
  currentUserId: string | null
  onQueryExecuted?: () => void
}

// Custom notification content using Mantine components for improved styling
function NotificationContent({
  icon,
  title,
  message,
  userName,
  color,
}: {
  icon: ReactNode
  title: string
  message: string
  userName: string
  color: string
}) {
  // Map color keys to background and icon color.
  // Slightly transparent backgrounds, readable text.
  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: '#f0f6ff', icon: '#228be6' },
    violet: { bg: '#f6f0ff', icon: '#ae3ec9' },
    purple: { bg: '#f6f0ff', icon: '#7950f2' },
    yellow: { bg: '#fffbe6', icon: '#fab005' },
    green: { bg: '#f0fff4', icon: '#37b24d' },
    default: { bg: '#f8fafc', icon: '#868e96' },
  }
  const styleColors = colorMap[color] || colorMap.default

  return (
    <Box
      style={{
        background: styleColors.bg,
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow:
          '0 2px 12px 0 rgba(0,0,0,0.06), 0 1.5px 2px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        minWidth: 310,
        maxWidth: 380,
      }}
    >
      <Box
        style={{
          background: '#fff',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px 0 rgba(60,60,70,.07)',
          color: styleColors.icon,
          flexShrink: 0,
        }}
      >
        {/* icon is a react component */}
        {icon}
      </Box>
      <Box style={{ flex: 1, overflow: 'hidden' }}>
        <Text
          size="md"
          style={{
            color: '#222',
            marginBottom: 2,
            lineHeight: 1.22,
            fontWeight: 700,
          }}
        >
          {title}
        </Text>
        <Text
          size="sm"
          style={{ color: '#555', lineHeight: 1.5, wordBreak: 'break-word' }}
        >
          <span style={{ fontWeight: 600, color: styleColors.icon }}>
            {userName}
          </span>{' '}
          {message}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Component that listens for notifications for a specific table
 * and displays them using Mantine notifications (excluding notifications from the current user)
 */
export function TableNotifications({
  tableName,
  currentUserId,
  onQueryExecuted,
}: TableNotificationsProps) {
  const latestNotification = useQuery(api.notifications.getLatestNotification, {
    tableName,
  })

  // Track the last notification ID we've shown to avoid duplicates
  const lastShownNotificationId = useRef<string | null>(null)

  useEffect(() => {
    if (!latestNotification || !currentUserId) {
      return
    }

    // Skip if this notification is from the current user
    if (latestNotification.userId === currentUserId) {
      return
    }

    // Skip if we've already shown this notification
    if (lastShownNotificationId.current === latestNotification._id) {
      return
    }

    // Mark this notification as shown
    lastShownNotificationId.current = latestNotification._id

    // Determine icon and color based on notification type
    const getNotificationConfig = (type: NotificationType) => {
      switch (type) {
        case 'query':
          return {
            icon: <IconDatabase size={22} stroke={1.6} />,
            color: 'blue',
            title: 'Query Executed',
          }
        case 'agent_query':
          return {
            icon: <IconRobot size={22} stroke={1.6} />,
            color: 'violet',
            title: 'AI Query',
          }
        case 'agent_analysis':
          return {
            icon: <IconRobot size={22} stroke={1.6} />,
            color: 'purple',
            title: 'AI Analysis',
          }
        case 'insights_generated':
          return {
            icon: <IconBulb size={22} stroke={1.6} />,
            color: 'yellow',
            title: 'Insights Generated',
          }
        case 'chart_created':
          return {
            icon: <IconChartBar size={22} stroke={1.6} />,
            color: 'green',
            title: 'Chart Created',
          }
        default:
          return {
            icon: <IconDatabase size={22} stroke={1.6} />,
            color: 'blue',
            title: 'Activity',
          }
      }
    }

    const config = getNotificationConfig(latestNotification.type)
    const userName = latestNotification.userName || 'Someone'

    // Show the improved notification UI
    notifications.show({
      id: latestNotification._id,
      // Get rid of Mantine default icon and message
      title: undefined,
      message: (
        <NotificationContent
          icon={config.icon}
          title={config.title}
          message={latestNotification.message}
          userName={userName}
          color={config.color}
        />
      ),
      color: undefined, // let contents decide
      autoClose: 5000,
      withCloseButton: true,
      styles: {
        root: {
          boxShadow: 'none',
          padding: 0,
          background: 'transparent',
          border: 'none',
        },
        body: {
          padding: 0,
          margin: 0,
        },
        title: { display: 'none' },
        closeButton: {
          top: 10,
          right: 10,
          borderRadius: 8,
          background: 'rgba(245,245,250,0.90)',
          border: 'none',
          color: '#8a8a95',
          boxShadow: '0 2px 6px 0 rgba(60,60,70,.07)',
          width: 26,
          height: 26,
          '&:hover': {
            background: '#f1f3f7',
            color: '#222',
          },
        },
      },
    })
    if (latestNotification.type === 'query') {
      onQueryExecuted?.()
    }
  }, [latestNotification, currentUserId, onQueryExecuted])

  // This component doesn't render anything visible
  return null
}
