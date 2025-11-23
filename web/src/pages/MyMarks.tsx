import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { POAPBadge } from '@/components/POAPBadge'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Sparkles } from 'lucide-react'
import VerticalBarsNoise from '@/components/VerticalBarsNoise'
import type { GmailMessageDetail } from '@/types/gmail'
import type { NFTMetadata } from '@/services/nftMinting'

// Stored NFT type definition
interface StoredNFT {
  id: string
  tokenId: string
  txHash: string
  metadata: NFTMetadata
  imageUrl: string
  walletAddress: string
  proofId: string
  mintedAt: string
  status: 'minted'
}

export default function MyMarks() {
  // @ts-ignore - Future use
  const { isAuthenticated } = useAuth()
  const [nfts, setNfts] = useState<StoredNFT[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load NFTs from localStorage
    const loadNfts = () => {
      try {
        const stored = localStorage.getItem('mintmark_nfts')
        if (stored) {
          const parsed = JSON.parse(stored)
          // Sort by mintedAt desc
          setNfts(parsed.sort((a: StoredNFT, b: StoredNFT) => 
            new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime()
          ))
        }
      } catch (e) {
        console.error('Failed to load NFTs', e)
      } finally {
        setIsLoading(false)
      }
    }

    loadNfts()
  }, [])

  // Helper to reconstruct email detail from NFT metadata for POAPBadge
  const getEmailDetailFromNft = (nft: StoredNFT): GmailMessageDetail => {
    const eventNameAttr = nft.metadata.attributes.find(a => a.trait_type === 'Event Name')
    const dateAttr = nft.metadata.attributes.find(a => a.trait_type === 'Date')
    
    return {
      id: nft.id,
      subject: String(eventNameAttr?.value || nft.metadata.name),
      date: String(dateAttr?.value || new Date().toISOString()),
      from: 'Mintmark',
      snippet: nft.metadata.description
    }
  }

  return (
    <div className="relative min-h-screen pb-20">
      <VerticalBarsNoise />

      <div className="container max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pt-8 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--page-text-primary)]">
              My Marks
            </h1>
            <p className="text-[var(--page-text-secondary)] mt-2">
              Your collection of verified digital commitments.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-[var(--glass-bg-secondary)] px-4 py-2 rounded-full border border-[var(--glass-border)]">
            <div className="text-sm font-medium text-[var(--page-text-primary)]">
              Total Marks: <span className="font-bold">{nfts.length}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : nfts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => (
              <div key={nft.id} className="group relative">
                <POAPBadge 
                  email={getEmailDetailFromNft(nft)} 
                  showVerified={true}
                  status="verified"
                  className="w-full"
                />
                <div className="absolute -bottom-2 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-xs font-mono bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                    Token ID: {nft.tokenId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="card-glass border-dashed border-2 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--page-badge-bg)] flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-[var(--primary)]" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-[var(--page-text-primary)]">
                No Marks Yet
              </h3>
              <p className="text-[var(--page-text-secondary)] max-w-md mb-8">
                You haven't minted any marks yet. Start by verifying your first email commitment.
              </p>
              <Button asChild size="lg">
                <Link to="/create">Create Your First Mark</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
