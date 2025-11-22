import { Button } from '@/components/ui/button'
import { Sparkles, Calendar, Loader2 } from 'lucide-react'
import type { GmailMessageDetail } from '../types/gmail'

interface EmailCardProps {
  email: GmailMessageDetail
  onMarkIt?: () => void
  isLoading?: boolean
  className?: string
}

export default function EmailCard({ email, onMarkIt, isLoading = false, className }: EmailCardProps) {
  // Determine email source from email address
  const getEmailSource = (email: GmailMessageDetail): 'luma' | 'substack' | 'other' => {
    const from = email.from.toLowerCase()
    if (from.includes('luma.co') || from.includes('lu.ma') || from.includes('luma-mail.com')) {
      return 'luma'
    }
    if (from.includes('substack.com')) {
      return 'substack'
    }
    return 'other'
  }

  const source = getEmailSource(email)
  
  // Clean up the title
  const getCleanTitle = () => {
    const cleaned = email.subject.replace(/^.*Registration Confirmation:?\s*/i, '').trim()
    return cleaned ? `Registration confirmed for ${cleaned}` : email.subject
  }

  // Format date
  const formatDate = () => {
    return new Date(email.date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className={`relative group ${className}`}>
        {/* Main card with figma styling using existing CSS variables */}
        <div 
        className="card-figma-with-blur border border-solid box-border flex flex-col gap-[10px] items-start p-[10px] relative w-full overflow-hidden"
          style={{
            borderRadius: 'var(--figma-card-radius)',
            borderColor: 'var(--figma-card-stroke)',
            backdropFilter: `blur(var(--figma-card-blur))`,
            WebkitBackdropFilter: `blur(var(--figma-card-blur))`,
            transition: 'border-color 300ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
            if (document.documentElement.classList.contains('dark')) {
              e.currentTarget.style.borderColor = 'rgba(200, 200, 200, 0.9)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--figma-card-stroke)'
          }}
        >
          {/* Dark overlay filter - only for dark mode */}
          <div 
            className="absolute inset-0 dark:bg-black/40 pointer-events-none"
            style={{ zIndex: 0 }}
          />
          
          {/* Content wrapper with higher z-index */}
          <div className="flex flex-col gap-px items-start relative w-full" style={{ zIndex: 1 }}>
            
            {/* Top row: Badge + Date */}
            <div className="box-border flex items-center justify-between pl-[8px] pr-[10px] py-[4px] relative rounded-[23px] w-full">
              {/* Source Badge */}
              <div 
                className="box-border flex flex-col gap-[10px] items-start px-[8px] py-[4px] relative rounded-[24px] 
                  bg-gray-800/60 border border-gray-700/40 
                  backdrop-blur-lg backdrop-saturate-[180%] 
                  mix-blend-overlay 
                  shadow-[0_2px_8px_rgba(0,0,0,0.12)]
                  transition-all duration-300
                  hover:bg-gray-800/70 hover:border-gray-600/50 hover:mix-blend-overlay hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]
                  dark:bg-black/70 dark:border-gray-600/50 
                  dark:mix-blend-overlay dark:backdrop-blur-xl dark:backdrop-saturate-[200%]
                  dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]
                  dark:hover:bg-black/80 dark:hover:border-gray-500/60 dark:hover:mix-blend-overlay dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
              >
                <div className="flex gap-[10px] items-center relative w-full">
                  <div className="flex gap-[4px] items-center justify-center relative">
                    <div className="relative size-[12px]">
                      <Sparkles className="w-full h-full text-white/95 dark:text-white/95" />
                    </div>
                    <p 
                      className="font-normal leading-[normal] relative text-[12px] text-white/95 dark:text-white/95"
                    >
                      {source === 'luma' ? 'Luma' : source === 'substack' ? 'Substack' : 'Event'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Date */}
              <div className="flex flex-col gap-[10px] items-center justify-center relative">
                <div className="box-border flex gap-[10px] items-center p-[4px] relative w-full">
                  <div className="relative size-[16px]">
                    <Calendar className="w-full h-full" style={{ color: 'var(--page-text-primary)' }} />
                  </div>
                  <p 
                    className="font-normal leading-[normal] relative text-[12px]"
                    style={{ color: 'var(--page-text-primary)' }}
                  >
                    {formatDate()}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Main content section */}
            <div className="box-border flex flex-col gap-[8px] items-start p-[8px] relative w-full">
              {/* Title */}
              <div className="flex gap-[10px] items-center relative w-full">
                <p 
                  className="font-semibold leading-[normal] relative text-[16px]"
                  style={{ color: 'var(--page-text-primary)' }}
                >
                  {getCleanTitle()}
                </p>
              </div>
              
              {/* Content snippet */}
              <p 
                className="font-normal leading-[normal] relative text-[12px] w-full whitespace-pre-wrap"
                style={{ color: 'var(--page-text-secondary)' }}
              >
                {email.snippet}
              </p>
            </div>
            
            {/* Action button section */}
            <div className="box-border flex flex-col gap-[8px] items-start p-[8px] relative w-full">
              <Button
                onClick={onMarkIt}
                disabled={isLoading}
                variant="outline"
                className="flex gap-[10px] items-center justify-center w-full sm:w-auto transition-all duration-300
                  group-hover:bg-[var(--figma-cta1-bg)] 
                  group-hover:border-[var(--figma-cta1-border)]
                  group-hover:text-[var(--figma-cta1-text)]
                  group-hover:bg-blend-normal 
                  group-hover:backdrop-blur-0
                  group-hover:shadow-lg
                  dark:group-hover:bg-[var(--figma-cta1-bg)]
                  dark:group-hover:border-[var(--figma-cta1-border)]
                  dark:group-hover:text-[var(--figma-cta1-text)]
                  dark:group-hover:bg-blend-hard-light 
                  dark:group-hover:backdrop-blur-[7.5px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Mark It</span>
                  </>
                )}
              </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
