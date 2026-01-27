import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Shield,
  FileText,
  BarChart3,
  Users,
  Clock,
  Zap
} from "lucide-react";

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const features = [
    {
      icon: FileText,
      title: "Matter Management",
      description: "Organize cases, track deadlines, and manage client relationships in one place."
    },
    {
      icon: Shield,
      title: "Evidence Vault",
      description: "Secure, immutable storage with complete chain-of-custody tracking."
    },
    {
      icon: Sparkles,
      title: "AI-Powered Analysis",
      description: "Leverage Claude and GPT to analyze documents and accelerate research."
    },
    {
      icon: BarChart3,
      title: "Visual Boards",
      description: "Monday.com-style boards to track cases, tasks, and project progress."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Role-based access control and team assignment for seamless coordination."
    },
    {
      icon: Zap,
      title: "Workflow Automation",
      description: "Automate repetitive tasks with customizable triggers and actions."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg">VERICASE</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">Legal Practice OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" data-testid="link-features">
              Features
            </Button>
            <Button onClick={onLogin} data-testid="button-signin">
              Sign In
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Powered by GPT-5 & Claude AI
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              The Complete Operating System for{" "}
              <span className="text-primary">Modern Law Firms</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Manage matters, track evidence, automate workflows, and leverage AI for 
              document analysis. Everything your practice needs in one powerful platform — 
              completely free.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
              <Button size="lg" onClick={onLogin} data-testid="button-get-started">
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                Learn More
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                All features included
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Bank-level security
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Everything You Need to Run Your Practice</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Purpose-built tools for legal professionals, from solo practitioners to large firms.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate">
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Practice?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of legal professionals who trust VERICASE to manage their cases efficiently.
            </p>
            <Button size="lg" onClick={onLogin} data-testid="button-get-started-bottom">
              Get Started Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2026 VERICASE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
