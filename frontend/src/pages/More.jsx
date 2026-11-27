import { NavLink } from "react-router-dom";
import { History, ChartColumn, UserRound, ChevronRight } from "lucide-react";

// the phone's bottom bar has room for five tabs, so the rest live here
const LINKS = [
  { to: "/history", label: "Shopping history", hint: "Past trips, and repeat one", Icon: History },
  { to: "/stats", label: "Stats", hint: "Where your money goes", Icon: ChartColumn },
  { to: "/profile", label: "Your profile", hint: "Username and password", Icon: UserRound },
];

export default function More() {
  return (
    <>
      <h1>More</h1>
      <ul className="more-list">
        {LINKS.map(({ to, label, hint, Icon }) => (
          <li key={to}>
            <NavLink to={to} className="card more-link">
              <span className="more-icon">
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="more-text">
                <strong>{label}</strong>
                <span className="muted">{hint}</span>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </NavLink>
          </li>
        ))}
      </ul>
    </>
  );
}
