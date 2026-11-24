import { ArrowRight, Check, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "../components/MarketingLayout";
import { FEATURES } from "../marketingContent";

const PERKS = [
  "Keep products organized with your own categories",
  "Set a trip budget and see your running total",
  "Use your grocery list offline and sync when connected",
];

export default function Features() {
  return (
    <MarketingLayout>
      <main className="marketing-page">
        <section className="marketing-intro">
          <p className="landing-eyebrow">A SHOPPING SIDEKICK THAT GETS IT</p>
          <h1>Thoughtful tools for your everyday grocery shop.</h1>
          <p>
            Keep the useful details close: what you buy, what it costs, and how
            each trip adds up.
          </p>
        </section>

        <section className="marketing-feature-grid" aria-label="App features">
          {FEATURES.map(({ Icon, title, text, tone }) => (
            <article className="landing-feature-card" key={title}>
              <span className={`landing-feature-icon ${tone}`}>
                <Icon size={22} strokeWidth={2} aria-hidden="true" />
              </span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="marketing-extra">
          <div className="marketing-extra-icon"><WifiOff size={25} aria-hidden="true" /></div>
          <div>
            <p className="landing-eyebrow">MADE FOR REAL LIFE</p>
            <h2>Your list goes where you go.</h2>
            <p>
              No signal in the market? Keep using your saved products and cart.
              Your changes sync when you’re back online.
            </p>
          </div>
          <ul>
            {PERKS.map((perk) => (
              <li key={perk}><Check size={17} aria-hidden="true" />{perk}</li>
            ))}
          </ul>
        </section>

        <section className="landing-bottom-cta">
          <div className="landing-cta-leaf" aria-hidden="true"><Check size={25} /></div>
          <div>
            <p className="landing-eyebrow">A FRESH START</p>
            <h2>Make your next shop your own.</h2>
            <p>Build a grocery routine that works for you.</p>
          </div>
          <Link className="landing-primary" to="/login?mode=register">
            Get started <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>
    </MarketingLayout>
  );
}
