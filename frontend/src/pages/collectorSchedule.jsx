/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // For navigation

function CollectorSchedule() {
  const [schedules, setSchedules] = useState([]);   // keep as array (not null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // helper: normalize one schedule to prevent null access in render
  const normalizeSchedule = (s, idx) => {
    const vehicle = s?.vehicle ?? {};
    const center  = s?.center ?? s?.collectionCenter ?? {};
    const collector = s?.collector ?? {};

    return {
      _id: s?._id ?? `sch-${idx}`,
      routeLabel: s?.routeLabel ?? `Route ${idx + 1}`,
      vehicle: {
        name: vehicle?.name ?? "—",
        licensePlate: vehicle?.licensePlate ?? "—",
      },
      date: s?.date ?? s?.scheduledDate ?? null,
      // support time fields: time, timeSlot, slot, collectionTime
      time:
        s?.time ??
        s?.timeSlot ??
        s?.slot ??
        s?.collectionTime ??
        "—",
      status: s?.status ?? "scheduled",
      center: {
        name: center?.name ?? s?.centerName ?? "—",
      },
      collector: {
        name: collector?.name ?? "—",
      },
      // keep original object as well in case you need other fields later
      __raw: s,
    };
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const collectorId = localStorage.getItem("collectorId");

    if (!token || !collectorId) {
      setError("Collector not logged in. Redirecting to login...");
      setTimeout(() => navigate("/collector-signin"), 2000);
      return;
    }

    const fetchSchedules = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3050/api/schedule/collector/${collectorId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const arr = Array.isArray(response.data) ? response.data : [];
        // normalize to avoid null access in UI
        const normalized = arr.map(normalizeSchedule);
        setSchedules(normalized);
      } catch (err) {
        console.error(err);
        setError("Error fetching schedules.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [navigate]);

  // Function to accept schedule
  const acceptSchedule = async (scheduleId) => {
    const token = localStorage.getItem("authToken");
    try {
      await axios.put(
        `http://localhost:3050/api/schedule/accept/${scheduleId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchedules((prev) =>
        prev.map((s) => (s._id === scheduleId ? { ...s, status: "accepted" } : s))
      );
    } catch (err) {
      console.error("Error accepting schedule:", err);
      setError("Error accepting schedule.");
    }
  };

  // Function to cancel schedule
  const cancelSchedule = async (scheduleId) => {
    const token = localStorage.getItem("authToken");
    try {
      await axios.put(
        `http://localhost:3050/api/schedule/cancel/${scheduleId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchedules((prev) =>
        prev.map((s) => (s._id === scheduleId ? { ...s, status: "canceled" } : s))
      );
    } catch (err) {
      console.error("Error canceling schedule:", err);
      setError("Error canceling schedule.");
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return "—";
    }
  };

  if (loading) return <div>Loading schedules...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!schedules.length) return <div>No schedules found.</div>;

  return (
    <div className="px-40 py-6 mx-auto containerp">
      <h1 className="mb-6 text-3xl font-bold text-center">Your Collection Schedule</h1>

      <table className="w-full bg-white rounded-lg shadow-lg table-auto">
        <thead>
          <tr className="text-white bg-green-600">
            <th className="px-4 py-2">Route</th>
            <th className="px-4 py-2">Vehicle</th>
            <th className="px-4 py-2">Vehicle License Plate</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Time</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(schedules) ? schedules : []).map((s, idx) => (
            <tr key={s._id || idx} className="border-b">
              <td className="px-4 py-2 text-center">{s.routeLabel || `Route ${idx + 1}`}</td>

              <td className="px-4 py-2 text-center">{s?.vehicle?.name ?? "—"}</td>
              <td className="px-4 py-2 text-center">{s?.vehicle?.licensePlate ?? "—"}</td>

              <td className="px-4 py-2 text-center">{formatDate(s?.date)}</td>
              <td className="px-4 py-2 text-center">{s?.time ?? "—"}</td>

              <td className="px-4 py-2 text-center">
                {s?.status === "scheduled" && (
                  <span className="px-2 py-1 text-blue-700 bg-blue-200 rounded-full">Scheduled</span>
                )}
                {s?.status === "completed" && (
                  <span className="px-2 py-1 text-green-700 bg-green-200 rounded-full">Completed</span>
                )}
                {s?.status === "accepted" && (
                  <span className="px-2 py-1 text-green-700 bg-green-200 rounded-full">Accepted</span>
                )}
                {s?.status === "canceled" && (
                  <span className="px-2 py-1 text-red-700 bg-red-200 rounded-full">Canceled</span>
                )}
                {!["scheduled", "completed", "accepted", "canceled"].includes(s?.status) && (
                  <span className="px-2 py-1 text-gray-700 bg-gray-200 rounded-full">{s?.status || "—"}</span>
                )}
              </td>

              <td className="px-4 py-2 text-center">
                {s?.status === "scheduled" && (
                  <button
                    onClick={() => acceptSchedule(s._id)}
                    className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
                  >
                    Accept
                  </button>
                )}
                {s?.status === "accepted" && (
                  <button
                    onClick={() => cancelSchedule(s._id)}
                    className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CollectorSchedule;
