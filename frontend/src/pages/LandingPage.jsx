import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Gauge,
  LineChart,
  LockKeyhole,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import "../landing.css";

const steps = [
  ["01", "Configure", "Set the product type, underlying, tenor and key terms.", Gauge],
  ["02", "Simulate", "Visualize payoff behavior across market scenarios and historical data.", LineChart],
  ["03", "Assess Suitability", "Compare the product against risk profile, horizon and loss tolerance.", ShieldCheck],
  ["04", "Explain", "Turn complex results into clear RM and client-friendly insights.", Sparkles],
];

const capabilities = [
  ["Real Market Data", "Access live and historical market data across global assets.", BarChart3],
  ["Scenario Analysis", "Model multiple market scenarios and stress cases.", LineChart],
  ["Product Discovery", "Explore structured products aligned to client objectives.", Target],
  ["AI Explanation Assistant", "Turn verified results into clear client conversations.", Sparkles],
  ["Client-ready Reports", "Generate professional reports with scenarios and risk context.", FileText],
];

function ProductPreview() {
  return (
    <div className="landing-preview-wrap" aria-label="AstraForge product analysis preview">
      <div className="landing-preview-glow" />
      <div className="landing-preview">
        <div className="preview-topbar">
          <img src="/astraforge-logo.png" alt="" />
          <span>Structured Product Analysis</span>
          <span className="preview-avatar">RM</span>
        </div>
        <div className="preview-body">
          <aside className="preview-nav">
            <span className="preview-nav-active">Overview</span>
            <span>Product Builder</span>
            <span>Market Scenarios</span>
            <span>Suitability</span>
            <span>Reports</span>
          </aside>
          <div className="preview-content">
            <div className="preview-heading">
              <div>
                <small>STRUCTURED PRODUCT ANALYSIS</small>
                <h3>Equity-Linked Note</h3>
              </div>
              <button>Generate report <ArrowRight size={12} /></button>
            </div>
            <div className="preview-fields">
              <span><small>Underlying</small><strong>NIFTY 50</strong></span>
              <span><small>Tenor</small><strong>3 Years</strong></span>
              <span><small>Coupon</small><strong>8.0% p.a.</strong></span>
            </div>
            <div className="preview-grid">
              <div className="preview-chart-card">
                <div className="preview-card-title">Payoff diagram <span>Illustrative</span></div>
                <svg viewBox="0 0 420 170" role="img" aria-label="Illustrative structured product payoff chart">
                  <defs>
                    <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#14b8a6" stopOpacity=".28" />
                      <stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M28 144H400M28 108H400M28 72H400M28 36H400" stroke="#dce7e7" />
                  <path d="M28 138L108 110L184 111L265 62L400 46L400 160L28 160Z" fill="url(#chart-fill)" />
                  <path d="M28 138L108 110L184 111L265 62L400 46" fill="none" stroke="#0f766e" strokeWidth="4" />
                  <path d="M28 148L400 22" fill="none" stroke="#8da8ae" strokeDasharray="5 5" strokeWidth="2" />
                  <circle cx="265" cy="62" r="5" fill="#06b6d4" />
                </svg>
                <div className="preview-legend"><span><i className="legend-product" />Structured product</span><span><i className="legend-underlying" />Underlying</span></div>
              </div>
              <div className="preview-suitability">
                <div className="preview-card-title">Client suitability</div>
                <div className="preview-score"><strong>87</strong><span>Potential fit</span></div>
                {["Risk profile", "Investment horizon", "Loss tolerance"].map((item) => <span className="preview-check" key={item}><Check size={12} />{item}</span>)}
              </div>
            </div>
            <div className="preview-ai"><Sparkles size={18} /><span><strong>AI explanation assistant</strong>AstraForge explains verified simulation and suitability results in client-friendly language.</span><ChevronRight size={16} /></div>
          </div>
        </div>
      </div>
      <div className="preview-float preview-float-one"><Check size={14} /><span>Suitability checked</span></div>
      <div className="preview-float preview-float-two"><CircleDollarSign size={14} /><span>8.0% coupon</span></div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const revealRef = useRef(null);

  useEffect(() => {
    const elements = document.querySelectorAll(".landing-reveal");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page" ref={revealRef}>
      <header className={`landing-header ${menuOpen ? "menu-open" : ""}`}>
        <Link className="landing-brand" to="/" onClick={() => setMenuOpen(false)}>
          <img src="/astraforge-logo.png" alt="AstraForge" />
        </Link>
        <button className="landing-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className="landing-nav" aria-label="Public navigation">
          <a href="#capabilities" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#products" onClick={() => setMenuOpen(false)}>Products</a>
          <a href="#insights" onClick={() => setMenuOpen(false)}>AI Insights</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <div className="landing-nav-actions">
            <Link className="landing-btn landing-btn-outline" to="/login">Login</Link>
            <Link className="landing-btn landing-btn-primary" to="/signup">Get Started <ArrowRight size={15} /></Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="landing-hero landing-container">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><span />FOR RELATIONSHIP MANAGERS</div>
            <h1>Structured Investments,<br /><em>Made Clear.</em></h1>
            <p>AstraForge helps Relationship Managers configure structured products, simulate market scenarios, assess client suitability and explain outcomes with confidence.</p>
            <div className="landing-hero-actions">
              <Link className="landing-btn landing-btn-primary landing-btn-large" to="/signup">Explore AstraForge <ArrowRight size={17} /></Link>
              <a className="landing-btn landing-btn-outline landing-btn-large" href="#how-it-works"><Play size={15} fill="currentColor" /> Watch How It Works</a>
            </div>
            <div className="landing-trust-list">
              <span><ShieldCheck size={16} /> Deterministic payoff modelling</span>
              <span><Target size={16} /> Suitability-aware analysis</span>
              <span><UsersRound size={16} /> Clearer client conversations</span>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section className="landing-section landing-container landing-reveal" id="how-it-works">
          <div className="landing-section-heading">
            <div className="landing-eyebrow">HOW IT WORKS</div>
            <h2>From product configuration to client conversation, in four simple steps.</h2>
          </div>
          <div className="landing-steps">
            {steps.map(([number, title, description, Icon], index) => (
              <div className="landing-step" key={title}>
                <div className="landing-step-number">{number}</div><Icon size={20} />
                <h3>{title}</h3><p>{description}</p>
                {index < steps.length - 1 && <ChevronRight className="landing-step-arrow" size={20} />}
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-container landing-reveal" id="capabilities">
          <div className="landing-section-heading">
            <div className="landing-eyebrow">BUILT FOR THE ADVISORY DESK</div>
            <h2>Powerful capabilities for modern Relationship Managers.</h2>
            <p>Everything you need to design, analyse and communicate structured investment solutions.</p>
          </div>
          <div className="landing-capabilities">
            {capabilities.map(([title, description, Icon]) => (
              <article className="landing-capability" key={title}>
                <div className="landing-icon-box"><Icon size={20} /></div><h3>{title}</h3><p>{description}</p><ChevronRight size={16} />
              </article>
            ))}
          </div>
        </section>

        <section className="landing-product-strip landing-container landing-reveal" id="products">
          <div><div className="landing-eyebrow">STRUCTURED PRODUCT COVERAGE</div><h2>One workspace for the products you advise.</h2><p>Build and compare Equity-Linked Notes, Dual Currency Deposits and Capital-Protected Notes without switching tools.</p></div>
          <div className="landing-product-pills"><span>ELN <small>Equity-Linked Note</small></span><span>DCD <small>Dual Currency Deposit</small></span><span>CPN <small>Capital-Protected Note</small></span></div>
        </section>

        <section className="landing-confidence landing-container landing-reveal" id="insights">
          <div className="landing-confidence-copy"><div className="landing-eyebrow">TRUSTED ADVISORY WORKFLOWS</div><h2>Greater clarity.<br /><span>Stronger client relationships.</span></h2><p>Spend less time assembling analysis and more time having meaningful conversations with your clients.</p></div>
          <div className="landing-confidence-items"><span><LockKeyhole size={21} /><strong>Clarity in complexity</strong><small>Make structured products easier to understand.</small></span><span><BarChart3 size={21} /><strong>Better risk awareness</strong><small>Visualise potential outcomes across market conditions.</small></span><span><UsersRound size={21} /><strong>More productive conversations</strong><small>Bring clear, client-ready context to every meeting.</small></span></div>
        </section>

        <section className="landing-final-cta landing-container landing-reveal" id="about">
          <div><div className="landing-eyebrow">READY TO TRANSFORM YOUR CLIENT CONVERSATIONS?</div><h2>Get started with AstraForge today.</h2><p>Join leading Relationship Managers using AstraForge to deliver clearer, smarter and more structured investment conversations.</p></div>
          <div className="landing-final-actions"><Link className="landing-btn landing-btn-primary" to="/signup">Get Started <ArrowRight size={15} /></Link><Link className="landing-btn landing-btn-outline" to="/login">Login</Link><small>No credit card required. Set up in minutes.</small></div>
        </section>
      </main>

      <footer className="landing-footer landing-container">
        <Link className="landing-brand" to="/"><img src="/astraforge-logo.png" alt="AstraForge" /></Link>
        <nav><a href="#capabilities">Features</a><a href="#how-it-works">How It Works</a><a href="#products">Products</a><a href="#insights">Insights</a><a href="#about">About</a></nav>
        <span>Illustrative analysis · Not investment advice</span>
      </footer>
    </div>
  );
}
