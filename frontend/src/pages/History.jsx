import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../utils";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function History() {
  const navigate = useNavigate();
  const { cart, refreshCart } = useCart();
  const [trips, setTrips] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api
      .getTrips("?completed=true")
      .then(setTrips)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRepeat(trip) {
    if (cart && cart.items.length > 0) {
      const ok = window.confirm(
        "Your cart already has items. Finish or clear it first. Go to the cart?",
      );
      if (ok) navigate("/cart");
      return;
    }
    try {
      setBusyId(trip.id);
      setError("");
      await api.repeatTrip(trip.id);
      await refreshCart();
      navigate("/cart");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;

  return (
    <>
      <h1>Shopping History</h1>
      {error && <p className="error">{error}</p>}

      {trips.length === 0 ? (
        <div className="card empty">
          <p>No finished trips yet.</p>
          <Link to="/">Start shopping</Link>
        </div>
      ) : (
        <div className="trip-list">
          {trips.map((trip) => {
            const open = openId === trip.id;
            return (
              <div key={trip.id} className="card trip">
                <div className="trip-head">
                  <div>
                    <h3>{formatDate(trip.date)}</h3>
                    <p className="muted">
                      {trip.store_name || "No store"} · {trip.items.length}{" "}
                      {trip.items.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="trip-money">
                    <strong>{formatMoney(trip.total)}</strong>
                    {trip.budget && (
                      <span
                        className={`budget-text ${trip.over_budget ? "over" : ""}`}
                      >
                        {trip.over_budget
                          ? `${formatMoney(Math.abs(trip.remaining))} over budget`
                          : `${formatMoney(trip.remaining)} under budget`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="trip-actions">
                  <button
                    className="secondary"
                    onClick={() => setOpenId(open ? null : trip.id)}
                  >
                    {open ? "Hide items" : "View items"}
                  </button>
                  <button
                    onClick={() => handleRepeat(trip)}
                    disabled={busyId === trip.id}
                  >
                    {busyId === trip.id ? "Copying..." : "Repeat this trip"}
                  </button>
                </div>

                {open && (
                  <table className="trip-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trip.items.map((i) => (
                        <tr key={i.id}>
                          <td>{i.product_name}</td>
                          <td>
                            {Number(i.quantity)} {i.product_unit}
                          </td>
                          <td>{formatMoney(i.price_paid)}</td>
                          <td>{formatMoney(i.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
