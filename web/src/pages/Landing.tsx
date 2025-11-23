import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Sparkles, ArrowRight } from 'lucide-react'
import VerticalBarsNoise from '@/components/VerticalBarsNoise'

export default function Landing() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()

  // Redirect to create page if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/create')
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <VerticalBarsNoise />
      
      <div className="relative z-10 max-w-3xl w-full text-center space-y-8 animate-in fade-in duration-700">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--page-badge-border)] bg-[var(--page-badge-bg)] backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-[var(--page-text-primary)]" />
          <span className="text-xs font-semibold tracking-wide uppercase text-[var(--page-text-primary)]">
            Own Your Commitments
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[var(--page-text-primary)] leading-[1.1]">
          Marks of Your Life.
          <br />
          <span className="text-[var(--primary)]">Unlocked.</span>
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl text-[var(--page-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Transform your digital commitments into permanent, on-chain Marks. 
          Get recognized, discover communities, and unlock new opportunities.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button 
            size="lg" 
            className="w-full sm:w-auto gap-2 text-lg h-12 px-8"
            onClick={() => login()}
          >
            Start Here
            <ArrowRight className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            asChild
            className="w-full sm:w-auto gap-2 text-lg h-12 px-8"
          >
            <Link to="/create?demo=true">
              Try Demo Mode
            </Link>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
          {[
            {
              title: 'Verify',
              desc: 'Connect your email to prove your attendance and achievements.'
            },
            {
              title: 'Mint',
              desc: 'Generate Zero-Knowledge proofs and mint them as NFTs on Base.'
            },
            {
              title: 'Own',
              desc: 'Build your on-chain reputation with privacy-preserving Marks.'
            }
          ].map((feature, i) => (
            <Card key={i} className="card-glass border-0 bg-background/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

