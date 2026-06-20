import { useState, useEffect } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { supabase } from "../../services/supabase";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #E5E7EB",
  borderRadius: 10,
  fontSize: 14,
  marginTop: 6,
  boxSizing: "border-box",
};

// MASTER CATEGORY LIST: Matches your Supabase ENUM and Hero.jsx exactly
const CATEGORIES = [
  "ភេសជ្ជៈ",
  "ជម្រើសល្អៗបំផុត",
  "ការ៉េម",
  "គ្រឿងផ្សំ",
  "អាហារសម្រន់",
  "សម្ភារៈទារក",
  "ឱសថស្ថាន",
  "ការថែទាំខ្លួនប្រាណ",
  "ថែរក្សាសម្រស់",
  "សាប៊ូកក់សក់",
  "គ្រឿងសម្អាង",
  "ផលិតផលថែរក្សាស្បែក",
  "គ្រឿងតុបតែងសក់",
  "អេឡិចត្រូនិក",
  "គ្រឿងសំណង់",
  "ផលិតផលលក់ដុំ",
  "ម្សៅ",
  "បរិក្ខារផ្ទះបាយ",
  "កាហ្វេ និងតែ",
  "ឧបករណ៍ចាំបាច់នានា",
  "សម្លៀកបំពាក់",
  "ទឹកដោះគោ",
  "សម្ភារៈទូទៅ",
];

export default function ProductFormModal({ open, onClose, product, onSave }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [sizes, setSizes] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Sync state when modal opens or product changes
  useEffect(() => {
    // Safely check if product exists AND has keys (is not an empty object)
    if (product && Object.keys(product).length > 0) {
      setName(product.name || "");
      setCategory(product.category || CATEGORIES[0]);
      setPrice(product.price?.toString() || "");
      setStock(product.stock?.toString() || "");
      setSizes(product.sizes || "");
      setDescription(product.description || "");
      setPreviewUrl(
        product.image?.startsWith("http")
          ? product.image
          : `/${product.image || ""}`,
      );
      setImageFile(null);
    } else {
      setName("");
      setCategory(CATEGORIES[0]);
      setPrice("");
      setStock("");
      setSizes("");
      setDescription("");
      setPreviewUrl("");
      setImageFile(null);
    }
  }, [product, open]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Safe React Validation: Check if it's missing an ID to confirm it's a new product
    const isNewProduct = !product?.id;
    if (isNewProduct && !imageFile) {
      alert("Please choose a product image before saving!");
      return;
    }

    setIsUploading(true);

    try {
      let finalImageUrl = product?.image || "";

      // 2. Upload Image to Supabase
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        finalImageUrl = data.publicUrl;
      }

      // 3. Send sanitized data to the parent component
      // Using parseFloat(...) || 0 prevents Supabase 'NaN' crashes
      await onSave({
        ...(product || {}), // Preserve the ID if editing
        name: name.trim(),
        category,
        price: parseFloat(price) || 0,
        stock: parseInt(stock, 10) || 0,
        sizes: sizes.trim(),
        description: description.trim(),
        image: finalImageUrl,
      });
    } catch (error) {
      console.error("Save Error:", error.message);
      alert("Failed to save product: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product?.id ? "Edit Product" : "Add New Product"}
    >
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        {/* --- Image Upload Area --- */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Product Image</label>
          <div
            style={{
              marginTop: 6,
              border: "2px dashed #E5E7EB",
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              background: "#F9FAFB",
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  height: 120,
                  objectFit: "contain",
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              />
            ) : (
              <FiUploadCloud
                size={40}
                color="#9CA3AF"
                style={{ marginBottom: 10 }}
              />
            )}
            <div>
              <label
                style={{
                  background: "#EFF6FF",
                  color: "#2563EB",
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {previewUrl ? "Change Photo" : "Choose a Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* --- Inputs --- */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Product Name</label>
          <input
            required
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Category</label>
            <select
              style={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Price (USD)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              style={inputStyle}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Stock Quantity
            </label>
            <input
              required
              type="number"
              min="0"
              style={inputStyle}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Size (Optional)
            </label>
            <input
              style={inputStyle}
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Description (Optional)
          </label>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* --- Submit Button --- */}
        <Button full type="submit" disabled={isUploading}>
          {isUploading
            ? "Saving..."
            : product?.id
              ? "Update Product"
              : "Save Product"}
        </Button>
      </form>
    </Modal>
  );
}
