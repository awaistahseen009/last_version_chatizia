import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bot, 
  FileText, 
  Settings,
  Shield, 
  Mic,
  Zap,
  BarChart3,
  ArrowRight,
  Play,
  Star,
  Check,
  Menu,
  X,
  Headphones,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Users,
  Pause,
  Trash2
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // GSAP Animations
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).gsap && (window as any).ScrollTrigger) {
      (window as any).gsap.registerPlugin((window as any).ScrollTrigger);

      if (heroRef.current) {
        (window as any).gsap.from(heroRef.current, {
          opacity: 0,
          y: 100,
          duration: 1.5,
          ease: 'power3.out',
        });
      }

      sectionsRef.current.forEach((ref, index) => {
        if (ref) {
          (window as any).gsap.from(ref, {
            opacity: 0,
            y: 50,
            duration: 1,
            delay: index * 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: ref,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          });
        }
      });

      (window as any).gsap.utils.toArray('.animate-section').forEach((section: HTMLElement) => {
        (window as any).gsap.from(section, {
          opacity: 0,
          y: 50,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });
      });
    }
  }, []);

  const features = [
    { 
      icon: Bot, 
      title: 'AI-Powered Intelligence', 
      description: 'Advanced neural networks that understand context and deliver human-like responses with enterprise-grade accuracy.',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      icon: FileText, 
      title: 'Document Processing', 
      description: 'Upload and manage knowledge base documents. Your chatbot learns from PDFs, docs, and text files.',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      icon: Settings, 
      title: 'Complete Customization', 
      description: 'Tailor every aspect to match your brand identity with our fully configurable interface.',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      icon: Shield, 
      title: 'Domain Security', 
      description: 'Advanced domain restrictions and enhanced security controls to protect your chatbot.',
      color: 'from-red-500 to-orange-500'
    },
    { 
      icon: Mic, 
      title: 'Voice Integration', 
      description: 'Crystal-clear voice interactions with real-time speech processing and voice messages.',
      color: 'from-indigo-500 to-purple-500'
    },
    { 
      icon: ImageIcon, 
      title: 'Image Recognition', 
      description: 'Upload images to your chatbot and get intelligent responses based on visual content.',
      color: 'from-yellow-500 to-orange-500'
    },
  ];

  const capabilities = [
    {
      title: "Easy Dashboard Management",
      description: "Intuitive dashboard to manage all your chatbots from one central location with real-time monitoring.",
      image: "https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/dashboard.PNG",
      features: ["Real-time monitoring", "Multi-chatbot management", "Performance insights"]
    },
    {
      title: "Ready-to-Use Templates",
      description: "Choose from professionally designed templates that can be deployed instantly for various industries.",
      image: "https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/easy%20to%20go%20templates.PNG",
      features: ["Industry-specific templates", "Instant deployment", "Customizable designs"]
    },
    {
      title: "Full Configuration Control",
      description: "Configure every aspect of your chatbot's behavior, appearance, and responses with granular controls.",
      image: "https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/Fully%20configurable.PNG",
      features: ["Granular settings", "Behavior customization", "Response tuning"]
    },
    {
      title: "Voice & Image Support",
      description: "Enable voice messages and image uploads for richer, more interactive conversations with your users.",
      image: "https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/Voice%20-1.PNG",
      features: ["Voice messages", "Image recognition", "Rich media support"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
        <div 
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl transition-all duration-1000 ease-out"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        ></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/20 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Chatizia Pro
            </span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="hover:text-blue-400 transition-all duration-300 relative group">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#demo" className="hover:text-blue-400 transition-all duration-300 relative group">
              Demo
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#analytics" className="hover:text-blue-400 transition-all duration-300 relative group">
              Analytics
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <Link to="/signin" className="text-white/80 hover:text-white transition-colors">Sign In</Link>
            <Link to="/signup" className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-b border-white/10">
            <div className="px-6 py-4 space-y-4">
              <a href="#features" className="block hover:text-blue-400 transition-colors">Features</a>
              <a href="#demo" className="block hover:text-blue-400 transition-colors">Demo</a>
              <a href="#analytics" className="block hover:text-blue-400 transition-colors">Analytics</a>
              <Link to="/signin" className="block text-white/80 hover:text-white transition-colors">Sign In</Link>
              <Link to="/signup" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center pt-20 z-10">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6 animate-pulse">
              <Star className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-sm text-blue-300">Enterprise SaaS Platform</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Unleash the
              </span>
              <br />
              <span className="text-white">
                power of
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                intelligent chatbots
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Build AI-powered chatbots with voice support, image recognition, and document processing. 
              Complete multi-user SaaS platform with enterprise security.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link 
                to="/signup" 
                className="group bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="group bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center">
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </button>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <div className="bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2 text-sm">
                🎤 Voice Messages
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2 text-sm">
                🖼️ Image Recognition
              </div>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2 text-sm">
                📄 Document Processing
              </div>
              <div className="bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-2 text-sm">
                🔒 Enterprise Security
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-4xl mx-auto">
            <div className="relative z-10 transform hover:scale-105 transition-all duration-500">
              <img 
                src="https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/Chatbots.PNG" 
                alt="ChatBot Interface" 
                className="w-full h-auto rounded-2xl shadow-2xl shadow-blue-500/20 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-2xl"></div>
            </div>
            <div className="absolute -top-4 -left-4 bg-green-500/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-semibold shadow-lg animate-bounce">
              ✨ AI Powered
            </div>
            <div className="absolute -bottom-4 -right-4 bg-purple-500/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-semibold shadow-lg animate-pulse">
              🚀 Multi-User SaaS
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need to create exceptional chatbot experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                ref={el => sectionsRef.current[index] = el}
                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Showcase */}
      <section className="relative py-20 z-10 animate-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                Platform Capabilities
              </span>
            </h2>
          </div>

          <div className="space-y-20">
            {capabilities.map((capability, index) => (
              <div 
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <div className="relative group">
                    <img 
                      src={capability.image}
                      alt={capability.title}
                      className="w-full h-auto rounded-2xl shadow-2xl shadow-blue-500/20 group-hover:shadow-purple-500/30 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-2xl group-hover:from-purple-500/20 group-hover:to-pink-500/20 transition-all duration-500"></div>
                  </div>
                </div>
                
                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <h3 className="text-3xl lg:text-4xl font-bold text-white">
                    {capability.title}
                  </h3>
                  <p className="text-xl text-gray-300 leading-relaxed">
                    {capability.description}
                  </p>
                  <div className="space-y-3">
                    {capability.features.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="text-white">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="relative py-20 z-10 animate-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Live Demo Experience
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Test your chatbot in real-time with our side-by-side demo interface
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative group">
              <img 
                src="https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/Live%20Side%20by%20side%20demo.PNG" 
                alt="Live Demo" 
                className="w-full h-auto rounded-2xl shadow-2xl shadow-purple-500/20 group-hover:shadow-pink-500/30 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-2xl"></div>
            </div>
            
            <div className="space-y-8">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                <h3 className="text-2xl font-bold mb-4 text-white">Real-Time Testing</h3>
                <p className="text-gray-300 mb-4">
                  Test your chatbot live with our dual-view interface. See exactly how your bot responds to user queries instantly.
                </p>
                <div className="flex items-center space-x-2">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-400">Live preview & testing</span>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                <h3 className="text-2xl font-bold mb-4 text-white">Easy Management</h3>
                <p className="text-gray-300 mb-4">
                  Pause, resume, or delete chatbots with simple controls. Full management at your fingertips.
                </p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Pause className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400">Pause/Resume</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Easy Delete</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                <h3 className="text-2xl font-bold mb-4 text-white">On-the-Fly Updates</h3>
                <p className="text-gray-300 mb-4">
                  Make real-time changes to your chatbot without any downtime or deployment delays.
                </p>
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-purple-400">Instant updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voice & Security Features */}
      <section className="relative py-20 z-10 animate-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Voice Features */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                    Voice Integration
                  </span>
                </h2>
                <p className="text-xl text-gray-300">
                  Enable rich voice conversations with real-time speech processing and voice message support.
                </p>
              </div>

              <div className="relative group">
                <img 
                  src="https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/voice%20-2.PNG" 
                  alt="Voice Integration" 
                  className="w-full h-auto rounded-2xl shadow-2xl shadow-green-500/20 group-hover:shadow-cyan-500/30 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 to-cyan-500/20 rounded-2xl"></div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-white">Real-time voice processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
                    <Mic className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-white">Voice message support</span>
                </div>
              </div>
            </div>

            {/* Security Features */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    Enterprise Security
                  </span>
                </h2>
                <p className="text-xl text-gray-300">
                  Advanced domain restrictions and security controls to protect your chatbot deployment.
                </p>
              </div>

              <div className="relative group">
                <img 
                  src="https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/enhanced%20domain%20security.PNG" 
                  alt="Domain Security" 
                  className="w-full h-auto rounded-2xl shadow-2xl shadow-red-500/20 group-hover:shadow-orange-500/30 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 to-orange-500/20 rounded-2xl"></div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Lock className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-white">Domain restrictions</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-white">Enhanced security controls</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section id="analytics" className="relative py-20 z-10 animate-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Complete Analytics
                  </span>
                </h2>
                <p className="text-xl text-gray-300">
                  Get comprehensive insights into your chatbot's performance with detailed analytics and reporting.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-white">Real-time conversation tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-white">User engagement metrics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-white">Performance analytics</span>
                </div>
              </div>
            </div>

            <div className="relative group">
              <img 
                src="https://jllducetdexpbblrrkdi.supabase.co/storage/v1/object/public/chatbot-logos/project/Complete%20Analytics.PNG" 
                alt="Analytics Dashboard" 
                className="w-full h-auto rounded-2xl shadow-2xl shadow-green-500/20 group-hover:shadow-blue-500/30 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 to-blue-500/20 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 z-10 animate-section">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/10 rounded-3xl p-12">
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Ready to Transform Your Business?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Build intelligent chatbots with voice, image recognition, and enterprise-grade security. Start today with our SaaS platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="group bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 rounded-full font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="bg-white/10 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition-all duration-300">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-black/20 backdrop-blur-sm border-t border-white/10 py-12 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 lg:mb-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Chatizia Pro
              </span>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-end gap-8 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-gray-400">
            <p>© 2025 Chatizia Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;