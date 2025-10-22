import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import AdminDashboardLayout from "../pages/AdminDashboardLayout";
import ScheduleInfo from "../components/Schedule/ScheduleInfo";
import CenterSelection from "../components/Schedule/CenterSelection";
import CalendarComponent from "../components/Schedule/CalendarComponent";
import "./SchedulePage.css";
import RequestList from "../components/Schedule/RequestList";

// ✅ Add local date helper here
const toLocalYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const SchedulePage = () => {
  const [date, setDate] = useState(new Date());
  const [scheduledDates, setScheduledDates] = useState([]);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [requests, setRequests] = useState([]);
  const [specialPickupRequests, setSpecialPickupRequests] = useState([]);

  // Fetch centers
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const response = await axios.get("http://localhost:3050/api/centers");
        setCenters(response.data);
      } catch (error) {
        console.error("Error fetching centers:", error);
      }
    };
    fetchCenters();
  }, []);

  // Fetch scheduled dates
  useEffect(() => {
    const fetchScheduledDates = async () => {
      try {
        if (selectedCenter) {
          const response = await axios.get(
            `http://localhost:3050/api/schedule/getByCenter/${selectedCenter}`
          );
          const schedules = response.data;

          const formattedDates = schedules.map((schedule) => ({
            date: new Date(schedule.date).toDateString(),
            info: schedule,
          }));

          setScheduledDates(formattedDates);
        } else {
          setScheduledDates([]);
        }
      } catch (error) {
        console.error("Error fetching scheduled dates:", error);
      }
    };
    fetchScheduledDates();
  }, [selectedCenter]);

  // ✅ Replace with resilient fetch (local date, optional token, fallback)
  const fetchSpecialPickupRequests = async (centerId, selectedDate) => {
    try {
      const token = localStorage.getItem("token");
      const dateStr = toLocalYMD(selectedDate);

      let url = `http://localhost:3050/api/specialPickup/byCenter/${centerId}?on=${dateStr}`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(url, { headers });
      let data = Array.isArray(res.data) ? res.data : [];

      if (data.length === 0) {
        try {
          const fallback = await axios.get(
            `http://localhost:3050/api/specialPickup/getByCenter/${centerId}?date=${dateStr}`,
            { headers }
          );
          if (Array.isArray(fallback.data)) data = fallback.data;
        } catch {}
      }

      setSpecialPickupRequests(data);
      console.debug("[SpecialPickup]", { centerId, dateStr, count: data.length });
    } catch (error) {
      console.error("Error fetching special pickup requests:", error);
      setSpecialPickupRequests([]);
    }
  };

  // Fetch the requests for the selected schedule
  const fetchRequests = (schedule) => {
    if (schedule.requests && schedule.requests.length > 0) {
      setRequests(schedule.requests);
    } else {
      setRequests([]);
    }
  };

  const handleDateClick = async (selectedDate) => {
    const selectedSchedule = scheduledDates.find(
      (scheduledDate) => scheduledDate.date === selectedDate.toDateString()
    );

    if (selectedSchedule) {
      setScheduleInfo(selectedSchedule.info);
      fetchRequests(selectedSchedule.info);
    } else {
      setScheduleInfo(null);
      setRequests([]);
    }

    if (selectedCenter) {
      await fetchSpecialPickupRequests(selectedCenter, selectedDate);
    }
  };

  // ✅ Also update special pickups when center OR date changes
  useEffect(() => {
    if (selectedCenter && date) {
      fetchSpecialPickupRequests(selectedCenter, date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCenter, date]);

  const tileClassName = ({ date }) => {
    if (
      scheduledDates.some(
        (scheduledDate) => scheduledDate.date === date.toDateString()
      )
    ) {
      return "highlight bg-green-500 text-white rounded-full";
    }
    return "";
  };

  return (
    <AdminDashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold text-green-900">
          Manage Schedules
        </h1>
        <Link
          to="/create-schedule"
          className="bg-green-600 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:bg-green-700 transition-transform duration-300 transform hover:scale-105"
        >
          + Create Schedule
        </Link>
      </div>

      <CenterSelection
        centers={centers}
        selectedCenter={selectedCenter}
        setSelectedCenter={setSelectedCenter}
      />

      <div className="max-w-7xl mx-auto p-10 bg-white rounded-lg shadow-lg flex flex-col md:flex-row justify-between gap-8">
        <div className="md:w-1/2">
          <CalendarComponent
            date={date}
            setDate={setDate}
            handleDateClick={handleDateClick}
            scheduledDates={scheduledDates}
            tileClassName={tileClassName}
          />
        </div>

        <div className="md:w-1/2 bg-green-50 p-6 rounded-lg shadow-inner border border-green-200">
          {scheduleInfo ? (
            <ScheduleInfo scheduleInfo={scheduleInfo} />
          ) : (
            <p className="text-gray-600 text-lg font-medium">
              No schedule available for the selected date.
            </p>
          )}
        </div>
      </div>

      {requests.length > 0 && (
        <div className="mt-10">
          <h2 className="text-3xl font-semibold text-green-900 mb-6">
            Regular Waste Collection Requests
          </h2>
          <RequestList requests={requests} />
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-3xl font-semibold text-green-900 mb-6">
          Special Pickup Requests
        </h2>
        {specialPickupRequests.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-green-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Waste Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Quantity (kg)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Collection Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {specialPickupRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.resident?.name || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.resident?.email || ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.wasteType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.quantity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.collectionTime}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'collected' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 text-lg font-medium">
            No special pickup requests for the selected date.
          </p>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default SchedulePage;
