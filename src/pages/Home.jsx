// src/pages/Home.jsx
import { useCart } from "../hooks/useCart";

export default function Home() {
  const { cartItems } = useCart();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Products</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>
    </div>
  );
}
