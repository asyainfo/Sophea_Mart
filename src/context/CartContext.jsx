import { createContext, useReducer, useEffect, useMemo } from "react";

export const CartContext = createContext(null);

const CART_STORAGE_KEY = "sophea_mart_cart_v1";

function normalizeItem(item, newQty) {
  const safeQty = Math.max(
    1,
    Number(newQty ?? item?.qty ?? item?.quantity ?? 1),
  );
  return {
    ...item,
    price: Number(item?.price || 0),
    qty: safeQty,
    quantity: safeQty,
  };
}

function getInitialCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i) => i && i.id !== undefined && i.id !== null)
      .map((i) => normalizeItem(i));
  } catch {
    return [];
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const product = action.product;
      if (!product || product.id === undefined) return state;

      const addAmount = Math.max(1, Number(action.qty ?? action.quantity ?? 1));
      const maxStock =
        product.stock !== undefined && product.stock !== null
          ? Number(product.stock)
          : Infinity;

      const ex = state.find((i) => i.id === product.id);
      if (ex) {
        const currentQty = Number(ex.qty ?? ex.quantity ?? 1);
        const nextQty = Math.min(maxStock, currentQty + addAmount);
        return state.map((i) =>
          i.id === product.id
            ? normalizeItem({ ...i, ...product }, nextQty)
            : i,
        );
      }

      if (maxStock <= 0) return state;
      return [...state, normalizeItem(product, Math.min(maxStock, addAmount))];
    }

    case "DECREMENT": {
      const targetId = action.id ?? action.product?.id;
      const ex = state.find((i) => i.id === targetId);
      if (!ex) return state;

      const currentQty = Number(ex.qty ?? ex.quantity ?? 1);
      if (currentQty <= 1) {
        return state.filter((i) => i.id !== targetId);
      }
      return state.map((i) =>
        i.id === targetId ? normalizeItem(i, currentQty - 1) : i,
      );
    }

    case "REMOVE": {
      const targetId = action.id ?? action.product?.id;
      return state.filter((i) => i.id !== targetId);
    }

    case "UPDATE_QTY": {
      const nextQty = Number(action.qty ?? action.quantity ?? 0);
      if (nextQty <= 0) {
        return state.filter((i) => i.id !== action.id);
      }
      return state.map((i) => {
        if (i.id !== action.id) return i;
        const maxStock =
          i.stock !== undefined && i.stock !== null
            ? Number(i.stock)
            : Infinity;
        return normalizeItem(i, Math.min(maxStock, nextQty));
      });
    }

    case "CLEAR":
      return [];

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [], getInitialCart);

  // Save cart to localStorage automatically whenever items change
  useEffect(() => {
    try {
      if (items.length === 0) {
        localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [items]);

  const { total, count } = useMemo(() => {
    const rawTotal = items.reduce(
      (sum, i) => sum + Number(i.price || 0) * Number(i.qty ?? i.quantity ?? 1),
      0,
    );
    const totalCount = items.reduce(
      (sum, i) => sum + Number(i.qty ?? i.quantity ?? 1),
      0,
    );
    return {
      total: Math.round(rawTotal * 100) / 100,
      count: totalCount,
    };
  }, [items]);

  const contextValue = useMemo(
    () => ({ items, dispatch, total, count }),
    [items, total, count],
  );

  return (
    <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
  );
}
