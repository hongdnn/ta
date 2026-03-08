import { Link } from "react-router-dom";
import { GraduationCap, Download, ArrowRight, BarChart3, MessageSquare, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquare,
    title: "Student Questions",
    description: "Surface the most common questions students are asking, ranked by frequency and urgency.",
  },
  {
    icon: BarChart3,
    title: "Assignment Analytics",
    description: "See which assignments generate the most confusion and drill into specific question threads.",
  },
  {
    icon: Lightbulb,
    title: "Lesson Improvements",
    description: "Get AI-powered suggestions on how to improve your lectures based on real student feedback.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Lecture Lens</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#download">Download</a>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">
                Log in
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 text-sm text-muted-foreground mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Built for professors &amp; instructors
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight max-w-3xl mx-auto">
          Understand what your
          <span className="text-primary"> students struggle with</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Lecture Lens analyzes student questions in real-time, surfaces learning gaps,
          and gives you actionable suggestions to improve your teaching — all in one dashboard.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Button size="lg" asChild>
            <Link to="/login">
              Open Dashboard
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#download">
              <Download className="h-4 w-4 mr-1" />
              Get Desktop App
            </a>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-semibold text-center mb-12">
          Everything you need to close learning gaps
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Download */}
      <section id="download" className="max-w-6xl mx-auto px-6 py-20">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Download className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Download the Desktop App</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            The TA desktop app captures lectures, processes student questions in real-time,
            and syncs data to this dashboard automatically.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button size="lg">
              <Download className="h-4 w-4 mr-2" />
              Download for macOS
            </Button>
            <Button size="lg" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download for Windows
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Requires macOS 12+ or Windows 10+. Free for educational use.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 Lecture Lens. All rights reserved.</span>
          <Link to="/login" className="hover:text-foreground transition-colors">
            Professor Login →
          </Link>
        </div>
      </footer>
    </div>
  );
}
