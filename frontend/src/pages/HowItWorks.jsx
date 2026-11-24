import {
  ArrowRight,
  Check,
  Cloud,
  ListChecks,
  ShoppingBasket,
} from "lucide-react";
import { Link } from "react-router-dom";
import MarketingLayout from "../components/MarketingLayout";
import { STEPS } from "../marketingContent";

const STEP_ICONS = [ListChecks, ShoppingBasket, Check];

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <main className="marketing-page">
        <section className="marketing-intro">
          <p className="landing-eyebrow">SIMPLE FROM THE FIRST LIST</p>
          <h1>From “what do we need?” to “all done.”</h1>
          <p>
            Keep your grocery routine in one place. Add your usuals once, then
            use them to make each trip a little easier.
          </p>
        </section>

        <section className="how-step-list" aria-label="How the app works">
          {STEPS.map(({ number, title, text, detail }, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <article className="how-step" key={number}>
                <div className="how-step-marker">
                  <span>{number}</span>
                  {index < STEPS.length - 1 && <i aria-hidden="true" />}
                </div>
                <div className="how-step-content">
                  <span className={`landing-feature-icon ${["gold", "green", "coral"][index]}`}>
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{title}</h2>
                    <p>{text}</p>
                    <p className="how-step-detail">{detail}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="how-offline">
          <span className="landing-feature-icon green"><Cloud size={22} aria-hidden="true" /></span>
          <div>
            <h2>Keep going, even offline.</h2>
            <p>
              Your saved products and cart are available without an internet
              connection. Updates sync when you’re connected again.
            </p>
          </div>
        </section>

        <section className="landing-bottom-cta">
          <div className="landing-cta-leaf" aria-hidden="true"><ShoppingBasket size={25} /></div>
          <div>
            <p className="landing-eyebrow">READY WHEN YOU ARE</p>
            <h2>Let’s get your list started.</h2>
            <p>Set up your account and add the groceries you love.</p>
          </div>
          <Link className="landing-primary" to="/login?mode=register">
            Create your account <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>
    </MarketingLayout>
  );
}
