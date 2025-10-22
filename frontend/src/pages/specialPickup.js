import React, { useState, useEffect } from "react";
import axios from "axios";
import SidebarIcon from "../components/sidebar/SidebarIcon";
import Header from "../components/header/Header";
import Footer from "../components/Footer.js";
import "../components/sidebar/styles.css";
import "./wasteRequest.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import withAuth from "../hoc/withAuth";

const SPECIAL_IMAGE_URL =
  "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?ixlib=rb-4.1.0&auto=format&fit=crop&w=1770&q=80";

function SpecialPickup({ onRequestCreated }) {
  const [form, setForm] = useState({
    wasteType: "",
    quantity: 1,
    collectionDate: null,
    collectionTime: "",
    collectionCenter: "",
  });
  const [collectionCenters, setCollectionCenters] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const wasteTypes = [
    "Plastic - Special Pickup",
    "Organic - Special Pickup",
    "Metal - Special Pickup",
    "Paper - Special Pickup",
    "Glass - Special Pickup",
    "Wood - Special Pickup",
    "Electronics - Special Pickup",
    "Hazardous - Special Pickup",
  ];

  // Available time slots (you can tweak these)
  const timeSlots = [
    "08:00 – 09:00",
    "10:00 – 11:00",
    "11:00 – 12:00",
    "14:00 – 15:00",

  ];

  useEffect(() => {
    const fetchCollectionCenters = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:3050/api/auth/collection-centers",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCollectionCenters(response.data);
      } catch (err) {
        console.error("Error fetching collection centers", err);
      }
    };
    fetchCollectionCenters();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        wasteType: form.wasteType,
        quantity: Number(form.quantity),
         collectionDate: form.collectionDate ? 
    new Date(form.collectionDate).toLocaleDateString('en-US') : 
    null,
        collectionTime: form.collectionTime, // now a slot string
        collectionCenter: form.collectionCenter || undefined,
      };

      await axios.post("http://localhost:3050/api/specialPickup", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMessage("Special pickup created successfully!");
      setForm({
        wasteType: "",
        quantity: 1,
        collectionDate: null,
        collectionTime: "",
        collectionCenter: "",
      });
      if (onRequestCreated) onRequestCreated();
    } catch (err) {
      console.error("Error creating Special pickup:", err);
      setError(
        err.response?.data?.message ||
          "Error creating Special pickup. Please try again."
      );
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuantityChange = (increment) => {
    setForm((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity + increment) }));
  };

  // Inline CSS
  const styles = {
    contentWrapper: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "16px 48px 40px", // tighter top spacing
      marginTop: "45px",          // nudge closer to header
      gap: "36px",
      backgroundColor: "#f9f9f9",
    },
    imageContainer: {
      flex: "1",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      maxWidth: "600px",
      height: "450px",
      background: "#e8efe9",
    },
    wasteImage: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    formContainer: {
      flex: "1",
      maxWidth: "520px",
      backgroundColor: "#fff",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      padding: "28px 36px",
    },
    formTitle: {
      textAlign: "center",
      fontSize: "28px",
      fontWeight: 800,
      color: "#111827",
      margin: "6px 0 6px",
      lineHeight: 1.25,
    },
    pickupGreen: { color: "#1f7a3a" }, // “Pickup” green
    formSubtitle: {
      textAlign: "center",
      color: "#555",
      fontSize: "14px",
      marginBottom: "22px",
    },
    formGroup: { marginBottom: "14px" },
    label: {
      display: "block",
      fontWeight: 600,
      color: "#333",
      marginBottom: "6px",
    },
    select: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: "8px",
      border: "1px solid #cfcfcf",
      fontSize: "14px",
      outline: "none",
      background: "#fff",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: "8px",
      border: "1px solid #cfcfcf",
      fontSize: "14px",
      outline: "none",
      background: "#fff",
    },
    quantityContainer: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    quantityBtn: {
      backgroundColor: "#22aa55",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      padding: "6px 12px",
      cursor: "pointer",
      fontSize: "16px",
    },
    submitBtn: {
      width: "100%",
      padding: "12px",
      backgroundColor: "#22aa55",
      color: "white",
      fontSize: "16px",
      fontWeight: 600,
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      marginTop: "12px",
      boxShadow: "0 6px 14px rgba(34,170,85,0.25)",
    },
    error: { color: "#e11d48", textAlign: "center", marginBottom: "10px" },
    success: { color: "#16a34a", textAlign: "center", marginBottom: "10px" },
  };

  return (
    <div className="waste-request-container">
      <SidebarIcon />
      <div className="main-content-request">
        <div className="large-container">
          <Header />

          {/* Centered layout */}
          <div style={styles.contentWrapper}>
            {/* Left Image */}
            <div style={styles.imageContainer}>
              <img
                src={SPECIAL_IMAGE_URL}
                alt="Special waste bins"
                style={styles.wasteImage}
                loading="lazy"
              />
            </div>

            {/* Right Form */}
            <div style={styles.formContainer}>
              <h2 style={styles.formTitle}>
                Special <span style={styles.pickupGreen}>Pickup</span> Request
              </h2>
              <p style={styles.formSubtitle}>
                Fill out the details below to schedule your special waste collection.
              </p>

              {error && <p style={styles.error}>{error}</p>}
              {successMessage && <p style={styles.success}>{successMessage}</p>}

              <form onSubmit={handleFormSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Type of Special Waste</label>
                  <select
                    value={form.wasteType}
                    onChange={(e) => handleFieldChange("wasteType", e.target.value)}
                    style={styles.select}
                    required
                  >
                    <option value="">Select special waste type</option>
                    {wasteTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Quantity (kg)</label>
                  <div style={styles.quantityContainer}>
                    <button
                      type="button"
                      style={{
                        ...styles.quantityBtn,
                        backgroundColor: form.quantity <= 1 ? "#a3a3a3" : "#22aa55",
                        cursor: form.quantity <= 1 ? "not-allowed" : "pointer",
                      }}
                      onClick={() => handleQuantityChange(-1)}
                      disabled={form.quantity <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={form.quantity}
                      onChange={(e) =>
                        handleFieldChange("quantity", parseInt(e.target.value || "1", 10))
                      }
                      min="1"
                      style={{ ...styles.input, textAlign: "center", maxWidth: 140 }}
                      required
                    />
                    <button
                      type="button"
                      style={styles.quantityBtn}
                      onClick={() => handleQuantityChange(1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Preferred Collection Date</label>
                  <DatePicker
                    selected={form.collectionDate}
                    onChange={(date) => handleFieldChange("collectionDate", date)}
                    dateFormat="MMMM d, yyyy"
                    placeholderText="Select a date"
                    className="react-datepicker-input"
                    required
                     timeZone="local"
    minDate={new Date()}
    showTimeSelect={false}
    locale="en-US"
                  />
                </div>

                {/* Available Time Slot (select) */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Available Time Slot</label>
                  <select
                    value={form.collectionTime}
                    onChange={(e) => handleFieldChange("collectionTime", e.target.value)}
                    style={styles.select}
                    required
                  >
                    <option value="">Select a time slot</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Select Collection Center</label>
                  <select
                    value={form.collectionCenter}
                    onChange={(e) =>
                      handleFieldChange("collectionCenter", e.target.value)
                    }
                    style={styles.select}
                    required
                  >
                    <option value="">Select collection center</option>
                    {collectionCenters.map((center) => (
                      <option key={center._id} value={center._id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" style={styles.submitBtn}>
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default withAuth(SpecialPickup);
