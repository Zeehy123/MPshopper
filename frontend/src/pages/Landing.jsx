import {
  ArrowRight,
  Check,
  Leaf,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "../components/MarketingLayout";
import { BasketHero } from "../components/Botanicals";
import { FEATURES, STEPS } from "../marketingContent";

export default function Landing() {
  return (
    <MarketingLayout>
      <main>
          <section className="landing-hero">
            <div className="landing-copy">
              <p className="landing-eyebrow">
                <span aria-hidden="true" /> A little more in control, every trip
              </p>
              <h1>
                Good groceries.
                <br />
                <span>Smarter shopping.</span>
              </h1>
              <p className="landing-intro">
                Keep your grocery list, prices, and spending in one cheerful
                place. Plan your next shop with a little less guesswork.
              </p>
              <div className="landing-actions">
                <Link className="landing-primary" to="/login?mode=register">
                  Create your account <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className="landing-secondary" to="/how-it-works">
                  See how it works
                </Link>
              </div>
              <div className="landing-highlights">
                <span><Check size={16} aria-hidden="true" /> Your own grocery list</span>
                <span><WifiOff size={16} aria-hidden="true" /> Works offline, too</span>
              </div>
            </div>

            <div className="landing-art" aria-label="A preview of your grocery shopper">
              <div className="landing-sun" />
              <div className="landing-basket">
                <BasketHero />
              </div>
              <div className="landing-note landing-note-top">
                <span className="landing-note-icon"><Check size={15} aria-hidden="true" /></span>
                <span><strong>List, meet done.</strong><small>One shop at a time</small></span>
              </div>
              <div className="landing-note landing-note-bottom">
                <span className="landing-note-emoji" aria-hidden="true">🍅</span>
                <span><small>Today's basket</small><strong>Planned with care</strong></span>
                <span className="landing-note-sparkle" aria-hidden="true">✳</span>
              </div>
              <span className="landing-art-caption">A calmer kind of grocery run</span>
            </div>
          </section>

          <section className="landing-features" id="features">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">MADE FOR YOUR EVERYDAY SHOP</p>
              <h2>Small details make a big difference.</h2>
              <p>Everything you need to make grocery shopping feel more manageable.</p>
            </div>
            <div className="landing-feature-grid">
              {FEATURES.map(({ Icon, title, text, tone }) => (
                <article className="landing-feature-card" key={title}>
                  <span className={`landing-feature-icon ${tone}`}>
                    <Icon size={22} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-how" id="how-it-works">
            <div className="landing-how-heading">
              <p className="landing-eyebrow">THREE EASY STEPS</p>
              <h2>From list to lovely.</h2>
              <p>Start simple. Your shopping routine can grow with you.</p>
              <Link className="landing-secondary" to="/how-it-works">
                Explore how it works <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="landing-steps">
              {STEPS.map(({ number, title, text }) => (
                <article className="landing-step" key={number}>
                  <span className="landing-step-number">{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-bottom-cta">
            <div className="landing-cta-leaf" aria-hidden="true"><Leaf size={27} /></div>
            <div>
              <p className="landing-eyebrow">YOUR NEXT SHOP STARTS HERE</p>
              <h2>Ready to make a list?</h2>
              <p>Set up your space and make your next grocery trip your own.</p>
            </div>
            <Link className="landing-primary" to="/login?mode=register">
              Get started <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </section>
      </main>
    </MarketingLayout>
  );
}
