import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Botanicals from "./components/Botanicals";
import Dashboard from "./pages/Dashboard";
import AddProduct from "./pages/AddProduct";
import Cart from "./pages/Cart";
import History from "./pages/History";
import Stats from "./pages/Stats";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <>
      <Botanicals />
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddProduct />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </>
  );
}
