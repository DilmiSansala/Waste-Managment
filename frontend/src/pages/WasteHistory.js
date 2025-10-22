import React, { useState, useEffect } from "react";
import axios from "axios";
import SidebarIcon from "../components/sidebar/SidebarIcon";
import Header from "../components/header/Header";
import Footer from "../components/Footer";
import "../components/sidebar/styles.css";
import "./wasteHistory.css";
import withAuth from "../hoc/withAuth";

// Define the WasteHistory component
function WasteHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [wasteData, setWasteData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);

  // Fetch waste + special pickup history
const fetchWasteData = async () => {
  setLoading(true);
  setError(null);
  try {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

    // Fetch both endpoints simultaneously
    const [wasteRes, specialRes] = await Promise.all([
      axios.get("http://localhost:3050/api/auth/waste/history", { headers }),
      axios.get("http://localhost:3050/api/specialPickup/my", { headers }),
    ]);

    // Normalize both types
    const normalize = (r, kind) => ({
      _id: r._id,
      collectionDate: r.collectionDate || r.createdAt,
      collectionTime: r.collectionTime || "",
      wasteType:
        kind === "special"
          ? `${r.wasteType || "Unknown"} `
          : r.wasteType || "Unknown",
      quantity: Number(r.quantity ?? 0),
      status: r.status || "pending",
      kind,
    });

    const combined = [
      ...(Array.isArray(wasteRes.data)
        ? wasteRes.data.map((r) => normalize(r, "normal"))
        : []),
      ...(Array.isArray(specialRes.data)
        ? specialRes.data.map((r) => normalize(r, "special"))
        : []),
    ].sort((a, b) => new Date(b.collectionDate) - new Date(a.collectionDate));

    setWasteData(combined);
  } catch (err) {
    console.error("Error fetching waste data:", err);
    setError("Failed to fetch waste data");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchWasteData();
  }, []);

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

const handleDelete = async (entry) => {
  const { _id, kind } = entry;
  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  // Use EXACT path you mounted on the server:
  // If server uses '/api/specialPickup'
  const specialPickupBase = 'http://localhost:3050/api/specialPickup';
  // If you mounted '/api/special-pickup', change above to that.

  const url =
    kind === 'special'
      ? `${specialPickupBase}/${_id}`
      : `http://localhost:3050/api/auth/waste/request/${_id}`;

  try {
    await axios.delete(url, { headers });
    setWasteData((prev) => prev.filter((r) => r._id !== _id));
  } catch (err) {
    console.error('Error deleting request:', err);
    alert(
      err?.response?.data?.message
        ? `Delete failed: ${err.response.data.message}`
        : 'Delete failed. Check API path and server logs.'
    );
  }
};



  // Handle waste request edit (simplified form)
  const handleEdit = (request) => {
    setEditingRequest(request);
  };

const handleEditSubmit = async (e) => {
  e.preventDefault();

  try {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    const isSpecial = editingRequest.kind === "special";

    // Build a minimal payload (avoid sending local-only fields like 'kind', '_id')
    const payload = {
      wasteType: editingRequest.wasteType,
      quantity: Number(editingRequest.quantity),
      collectionDate:
        typeof editingRequest.collectionDate === "string"
          ? editingRequest.collectionDate
          : new Date(editingRequest.collectionDate).toISOString().split("T")[0],
      collectionTime: editingRequest.collectionTime,
      status: editingRequest.status, // include only if your API allows it
      // collectionCenter: editingRequest.collectionCenter, // include if you support editing center
    };

    // Use the exact base path you mounted on the server for special pickups
    const url = isSpecial
      ? `http://localhost:3050/api/specialPickup/${editingRequest._id}`
      : `http://localhost:3050/api/auth/waste/request/${editingRequest._id}`;

    const { data } = await axios.put(url, payload, { headers });

    // Keep the 'kind' in the table row (backend doesn't return it)
    setWasteData((prev) =>
      prev.map((r) =>
        r._id === editingRequest._id ? { ...r, ...data, kind: r.kind } : r
      )
    );

    setEditingRequest(null);
  } catch (err) {
    console.error("Error updating request:", err);
    alert(
      err?.response?.data?.message
        ? `Update failed: ${err.response.data.message}`
        : "Update failed. Check API path, ownership, and server logs."
    );
  }
};


  // Filter waste data based on search query
  const filteredData = wasteData.filter((entry) =>
    entry.wasteType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="waste-history-container">
      <SidebarIcon />
      <div className="main-content-history">
        <Header />
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by waste type..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-bar"
            aria-label="Search by waste type"
          />
        </div>
        <div className="table-container">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <table className="waste-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type of Waste</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
  {filteredData.length > 0 ? (
    filteredData.map((entry) => (
      <tr key={entry._id}>
        <td>{new Date(entry.collectionDate).toLocaleDateString()}</td>
        <td>{entry.collectionTime}</td>
        <td>
          {entry.wasteType}
          {entry.kind === 'special' ? ' (Special Pickup)' : ''}
        </td>
        <td>{entry.quantity}</td>
        <td className={`status ${entry.status.toLowerCase()}`}>{entry.status}</td>
        <td>
          <button
            className="action-button edit-button"
            onClick={() => handleEdit(entry)}
          >
            Edit
          </button>
          <button
            className="action-button delete-button"
            onClick={() => handleDelete(entry)}
          >
            Delete
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="6" className="no-data">No data available</td>
    </tr>
  )}
</tbody>

            </table>
          )}
        </div>

        {editingRequest && (
          <form onSubmit={handleEditSubmit} className="edit-form-container">
            <h3>Edit Waste Request</h3>
            <input
              type="text"
              value={editingRequest.wasteType}
              onChange={(e) =>
                setEditingRequest({
                  ...editingRequest,
                  wasteType: e.target.value,
                })
              }
            />
            <input
              type="number"
              value={editingRequest.quantity}
              onChange={(e) =>
                setEditingRequest({
                  ...editingRequest,
                  quantity: e.target.value,
                })
              }
            />
            <input
              type="date"
              value={new Date(editingRequest.collectionDate)
                .toISOString()
                .split("T")[0]}
              onChange={(e) =>
                setEditingRequest({
                  ...editingRequest,
                  collectionDate: e.target.value,
                })
              }
            />
            <input
              type="time"
              value={editingRequest.collectionTime}
              onChange={(e) =>
                setEditingRequest({
                  ...editingRequest,
                  collectionTime: e.target.value,
                })
              }
            />
            <button type="submit" className="submit-button">
              Submit Changes
            </button>
          </form>
        )}
        <Footer />
      </div>
    </div>
  );
}

export default withAuth(WasteHistory);
