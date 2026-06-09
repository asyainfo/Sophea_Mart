import { createContext, useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([]);

  // Note: We are keeping orders as mock data for now based on your code
  const [orders, setOrders] = useState([
    {
      id: "ORD-001",
      userId: 1,
      total: 12.5,
      status: "completed",
      items: 3,
      date: "2025-05-28",
    },
    {
      id: "ORD-002",
      userId: 1,
      total: 8.75,
      status: "pending",
      items: 2,
      date: "2025-05-30",
    },
  ]);

  // FETCH PRODUCTS FROM SUPABASE (Reads Data)
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data);
      }
    };
    fetchProducts();
  }, []);

  // ADD PRODUCT TO SUPABASE (Creates Data)
  const addProduct = async (p) => {
    try {
      // .select().single() ensures Supabase gives us back the newly created row (with its official ID)
      const { data, error } = await supabase
        .from("products")
        .insert([p])
        .select()
        .single();

      if (error) throw error;

      // Update local UI instantly
      if (data) {
        setProducts((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Error adding product:", err.message);
      alert("Failed to add product.");
    }
  };

  // EDIT PRODUCT IN SUPABASE (Updates Data)
  const editProduct = async (id, data) => {
    try {
      const { error } = await supabase
        .from("products")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      // Update local UI instantly
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
      );
    } catch (err) {
      console.error("Error updating product:", err.message);
      alert("Failed to update product.");
    }
  };

  // DELETE PRODUCT IN SUPABASE (Deletes Data)
  const deleteProduct = async (id) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;

      // Update local UI instantly
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting product:", err.message);
      alert("Failed to delete product.");
    }
  };

  const addOrder = (order) => setOrders((prev) => [...prev, order]);
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <StoreContext.Provider
      value={{
        products,
        addProduct,
        editProduct,
        deleteProduct,
        orders,
        addOrder,
        totalRevenue,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
