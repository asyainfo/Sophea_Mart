import { supabase } from "./supabase";

export const adminApi = {
  // ==========================================
  // PRODUCTS API
  // ==========================================

  fetchProducts: async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("API Error (fetchProducts):", error.message);
      return { data: null, error };
    }
  },

  addProduct: async (productData) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert([productData]);

      if (error) throw error;
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
        .eq("id", id);

      if (error) throw error;
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
      return { newStatus, error: null };
    } catch (error) {
      console.error("API Error (toggleStock):", error.message);
      return { newStatus: null, error };
    }
  },

  // ==========================================
  // SETTINGS API
  // ==========================================

  getSetting: async (settingKey) => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("setting_value")
        .eq("setting_key", settingKey)
        .single();

      if (error) throw error;
      return { value: data.setting_value, error: null };
    } catch (error) {
      console.error("API Error (getSetting):", error.message);
      return { value: false, error }; // Defaults to false if it fails
    }
  },

  updateSetting: async (settingKey, newValue) => {
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({ setting_value: newValue })
        .eq("setting_key", settingKey);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error("API Error (updateSetting):", error.message);
      return { success: false, error };
    }
  },

  // ==========================================
  // 🏆 NEW: FREE GIFTS API
  // ==========================================

  // 🏆 Added the image upload function
  uploadGiftImage: async (file) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("gifts")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("gifts").getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (error) {
      console.error("API Error (uploadGiftImage):", error.message);
      return { url: null, error };
    }
  },

  fetchGifts: async () => {
    try {
      const { data, error } = await supabase.from("free_gifts").select("*");
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error("API Error (fetchGifts):", error.message);
      return { data: [], error };
    }
  },

  addGift: async (giftData) => {
    try {
      const { data, error } = await supabase
        .from("free_gifts")
        .insert([giftData]);
      if (error) throw error;
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
      return { success: true, error: null };
    } catch (error) {
      console.error("API Error (deleteGift):", error.message);
      return { success: false, error };
    }
  },
};
