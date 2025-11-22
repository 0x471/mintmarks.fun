import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import VerticalBarsNoise from '@/components/VerticalBarsNoise'
import { ArrowRight, Mail, Shield, Sparkles } from 'lucide-react'

export default function Home() {
    const { isAuthenticated, login } = useAuth()

    return (
        <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-hidden">
            <VerticalBarsNoise />

            <div className="container relative z-10 flex flex-col items-center text-center gap-8 py-12">
                {/* Badge */}
                <Badge
                    variant="secondary"
                    className="px-4 py-2 text-sm font-medium bg-background/50 backdrop-blur-md border border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                    Own Your Commitments
                </Badge>

                {/* Hero Title */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    Marks of Your Life. <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50">
                        Unlocked.
                    </span>
                </h1>

                {/* Hero Description */}
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    Turn your important emails into verifiable digital assets.
                    Prove your attendance, achievements, and commitments with Zero-Knowledge proofs.
                </p>

                {/* Email Preview Card (Visual Element) */}
                <div className="w-full max-w-md mx-auto my-8 animate-in fade-in zoom-in duration-1000 delay-300">
                    <div className="card-glass rounded-xl p-6 text-left space-y-4 transform transition-transform hover:scale-105">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Mail className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold">Luma</div>
                                    <div className="text-xs text-muted-foreground">Invitation</div>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">VERIFIED</Badge>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            <span>ZK Proof Generated</span>
                        </div>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                    {isAuthenticated ? (
                        <Link to="/create">
                            <Button size="lg" className="gap-2 h-12 px-8 text-base">
                                <Sparkles className="h-4 w-4" />
                                Create Your First Mark
                            </Button>
                        </Link>
                    ) : (
                        <Button size="lg" onClick={login} className="gap-2 h-12 px-8 text-base">
                            Start Here
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    )}

                    <Link to="/marks">
                        <Button variant="outline" size="lg" className="gap-2 h-12 px-8 text-base bg-background/50 backdrop-blur-sm">
                            View Gallery
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
