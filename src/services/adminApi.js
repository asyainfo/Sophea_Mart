// src/services/adminApi.js
import { supabase } from "./supabase";

// ==========================================
// ⚡ IN-MEMORY CACHE (Saves 90%+ Supabase Egress & Makes UI Instant)
// ==========================================
const cache = {
  products: { data: null, timestamp: 0 },
  gifts: { data: null, timestamp: 0 },
  settings: new Map(),
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper: Automatically compress any image to lightweight WebP (~40KB) before uploading
async function compressImage(file, maxWidth = 800, quality = 0.8) {
  // If not an image or running outside browser, return original file
  if (!file || !file.type?.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;
          resolve(new File([blob], cleanName, { type: "image/webp" }));
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback to original file if compression fails
    };
  });
}

export const adminApi = {
  // Clear cache helper when admin makes changes
  clearCache: () => {
    cache.products = { data: null, timestamp: 0 };
    cache.gifts = { data: null, timestamp: 0 };
    cache.settings.clear();
  },

  // ==========================================
  // PRODUCTS API
  // ==========================================

  fetchProducts: async (forceRefresh = false) => {
    try {
      // 1. Return instant cached products if fresh
      if (
        !forceRefresh &&
        cache.products.data &&
        Date.now() - cache.products.timestamp < CACHE_TTL
      ) {
        return { data: cache.products.data, error: null };
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      // 2. Save to cache
      cache.products = { data: data || [], timestamp: Date.now() };
      return { data: data || [], error: null };
    } catch (error) {
      console.error("API Error (fetchProducts):", error.message);
      return { data: null, error };
    }
  },

  addProduct: async (productData) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert([productData])
        .select();

      if (error) throw error;
      cache.products = { data: null, timestamp: 0 }; // Invalidate cache
      return { data, error: null };
    } catch (error) {
      console.error("API Error (addProduct):", error.message);
      return { data: null, error };
    }
  },

  updateProduct: async (id, productData) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select();

      if (error) throw error;
      cache.products = { data: null, timestamp: 0 }; // Invalidate cache
      return { data, error: null };
    } catch (error) {
      console.error("API Error (updateProduct):", error.message);
      return { data: null, error };
    }
  },

  deleteProduct: async (id) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      cache.products = { data: null, timestamp: 0 }; // Invalidate cache
      return { success: true, error: null };
    } catch (error) {
      console.error("API Error (deleteProduct):", error.message);
      return { success: false, error };
    }
  },

  toggleStock: async (id, currentStockStatus) => {
    try {
      const newStatus = !currentStockStatus;
      const { error } = await supabase
        .from("products")
        .update({ in_stock: newStatus })
        .eq("id", id);

      if (error) throw error;
      cache.products = { data: null, timestamp: 0 }; // Invalidate cache
      return { newStatus, error: null };
    } catch (error) {
      console.error("API Error (toggleStock):", error.message);
      return { newStatus: null, error };
    }
  },

  // ==========================================
  // SETTINGS API
  // ==========================================

  getSetting: async (settingKey, forceRefresh = false) => {
    try {
      const cachedSetting = cache.settings.get(settingKey);
      if (
        !forceRefresh &&
        cachedSetting &&
        Date.now() - cachedSetting.timestamp < CACHE_TTL
      ) {
        return { value: cachedSetting.value, error: null };
      }

      const { data, error } = await supabase
        .from("store_settings")
        .select("setting_value")
        .eq("setting_key", settingKey)
        .maybeSingle();

      if (error) throw error;

      const value = data ? data.setting_value : false;
      cache.settings.set(settingKey, { value, timestamp: Date.now() });
      return { value, error: null };
    } catch (error) {
      console.error("API Error (getSetting):", error.message);
      return { value: false, error };
    }
  },

  updateSetting: async (settingKey, newValue) => {
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({ setting_value: newValue })
        .eq("setting_key", settingKey);

      if (error) throw error;
      cache.settings.delete(settingKey); // Invalidate setting cache
      return { success: true, error: null };
    } catch (error) {
      console.error("API Error (updateSetting):", error.message);
      return { success: false, error };
    }
  },

  // ==========================================
  // 🏆 FREE GIFTS & IMAGE UPLOAD API
  // ==========================================

  uploadGiftImage: async (file, bucketName = "gifts") => {
    try {
      // 1. Compress image to WebP before uploading (shrinks 3MB -> ~40KB)
      const optimizedFile = await compressImage(file);
      const fileExt = optimizedFile.name.split(".").pop() || "webp";
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      // 2. Upload with 1-Year Cache-Control header to save Supabase Cached Egress!
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, optimizedFile, {
          cacheControl: "31536000", // 1 year browser & CDN cache
          contentType: optimizedFile.type || "image/webp",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (error) {
      console.error("API Error (uploadGiftImage):", error.message);
      return { url: null, error };
    }
  },

  fetchGifts: async (forceRefresh = false) => {
    try {
      if (
        !forceRefresh &&
        cache.gifts.data &&
        Date.now() - cache.gifts.timestamp < CACHE_TTL
      ) {
        return { data: cache.gifts.data, error: null };
      }

      const { data, error } = await supabase.from("free_gifts").select("*");
      if (error) throw error;

      cache.gifts = { data: data || [], timestamp: Date.now() };
      return { data: data || [], error: null };
    } catch (error) {
      console.error("API Error (fetchGifts):", error.message);
      return { data: [], error };
    }
  },

  addGift: async (giftData) => {
    try {
      const { data, error } = await supabase
        .from("free_gifts")
        .insert([giftData])
        .select();

      if (error) throw error;
      cache.gifts = { data: null, timestamp: 0 }; // Invalidate cache
      return { data, error: null };
    } catch (error) {
      console.error("API Error (addGift):", error.message);
      return { data: null, error };
    }
  },

  deleteGift: async (id) => {
    try {
      const { error } = await supabase.from("free_gifts").delete().eq("id", id);
      if (error) throw error;
      cache.gifts = { data: null, timestamp: 0 }; // Invalidate cache
      return { success: true, error: null };
    } catch (error) {
      console.error("API Error (deleteGift):", error.message);
      return { success: false, error };
    }
  },
};
