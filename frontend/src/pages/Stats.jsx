import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import BarList from "../components/BarList";
import PriceCompare from "../components/PriceCompare";
import { formatMoney } from "../utils";

const monthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return new Date(y, m - 1).toLocaleDateString("en-NG", {
    month: "short",
    year: "numeric",
  });
};

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading...</p>;

  const average =
    stats.trips_completed > 0
      ? Number(stats.total_spent) / stats.trips_completed
      : 0;

  const months = stats.monthly_spending.map((m) => ({
    ...m,
    label: monthLabel(m.month),
  }));

  return (
    <>
      <h1>Stats</h1>

      <div className="stat-cards">
        <div className="card stat">
          <span className="muted">Total spent</span>
          <strong>{formatMoney(stats.total_spent)}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Trips completed</span>
          <strong>{stats.trips_completed}</strong>
        </div>
        <div className="card stat">
          <span className="muted">Average per trip</span>
          <strong>{formatMoney(average)}</strong>
        </div>
      </div>

      {stats.trips_completed === 0 ? (
        <div className="card empty">
          <p>Finish a shopping trip to see your spending stats.</p>
          <Link to="/">Go to dashboard</Link>
        </div>
      ) : (
        <div className="stats-grid">
          <div className="card">
            <h2>Monthly spending</h2>
            <BarList rows={months} labelKey="label" valueKey="total" />
          </div>
          <div className="card">
            <h2>By category</h2>
            <BarList
              rows={stats.spending_by_category}
              labelKey="category"
              valueKey="total"
            />
          </div>
          <div className="card">
            <h2>Most bought</h2>
            <ol className="top-list">
              {stats.top_items.map((t) => (
                <li key={t.product_id}>
                  <span>{t.name}</span>
                  <span className="muted">
                    {t.times_bought} {t.times_bought === 1 ? "trip" : "trips"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <PriceCompare />
    </>
  );
}
