import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useStore } from "../hooks/useStore";
import { useCart } from "../hooks/useCart";
import { USD_TO_KHR } from "../utils/currency";
import { FiSearch } from "react-icons/fi";

import Hero from "../components/layout/Hero";
import ProductCard from "../components/product/ProductCard";
import LoginModal from "../components/auth/LoginModal";
import RegisterModal from "../components/auth/RegisterModal";
import { Toast, useToast } from "../components/ui/Toast";
import Button from "../components/ui/Button";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f9fafb",
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px 64px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 0 16px",
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
    color: "#111",
  },
  count: {
    fontSize: 14,
    fontWeight: 500,
    color: "#9ca3af",
    marginLeft: 8,
  },
  empty: {
    textAlign: "center",
    padding: "80px 0",
    color: "#9ca3af",
  },
};

export default function HomePage() {
  const { user } = useAuth();
  const { products } = useStore();
  const { dispatch } = useCart();
  const { toasts, show: toast } = useToast();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = category === "All" || product.category === category;

      const searchMatch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [products, search, category]);

  const handleAddToCart = (product) => {
    if (!user) {
      toast("Sign in to add items to cart.", "error");
      setLoginOpen(true);
      return;
    }

    dispatch({
      type: "ADD",
      product,
    });

    toast(`${product.name} added to cart!`);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
  };

  return (
    <div style={styles.page}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

          @keyframes slideIn {
            from {
              transform: translateX(20px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .responsive-grid {
            display: grid;
            gap: 20px;
            grid-template-columns: repeat(2, 1fr); 
          }

          @media (min-width: 500px) {
            .responsive-grid {
               grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            }
          }
        `}
      </style>

      <Hero
        search={search}
        setSearch={setSearch}
        activeCategory={category}
        setCategory={setCategory}
      />

      <main style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {category === "All" ? "All Products" : category}
            <span style={styles.count}>({filteredProducts.length} items)</span>
          </h2>
        </div>

        {filteredProducts.length ? (
          <div className="responsive-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div style={styles.empty}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <FiSearch size={64} color="#D1D5DB" />
            </div>

            <h3
              style={{
                margin: "0 0 8px 0",
                color: "#616162ff",
                fontSize: "18px",
              }}
            >
              No products found
            </h3>

            <p style={{ margin: "0 0 24px 0", fontSize: "14px" }}>
              Try a different search or category.
            </p>

            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </main>

      <footer
        style={{
          background: "#0066FF",
          color: "#e5f0ff95",
          textAlign: "center",
          padding: "32px 24px",
        }}
      >
        <h3 style={{ color: "#fff" }}>SOPHEA MART</h3>

        <p>
          © 2026 Small Mart · Phnom Penh, Cambodia · 1 USD ={" "}
          {USD_TO_KHR.toLocaleString()} KHR
        </p>
      </footer>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchRegister={() => {
          setLoginOpen(false);
          setRegisterOpen(true);
        }}
        toast={toast}
      />

      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSwitchLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
        toast={toast}
      />

      <Toast toasts={toasts} />
    </div>
  );
}
