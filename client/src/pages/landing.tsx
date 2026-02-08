import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Scale, 
  ArrowRight, 
  Shield,
  FileText,
  Brain,
  Lock,
  Search,
  Workflow,
  Database,
  Eye,
} from "lucide-react";

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const capabilities = [
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "AES-256 encryption, SHA-256 chain-of-custody, and immutable audit trails protect every piece of evidence.",
    },
    {
      icon: Database,
      title: "Evidence Management",
      description: "Secure vault with Bates numbering, filing classification, and complete chain-of-custody tracking.",
    },
    {
      icon: Workflow,
      title: "Automated Workflows",
      description: "85+ automation templates with event-driven triggers to eliminate repetitive tasks and streamline operations.",
    },
    {
      icon: Brain,
      title: "AI Document Analysis",
      description: "Multi-model AI engine for entity extraction, contradiction detection, timeline construction, and case summarization.",
    },
    {
      icon: Search,
      title: "Case Analysis",
      description: "Visual investigation boards with relationship mapping, timeline analysis, and automated anomaly detection.",
    },
    {
      icon: Eye,
      title: "Matter Intelligence",
      description: "OCR-powered evidence processing with AI-driven theme extraction, risk assessment, and action item generation.",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center" data-testid="logo-icon">
              <Scale className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base leading-tight tracking-wide" data-testid="text-brand-org">SYNERGY LAW</span>
              <span className="text-xs text-muted-foreground leading-tight" data-testid="text-brand-name">VERICASE</span>
            </div>
          </div>
          <Button onClick={onLogin} data-testid="button-signin">
            <Lock className="h-4 w-4 mr-2" />
            Secure Sign In
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="py-16 px-6 flex-shrink-0">
          <div className="container mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium mb-8" data-testid="badge-proprietary">
              <Lock className="h-3 w-3" />
              Authorized Access Only
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-2 uppercase" data-testid="text-hero-org">
              Synergy LAW
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-foreground/85" data-testid="text-hero-product">
              VERICASE
            </h2>
            <p className="text-sm text-muted-foreground mb-8 tracking-widest font-medium uppercase" data-testid="text-hero-engine">
              by SynSeekr
            </p>
            
            <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto" data-testid="text-hero-description">
              Your integrated legal practice operating system. Manage matters, secure evidence,
              automate workflows, and leverage AI-powered document and case analysis — all in one
              secure platform.
            </p>
            
            <Button size="lg" onClick={onLogin} data-testid="button-get-started">
              Sign In to Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </section>

        <section className="py-12 px-6 bg-muted/30 flex-1">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <h2 className="text-lg font-semibold mb-1" data-testid="text-capabilities-headline">Platform Capabilities</h2>
              <p className="text-sm text-muted-foreground" data-testid="text-capabilities-description">
                Enterprise-grade tools built for legal professionals
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-capabilities">
              {capabilities.map((cap, index) => (
                <Card key={index} data-testid={`card-capability-${index}`}>
                  <CardContent className="pt-5 pb-4 px-5">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <cap.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1" data-testid={`text-cap-title-${index}`}>{cap.title}</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed" data-testid={`text-cap-desc-${index}`}>{cap.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-4 px-6" data-testid="section-footer">
        <div className="container mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Scale className="h-3 w-3" />
            <span data-testid="text-copyright">Vericase by Synergy LAW</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              <span>AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              <span>HIPAA Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
