import { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  EyeOff, 
  Upload, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Github, 
  Mail,
  ExternalLink,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants ---
const TAB_DESCRIPTIONS: Record<number, string> = {
  1: "FULL IMAGE ANALYSIS & PROMPT GENERATION",
  2: "DIRECTIONAL & CINEMATOGRAPHIC ANALYSIS",
  3: "VISUAL STYLE DNA & ARTISTIC FINGERPRINT",
  4: "TYPOGRAPHY & GRAPHIC DESIGN ANALYSIS"
};

const SYSTEM_PROMPTS: Record<number, string> = {
  1: "You are an expert AI image generation prompt engineer. Analyze this image in extreme detail and return ONLY a valid JSON object with these exact keys: subject, composition, lighting, colors, textures, mood, style, camera_angle, background, quality_tags. No explanation, no markdown, only raw JSON.",
  2: "You are a creative director and cinematographer. Analyze the directional and compositional choices in this image and return ONLY a valid JSON object with these exact keys: primary_concept, narrative, scene_type, subject_focus, spatial_layout, depth_of_field, movement_feeling, emotional_tone, symbolic_elements. No explanation, no markdown, only raw JSON.",
  3: "You are an art historian and visual style analyst. Extract the complete visual style fingerprint of this image and return ONLY a valid JSON object with these exact keys: art_movement, rendering_style, color_palette_name, texture_quality, line_work, material_properties, era_influence, technical_approach, unique_identifiers. No explanation, no markdown, only raw JSON.",
  4: "You are an expert typographer and graphic designer. Analyze all typography and text elements visible in this image and return ONLY a valid JSON object with these exact keys: font_style, font_weight, font_category, letter_spacing, text_alignment, text_color, text_effects, hierarchy_structure, layout_relationship, typographic_mood. If no text is visible, return recommended typography that suits this image style. No explanation, no markdown, only raw JSON."
};

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'error';
}

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [output, setOutput] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isCopying, setIsCopying] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Load API Key
  useEffect(() => {
    const saved = sessionStorage.getItem('gemini_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    sessionStorage.setItem('gemini_api_key', val);
  };

  const addToast = (message: string, type: 'info' | 'error' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast("Please upload a valid image file", "error");
      return;
    }
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setImage(base64);
        analyzeImage(base64.split(',')[1]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Data?: string) => {
    const dataToSend = base64Data || image?.split(',')[1];
    if (!apiKey) {
      addToast("Please enter your API key first", "error");
      return;
    }
    if (!dataToSend) {
      addToast("Please upload an image first", "error");
      return;
    }

    setIsAnalyzing(true);
    setOutput('');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SYSTEM_PROMPTS[activeTab] },
              { inline_data: { mime_type: "image/jpeg", data: dataToSend } }
            ]
          }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "API Error");

      const rawText = data.candidates[0].content.parts[0].text;
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      }

      try {
        const parsed = JSON.parse(cleanJson);
        typewriterEffect(JSON.stringify(parsed, null, 4));
      } catch {
        typewriterEffect(rawText);
      }
    } catch (err: any) {
      addToast(err.message, "error");
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const typewriterEffect = (text: string) => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setOutput(text.substring(0, i + 1));
        i++;
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      } else {
        clearInterval(interval);
      }
    }, 5);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 1500);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `croqodil_analysis_tab${activeTab}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlightJSON = (text: string) => {
    return text.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'text-[#8B9467]'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-[#C9A84C]'; // key
        } else {
          cls = 'text-[#E8C96B]'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-gray-500'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-gray-500'; // null
      }
      return `<span class="${cls}">${match}</span>`;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] font-sans selection:bg-[#C9A84C] selection:text-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-[#1A1A1A] py-8 px-4 flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-16 h-16 bg-[#111111] rounded-2xl border border-[#1A1A1A] flex items-center justify-center p-2 relative group"
          >
            {/* Minimalist Alligator Icon */}
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-[#F5F5F0] drop-shadow-[0_0_8px_rgba(201,168,76,0.3)]" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 12c0-2 2-3 4-3s4 1 6 1 4-1 6-1 4 1 4 3-2 3-4 3-4-1-6-1-4 1-6 1-4-1-4-3z" />
              <path d="M6 9c0-1 1-2 2-2s2 1 2 2" />
              <path d="M14 9c0-1 1-2 2-2s2 1 2 2" />
              {/* Sunglasses */}
              <rect x="7" y="10" width="4" height="2" rx="0.5" fill="black" stroke="#C9A84C" strokeWidth="0.5" />
              <rect x="13" y="10" width="4" height="2" rx="0.5" fill="black" stroke="#C9A84C" strokeWidth="0.5" />
              <line x1="11" y1="11" x2="13" y2="11" stroke="#C9A84C" strokeWidth="0.5" />
              {/* Chain */}
              <path d="M9 15c0 1 1 2 3 2s3-1 3-2" stroke="#C9A84C" strokeWidth="1" strokeDasharray="1 1" />
            </svg>
            <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl" />
          </motion.div>
          <div className="flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-cinzel text-3xl font-bold tracking-[4px] bg-gold-gradient bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer"
            >
              CROQODIL
            </motion.div>
            <div className="text-[0.65rem] uppercase tracking-[3px] text-[#666660] -mt-1">
              image-to-prompt
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-8 flex flex-col gap-8">
        {/* API Key Bar */}
        <section className="flex flex-col gap-2">
          <div className="relative flex items-center">
            <input 
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className={`w-full bg-[#111111] border border-[#1A1A1A] rounded-full py-3 px-6 pr-14 text-[#F5F5F0] focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C]/20 transition-all ${apiKey ? 'border-[#4CAF50]' : ''}`}
              placeholder="Enter your free Google AI Studio API key"
            />
            <button 
              onClick={() => setShowKey(!showKey)}
              className="absolute right-5 text-[#666660] hover:text-[#C9A84C] transition-colors"
            >
              {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div className="flex justify-between items-center px-4">
            <button 
              onClick={() => setShowGuide(true)}
              className="text-[0.7rem] text-[#666660] hover:text-[#C9A84C] flex items-center gap-1 transition-colors uppercase tracking-wider font-bold"
            >
              <FileText size={12} /> Deployment Guide
            </button>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-[0.75rem] text-[#666660] hover:text-[#C9A84C] transition-colors">
              Get free API key →
            </a>
          </div>
        </section>

        {/* Upload Zone */}
        <motion.section 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full min-h-[300px] border-2 border-dashed border-[#1A1A1A] rounded-2xl flex flex-col justify-center items-center gap-4 cursor-pointer bg-[#111111] hover:border-[#C9A84C] hover:shadow-[0_0_30px_rgba(201,168,76,0.15)] transition-all relative overflow-hidden"
        >
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          
          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="text-[#C9A84C]">
                  <Upload size={48} strokeWidth={1.5} />
                </div>
                <div className="font-medium text-center">Drop your image here or click to upload</div>
                <div className="text-[0.7rem] text-[#666660] tracking-widest uppercase">PNG · JPG · WEBP · GIF</div>
              </motion.div>
            ) : (
              <motion.img 
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={image} 
                className="absolute inset-0 w-full h-full object-contain bg-[#0A0A0A]" 
                alt="Preview" 
              />
            )}
          </AnimatePresence>
        </motion.section>

        {/* Analysis Tabs */}
        {image && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="bg-[#111111] p-1.5 rounded-full border border-[#1A1A1A] flex gap-1">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    setActiveTab(num);
                    analyzeImage();
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-full font-semibold text-[0.85rem] transition-all ${activeTab === num ? 'bg-gold-gradient text-[#0A0A0A] shadow-lg shadow-[#8B6914]/30' : 'text-[#666660] hover:text-[#F5F5F0]'}`}
                >
                  {num === 1 ? 'Full Image' : num === 2 ? 'Direction' : num === 3 ? 'DNA Style' : 'TYPO'}
                </button>
              ))}
            </div>
            <div className="text-[0.65rem] uppercase tracking-[2px] text-[#C9A84C] text-center font-bold">
              {TAB_DESCRIPTIONS[activeTab]}
            </div>
          </motion.section>
        )}

        {/* Output Panel */}
        {image && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl overflow-hidden flex flex-col"
          >
            <div className="bg-[#151515] py-3 px-5 flex justify-between items-center border-b border-[#1A1A1A]">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="font-mono text-[0.75rem] text-[#666660]">output.json</div>
              </div>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 py-1 px-3 rounded-md text-[0.75rem] font-semibold border transition-all ${isCopying ? 'bg-[#4CAF50] border-[#4CAF50] text-white' : 'border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#0A0A0A]'}`}
              >
                {isCopying ? <Check size={14} /> : <Copy size={14} />}
                {isCopying ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            
            <div className="relative min-h-[300px] max-h-[600px] overflow-y-auto p-8 font-mono text-[0.9rem] leading-relaxed">
              <div ref={outputRef} dangerouslySetInnerHTML={{ __html: highlightJSON(output) }} />
              
              {isAnalyzing && (
                <div className="absolute inset-0 bg-[#0D0D0D]/90 flex flex-col justify-center items-center gap-4 z-10">
                  <div className="w-10 h-10 border-4 border-[#C9A84C]/10 border-t-[#C9A84C] rounded-full animate-spin" />
                  <div className="text-[#C9A84C] font-semibold">Analyzing with Gemini...</div>
                </div>
              )}
            </div>

            <div className="bg-[#151515] py-3 px-5 flex justify-between border-t border-[#1A1A1A]">
              <button 
                onClick={() => analyzeImage()}
                className="flex items-center gap-2 text-[0.75rem] text-[#666660] hover:text-[#C9A84C] transition-colors"
              >
                <RefreshCw size={14} /> Re-Analyze
              </button>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 text-[0.75rem] text-[#666660] hover:text-[#C9A84C] transition-colors"
              >
                Download .json <Download size={14} />
              </button>
            </div>
          </motion.section>
        )}
      </main>

      {/* Footer */}
      <footer className="py-16 px-6 flex flex-col items-center gap-8">
        <div className="flex gap-6 items-center">
          {[
            { icon: <Facebook />, href: "https://www.facebook.com/CROQODIL1?locale=ar_AR", title: "Facebook" },
            { icon: <Instagram />, href: "https://www.instagram.com/croqodil1/", title: "Instagram" },
            { icon: <Linkedin />, href: "https://www.linkedin.com/in/croqodil1/", title: "LinkedIn" },
            { icon: <Github />, href: "https://github.com/omar-croqodil", title: "GitHub" },
            { icon: <Mail />, href: "mailto:omar.croqodil@gmail.com", title: "Email" }
          ].map((social, i) => (
            <motion.a
              key={i}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              title={social.title}
              whileHover={{ y: -3, color: '#C9A84C' }}
              className="text-[#666660] transition-colors"
            >
              {social.icon}
            </motion.a>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-[#111111] py-1.5 px-4 rounded-full border border-[#1A1A1A] text-[0.75rem] text-[#C9A84C] font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] shadow-[0_0_8px_#C9A84C] animate-pulse" />
          Powered by Gemini
        </div>
      </footer>

      {/* Toasts */}
      <div className="fixed bottom-8 right-8 z-[1000] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`bg-[#111111] border-l-4 py-3 px-6 rounded-lg shadow-2xl min-w-[250px] flex justify-between items-center ${toast.type === 'error' ? 'border-[#FF4444]' : 'border-[#C9A84C]'}`}
            >
              <span className="text-[0.85rem] font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Deployment Guide Modal */}
      <AnimatePresence>
        {showGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-[#0A0A0A]/95 backdrop-blur-md overflow-y-auto p-6 md:p-12"
          >
            <div className="max-w-[800px] mx-auto bg-[#111111] border border-[#1A1A1A] rounded-2xl p-8 md:p-12 shadow-2xl relative">
              <button 
                onClick={() => setShowGuide(false)}
                className="absolute top-6 right-6 text-[#666660] hover:text-[#F5F5F0]"
              >
                <Check size={24} />
              </button>
              
              <div id="printable-guide">
                <h1 className="text-4xl font-cinzel font-bold text-[#C9A84C] mb-2">DEPLOYMENT GUIDE</h1>
                <p className="text-[#666660] mb-8 uppercase tracking-widest text-sm">Croqodil Image-to-Prompt • April 1, 2026</p>
                
                <div className="space-y-8 text-[#F5F5F0]/90">
                  <section>
                    <h2 className="text-xl font-bold text-[#C9A84C] border-b border-[#1A1A1A] pb-2 mb-4">1. PROJECT STRUCTURE</h2>
                    <pre className="bg-[#0A0A0A] p-4 rounded-lg font-mono text-sm text-[#666660]">
{`├── src/
│   ├── App.tsx (Core Logic)
│   ├── index.css (Global Styles)
│   └── main.tsx (Entry Point)
├── package.json (Dependencies)
├── vite.config.ts (Build Config)
└── .env.example (API Key Template)`}
                    </pre>
                  </section>

                  <section>
                    <h2 className="text-xl font-bold text-[#C9A84C] border-b border-[#1A1A1A] pb-2 mb-4">2. ENVIRONMENT VARIABLES</h2>
                    <p className="mb-4">The tool requires one critical secret to function:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Variable Name:</strong> <code className="bg-[#0A0A0A] px-2 py-1 rounded text-[#E8C96B]">GEMINI_API_KEY</code></li>
                      <li><strong>Local Setup:</strong> Create a file named <code className="bg-[#0A0A0A] px-2 py-1 rounded text-[#E8C96B]">.env</code> and add: <br/> <code className="text-[#666660]">GEMINI_API_KEY=your_key_here</code></li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-bold text-[#C9A84C] border-b border-[#1A1A1A] pb-2 mb-4">3. GITHUB UPLOAD</h2>
                    <pre className="bg-[#0A0A0A] p-4 rounded-lg font-mono text-sm text-[#666660]">
{`git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main`}
                    </pre>
                  </section>

                  <section>
                    <h2 className="text-xl font-bold text-[#C9A84C] border-b border-[#1A1A1A] pb-2 mb-4">4. VERCEL DEPLOYMENT</h2>
                    <ol className="list-decimal pl-6 space-y-2">
                      <li>Import your repo into Vercel.</li>
                      <li>Framework: <strong>Vite</strong>.</li>
                      <li>Add <code className="text-[#C9A84C]">GEMINI_API_KEY</code> in Environment Variables.</li>
                      <li>Click <strong>Deploy</strong>.</li>
                    </ol>
                  </section>
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <button 
                  onClick={() => window.print()}
                  className="bg-gold-gradient text-[#0A0A0A] px-8 py-3 rounded-full font-bold flex items-center gap-2"
                >
                  <Download size={18} /> Print to PDF
                </button>
                <button 
                  onClick={() => setShowGuide(false)}
                  className="border border-[#1A1A1A] text-[#666660] px-8 py-3 rounded-full font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
