import React, { useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";
import AdminDashboardLayout from "../pages/AdminDashboardLayout";
import "./AdminVehicles.css";

const initialForm = { name: "", licensePlate: "", centerId: "" };

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [centers, setCenters] = useState([]);
  const [filterCenter, setFilterCenter] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const centerNameFor = (v) => {
    if (v?.centerId && typeof v.centerId === "object" && v.centerId.name) {
      return v.centerId.name;
    }
    const id = typeof v.centerId === "string" ? v.centerId : v?.centerId?._id;
    const c = centers.find((x) => (x._id || x.id) === id);
    return c?.name || id || "-";
  };

  const loadCenters = async () => {
    try {
      const { data } = await api.get("/api/centers");
      setCenters(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadVehicles = async () => {
    setLoading(true);
    setErr("");
    try {
      if (filterCenter) {
        const { data } = await api.get(`/api/vehicles/center/${filterCenter}`);
        setVehicles(Array.isArray(data) ? data : []);
      } else {
        const { data } = await api.get("/api/vehicles");
        setVehicles(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
      setErr("Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenters();
  }, []);

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCenter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        (v.name || "").toLowerCase().includes(q) ||
        (v.licensePlate || "").toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (!form.name || !form.licensePlate || !form.centerId) {
        setErr("All fields are required.");
        return;
      }
      if (editingId) {
        await api.put(`/api/vehicles/${editingId}`, form);
      } else {
        await api.post("/api/vehicles", form);
      }
      setForm(initialForm);
      setEditingId(null);
      await loadVehicles();
    } catch (e) {
      console.error(e);
      setErr("Failed to save vehicle.");
    }
  };

  const onEdit = (v) => {
    setForm({
      name: v.name || "",
      licensePlate: v.licensePlate || "",
      centerId:
        (typeof v.centerId === "object" && v.centerId?._id) || v.centerId || "",
    });
    setEditingId(v._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await api.delete(`/api/vehicles/${id}`);
      await loadVehicles();
    } catch (e) {
      console.error(e);
      setErr("Failed to delete vehicle.");
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="veh-wrap">
        <form className="veh-form" onSubmit={onSubmit}>
          <div className="veh-grid">
            <div className="veh-field">
              <label>Vehicle Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Truck A"
              />
            </div>
            <div className="veh-field">
              <label>License Plate</label>
              <input
                value={form.licensePlate}
                onChange={(e) =>
                  setForm({ ...form, licensePlate: e.target.value })
                }
                placeholder="e.g., ABC-1234"
              />
            </div>
            <div className="veh-field">
              <label>Center</label>
              <select
                value={form.centerId}
                onChange={(e) => setForm({ ...form, centerId: e.target.value })}
              >
                <option value="">-- Select Center --</option>
                {centers.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="veh-actions">
            <button type="submit" className="veh-btn">
              {editingId ? "Update Vehicle" : "Add Vehicle"}
            </button>
            {editingId && (
              <button
                type="button"
                className="veh-btn secondary"
                onClick={() => {
                  setForm(initialForm);
                  setEditingId(null);
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
          {err && <p className="veh-error">{err}</p>}
        </form>

        <div className="veh-toolbar">
          <div className="veh-filter">
            <label>Filter by Center</label>
            <select
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
            >
              <option value="">All Centers</option>
              {centers.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="veh-search">
            <input
              placeholder="Search by name or plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" onClick={loadVehicles}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading vehicles...</p>
        ) : filtered.length === 0 ? (
          <div className="veh-empty">
            <p>No vehicles found.</p>
          </div>
        ) : (
          <table className="veh-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>License Plate</th>
                <th>Center</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v._id}>
                  <td>{v.name}</td>
                  <td>{v.licensePlate}</td>
                  <td>{centerNameFor(v)}</td>
                  <td>
                    <div className="veh-actions-inline">
                      <button
                        className="veh-btn small"
                        onClick={() => onEdit(v)}
                        aria-label={`Edit ${v.name || "vehicle"}`}
                      >
                        Edit
                      </button>
                      <button
                        className="veh-btn danger small"
                        onClick={() => onDelete(v._id)}
                        aria-label={`Delete ${v.name || "vehicle"}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
