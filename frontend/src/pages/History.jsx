import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Trash2 } from "lucide-react";
import { api } from "../api";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../utils";
import { useSync } from "../useSync";

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
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  const { dataVersion } = useSync();

  useEffect(() => {
    api
      .getTrips("?completed=true")
      .then(setTrips)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dataVersion]);

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

  async function handleDelete(trip) {
    const ok = window.confirm(
      `Delete this shopping trip from ${formatDate(trip.date)}? This cannot be undone.`,
    );
    if (!ok) return;

    try {
      setDeletingId(trip.id);
      setError("");
      await api.deleteTrip(trip.id);
      setTrips((current) => current.filter((item) => item.id !== trip.id));
      setOpenId((current) => (current === trip.id ? null : current));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;

  const query = search.trim().toLocaleLowerCase();
  const filteredTrips = query
    ? trips.filter((trip) =>
        [trip.store_name, ...trip.items.map((item) => item.product_name)]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(query)),
      )
    : trips;

  return (
    <>
      <div className="page-header">
        <h1>Shopping History</h1>
        {trips.length > 0 && (
          <label className="search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search trips or products"
              aria-label="Search shopping history"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      {trips.length === 0 ? (
        <div className="card empty">
          <p>No finished trips yet.</p>
          <Link to="/">Start shopping</Link>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="card empty">
          <p>No trips or products match “{search}”.</p>
        </div>
      ) : (
        <div className="trip-list">
          {filteredTrips.map((trip) => {
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
                    disabled={busyId === trip.id || deletingId === trip.id}
                  >
                    {busyId === trip.id ? "Copying..." : "Repeat this trip"}
                  </button>
                  <button
                    className="danger-action"
                    onClick={() => handleDelete(trip)}
                    disabled={busyId === trip.id || deletingId === trip.id}
                  >
                    <Trash2 size={17} aria-hidden="true" />
                    {deletingId === trip.id ? "Deleting..." : "Delete trip"}
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
