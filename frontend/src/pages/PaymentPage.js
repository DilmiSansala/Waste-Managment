// import React, { useState, useEffect, useMemo } from 'react';
// import axios from 'axios';
// import SidebarIcon from '../components/sidebar/SidebarIcon';
// import Header from '../components/header/Header';
// import Footer from '../components/Footer.js';
// import { FaCreditCard, FaCalendarAlt, FaLock } from 'react-icons/fa';
// import './PaymentPage.css';

// // Pricing structure based on waste type
// const wastePrices = {
//   Glass: 15,
//   Wood: 10,
//   Hazardous: 60,
//   Paper: 10,
//   Metal: 20,
//   Plastic: 30,
//   Organic: 30,
//   Electronics: 50,
//   Default: 30,
// };

// function PaymentPage() {
//   const [requests, setRequests] = useState([]);
//   const [q, setQ] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [loadErr, setLoadErr] = useState('');
//   const [selectedRequest, setSelectedRequest] = useState(null);
//   const [showPaymentForm, setShowPaymentForm] = useState(false);
//   const [paying, setPaying] = useState(false);

//   const [paymentDetails, setPaymentDetails] = useState({
//     cardHolderName: '',
//     cardNumber: '',
//     expiryDate: '',
//     cvc: '',
//   });
//   const [errors, setErrors] = useState({});

//   // Safer date formatter
//   const fmtDate = (d) => {
//     try {
//       const dt = new Date(d);
//       return dt.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
//     } catch {
//       return '-';
//     }
//   };

//   // Calculate total amount based on waste type and quantity
//   const calculateAmount = (wasteType, quantity) => {
//     const pricePerUnit = wastePrices[wasteType] ?? wastePrices.Default;
//     const qty = Number(quantity || 0);
//     return pricePerUnit * qty;
//   };

//   // Fetch pending waste requests from the backend
//   useEffect(() => {
//     const fetchRequests = async () => {
//       setLoading(true);
//       setLoadErr('');
//       try {
//         const response = await axios.get('http://localhost:3050/api/auth/waste/history', {
//           headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
//         });
//         const data = Array.isArray(response.data) ? response.data : [];
//         // only pending → normalize minimal fields
//         const pending = data
//           .filter((r) => r && r.status === 'pending')
//           .map((r) => ({
//             _id: r._id,
//             collectionDate: r.collectionDate || r.date || r.createdAt,
//             wasteType: r.wasteType || r.type || 'Unknown',
//             quantity: Number(r.quantity ?? r.qty ?? 0),
//           }));
//         setRequests(pending);
//       } catch (error) {
//         console.error('Error fetching waste requests:', error);
//         setLoadErr('Failed to load pending requests.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchRequests();
//   }, []);

//   // Filter + sort view like your history table
//   const view = useMemo(() => {
//     const term = q.trim().toLowerCase();
//     let list = requests;
//     if (term) list = list.filter((r) => (r.wasteType || '').toLowerCase().includes(term));
//     return [...list].sort((a, b) => new Date(b.collectionDate) - new Date(a.collectionDate));
//   }, [requests, q]);

//   // Handle selection of a waste request for payment
//   const handleRequestSelect = (request) => {
//     const amount = calculateAmount(request.wasteType, request.quantity);
//     setSelectedRequest({ ...request, amount });
//     setShowPaymentForm(true);
//     setErrors({});
//   };

//   const handleInputChange = (e) => {
//     setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });
//   };

//   // Stronger client validation, with clear messages
//   const validateForm = () => {
//     const newErrors = {};
//     const numberOnly = /^\d+$/;

//     if (!paymentDetails.cardHolderName?.trim()) {
//       newErrors.cardHolderName = 'Cardholder name is required';
//     }
//     if (!paymentDetails.cardNumber || !numberOnly.test(paymentDetails.cardNumber) || paymentDetails.cardNumber.length !== 12) {
//       newErrors.cardNumber = 'Card number must be 12 digits (numbers only)';
//     }
//     // MM/YY basic check (01-12 for month)
//     const expiryOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(paymentDetails.expiryDate);
//     if (!expiryOk) {
//       newErrors.expiryDate = 'Expiry must be in MM/YY format';
//     }
//     if (!paymentDetails.cvc || !numberOnly.test(paymentDetails.cvc) || paymentDetails.cvc.length !== 3) {
//       newErrors.cvc = 'CVC must be 3 digits';
//     }
//     return newErrors;
//   };

//   const handlePaymentSubmit = async (e) => {
//     e.preventDefault();
//     const validationErrors = validateForm();
//     if (Object.keys(validationErrors).length > 0) {
//       setErrors(validationErrors);
//       return;
//     }

//     try {
//       setPaying(true);
//       const res = await axios.post('http://localhost:3050/api/payment/process', {
//         residentId: localStorage.getItem('residentId'), // if you have it saved after login
//         amount: selectedRequest.amount,
//         wasteRequestIds: [selectedRequest._id],
//         ...paymentDetails,
//       }, {
//         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
//       });

//       alert(res.data?.message || 'Payment successful.');
//       // remove the paid request from table
//       setRequests((prev) => prev.filter((r) => r._id !== selectedRequest._id));
//       // reset form state
//       setShowPaymentForm(false);
//       setSelectedRequest(null);
//       setPaymentDetails({ cardHolderName: '', cardNumber: '', expiryDate: '', cvc: '' });
//     } catch (error) {
//       console.error('Payment error:', error?.response?.data || error.message);
//       alert('Failed to process payment. ' + (error?.response?.data?.message || 'Please try again.'));
//     } finally {
//       setPaying(false);
//     }
//   };

//   return (
//     <div className="payment-page-container">
//       <SidebarIcon />
//       <div className="main-content-payment">
//         <Header />
//         <div className="payment-content">

//           <h2 style={{ marginBottom: 10 }}>Pending Waste Collection Requests</h2>

//           {/* Search like your history page */}
//           <input
//             type="text"
//             placeholder="Search by waste type..."
//             value={q}
//             onChange={(e) => setQ(e.target.value)}
//             style={{
//               width: '100%',
//               padding: '10px 12px',
//               border: '1px solid #cfd8dc',
//               borderRadius: 8,
//               marginBottom: 12,
//               outline: 'none',
//             }}
//           />

//           {/* Table */}
//           <div
//             style={{
//               overflowX: 'auto',
//               border: '1px solid #e0e0e0',
//               borderRadius: 10,
//               boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
//             }}
//           >
//             <table className="payment-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
//               <thead>
//                 <tr style={{ background: '#0f4d27', color: '#fff' }}>
//                   <th style={th('left')}>DATE</th>
//                   <th style={th('left')}>TYPE OF WASTE</th>
//                   <th style={th('center')}>QUANTITY (kg)</th>
//                   <th style={th('right')}>AMOUNT ($)</th>
//                   <th style={th('center')}>ACTIONS</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   <tr><td colSpan="5" style={{ padding: 16, textAlign: 'center' }}>Loading…</td></tr>
//                 ) : loadErr ? (
//                   <tr><td colSpan="5" style={{ padding: 16, textAlign: 'center', color: '#b00020' }}>{loadErr}</td></tr>
//                 ) : view.length === 0 ? (
//                   <tr><td colSpan="5" style={{ padding: 16, textAlign: 'center', color: '#607d8b' }}>No pending requests</td></tr>
//                 ) : (
//                   view.map((request, idx) => {
//                     const amount = calculateAmount(request.wasteType, request.quantity);
//                     return (
//                       <tr key={request._id} style={{ background: idx % 2 ? '#f8fbf8' : '#ffffff' }}>
//                         <td style={td('left')}>{fmtDate(request.collectionDate)}</td>
//                         <td style={td('left')}>{request.wasteType}</td>
//                         <td style={td('center')}>{request.quantity}</td>
//                         <td style={td('right')}>{amount}</td>
//                         <td style={td('center')}>
//                           <button
//                             className="pay-button"
//                             onClick={() => handleRequestSelect(request)}
//                             style={{
//                               background: '#4caf50',
//                               color: '#fff',
//                               border: 'none',
//                               padding: '8px 16px',
//                               borderRadius: 8,
//                               cursor: 'pointer',
//                               minWidth: 88,
//                               boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
//                             }}
//                           >
//                             Pay ${amount}
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Payment form */}
//           {showPaymentForm && selectedRequest && (
//             <form className="payment-form" onSubmit={handlePaymentSubmit}>
//               <h3 className="form-header">Enter Payment Details</h3>

//               <div className="form-group">
//                 <label>Cardholder Name</label>
//                 <input
//                   type="text"
//                   name="cardHolderName"
//                   value={paymentDetails.cardHolderName}
//                   onChange={handleInputChange}
//                   required
//                 />
//                 {errors.cardHolderName && <p className="error">{errors.cardHolderName}</p>}
//               </div>

//               <div className="form-group card-input-container">
//                 <label>Card Number</label>
//                 <span className="card-input-icon"><FaCreditCard /></span>
//                 <input
//                   type="text"
//                   className="card-input"
//                   name="cardNumber"
//                   value={paymentDetails.cardNumber}
//                   onChange={handleInputChange}
//                   maxLength="12"
//                   inputMode="numeric"
//                   required
//                 />
//                 {errors.cardNumber && <p className="error">{errors.cardNumber}</p>}
//               </div>

//               <div className="expiry-cvc-container">
//                 <div className="form-group card-input-container">
//                   <label>Expiry Date</label>
//                   <span className="card-input-icon"><FaCalendarAlt /></span>
//                   <input
//                     type="text"
//                     className="card-input"
//                     name="expiryDate"
//                     value={paymentDetails.expiryDate}
//                     onChange={handleInputChange}
//                     placeholder="MM/YY"
//                     required
//                   />
//                   {errors.expiryDate && <p className="error">{errors.expiryDate}</p>}
//                 </div>

//                 <div className="form-group card-input-container">
//                   <label>CVC</label>
//                   <span className="card-input-icon"><FaLock /></span>
//                   <input
//                     type="text"
//                     className="card-input"
//                     name="cvc"
//                     value={paymentDetails.cvc}
//                     onChange={handleInputChange}
//                     maxLength="3"
//                     inputMode="numeric"
//                     required
//                   />
//                   {errors.cvc && <p className="error">{errors.cvc}</p>}
//                 </div>
//               </div>

//               <button
//                 type="submit"
//                 className="submit-payment"
//                 disabled={paying}
//                 style={{ opacity: paying ? 0.7 : 1 }}
//               >
//                 {paying ? 'Processing…' : 'Submit Payment'}
//               </button>
//             </form>
//           )}
//         </div>
//         <Footer />
//       </div>
//     </div>
//   );
// }

// // tiny inline styles so we don’t depend on external CSS being present
// function th(align) {
//   return {
//     position: 'sticky',
//     top: 0,
//     padding: '12px 14px',
//     fontWeight: 700,
//     letterSpacing: 0.6,
//     textAlign: align,
//     borderBottom: '1px solid #0d3f20',
//   };
// }
// function td(align) {
//   return {
//     padding: '12px 14px',
//     borderBottom: '1px solid #e8f0ea',
//     color: '#263238',
//     textAlign: align,
//     whiteSpace: 'nowrap',
//   };
// }

// export default PaymentPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import SidebarIcon from '../components/sidebar/SidebarIcon';
import Header from '../components/header/Header';
import Footer from '../components/Footer.js';
import './PaymentPage.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Logo from '../images/leaf.png';

// ===== Pricing structure =====
const wastePrices = {
  Glass: 15,
  Wood: 10,
  Hazardous: 60,
  Paper: 10,
  Metal: 20,
  Plastic: 30,
  Organic: 30,
  Electronics: 50,
  'Plastic - Special Pickup': 60,
  'Organic - Special Pickup': 60,
  'Metal - Special Pickup': 40,
  'Paper - Special Pickup': 20,
  'Glass - Special Pickup': 30,
  'Wood - Special Pickup': 20,
  'Electronics - Special Pickup': 100,
  'Hazardous - Special Pickup': 120,
};

const SPECIAL_WASTE_TYPES = new Set([
  'Plastic - Special Pickup',
  'Organic - Special Pickup',
  'Metal - Special Pickup',
  'Paper - Special Pickup',
  'Glass - Special Pickup',
  'Wood - Special Pickup',
  'Electronics - Special Pickup',
  'Hazardous - Special Pickup',
]);
const isSpecialPickup = (type) => SPECIAL_WASTE_TYPES.has(type);

// ===== Normalizers (keep the table shape consistent) =====
const normalizeNormal = (r) => ({
  _id: r._id,
  collectionDate: r.collectionDate || r.date || r.createdAt,
  wasteType: r.wasteType || r.type || 'Unknown',
  quantity: Number(r.quantity ?? r.qty ?? 1),
  status: r.status || 'pending',
  kind: 'normal',
});

const normalizeSpecial = (r) => ({
  _id: r._id,
  collectionDate: r.collectionDate || r.createdAt,
  wasteType: r.wasteType || 'Unknown',
  quantity: Number(r.quantity ?? 1),
  status: r.status || 'pending',
  kind: 'special',
});

function PaymentPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [lastConfirm, setLastConfirm] = useState(null);
  const [showConfirmDebug, setShowConfirmDebug] = useState(false);

  // ===== Helpers =====
  const calculateAmount = (wasteType, quantity) => {
    const pricePerUnit = wastePrices[wasteType] || 0;
    return pricePerUnit * (Number(quantity) || 0);
  };

  // ===== Fetch both normal + special, merge, only pending =====
  const fetchRequests = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

      const [normalRes, specialRes] = await Promise.allSettled([
        axios.get('http://localhost:3050/api/auth/waste/history', { headers }),
        axios.get('http://localhost:3050/api/specialPickup/my', { headers }),
      ]);

      const normal = normalRes.status === 'fulfilled' && Array.isArray(normalRes.value.data)
        ? normalRes.value.data.map(normalizeNormal)
        : [];

      const special = specialRes.status === 'fulfilled' && Array.isArray(specialRes.value.data)
        ? specialRes.value.data.map(normalizeSpecial)
        : [];

      const combined = [...normal, ...special]
        .filter((r) => r.status === 'pending')
        .sort((a, b) => new Date(b.collectionDate) - new Date(a.collectionDate));

      setRequests(combined);
    } catch (error) {
      console.error('Error fetching waste requests:', error);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  // ===== Stripe success → confirm + receipt =====
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const sessionId = params.get('session_id');

    if (status === 'success' && sessionId) {
      const tryConfirm = async (attempt = 1, maxAttempts = 5) => {
        try {
          const res = await axios.get('http://localhost:3050/api/payment/confirm', {
            params: { sessionId },
          });
          setLastConfirm(res.data);
          const session = res.data.session;

          // ---- Receipt PDF ----
          const fetchImageDataUrl = async (url) => {
            try {
              const resp = await fetch(url);
              const blob = await resp.blob();
              return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch (err) {
              console.error('Failed to fetch image for receipt', err);
              return null;
            }
          };

          const generateReceipt = async (sessionObj) => {
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });

            const logoDataUrl = await fetchImageDataUrl(Logo).catch(() => null);
            if (logoDataUrl) {
              try {
                doc.addImage(logoDataUrl, 'PNG', 40, 30, 80, 45);
              } catch (err) {
                console.error('addImage failed', err);
              }
            }

            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('Zero Waste', 140, 55);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Payment Receipt', 40, 100);

            doc.setFontSize(11);
            const invoiceId = sessionObj.id || sessionId;
            doc.text(`Receipt #: ${invoiceId}`, 40, 120);
            doc.text(`Date: ${new Date().toLocaleString()}`, 40, 135);
            doc.text(`Payment Status: ${sessionObj.payment_status || 'Paid'}`, 40, 150);

            if (sessionObj.metadata && sessionObj.metadata.residentId) {
              doc.text(`Resident ID: ${sessionObj.metadata.residentId}`, 350, 120);
            }
            const wrId = sessionObj.metadata?.wasteRequestId || 'N/A';
            doc.text(`Waste Request ID: ${wrId}`, 350, 135);

            const wr = requests.find((r) => r._id === sessionObj.metadata?.wasteRequestId) || null;
            const unitPrice = wr ? (wastePrices[wr.wasteType] || 0) : ((sessionObj.amount_total || 0) / 100);
            const qty = wr ? (wr.quantity || 1) : 1;
            const rows = [
              { desc: `Collection - ${wr ? wr.wasteType : 'Waste'}`, qty: String(qty), unit: `$${unitPrice.toFixed(2)}`, total: `$${(unitPrice * qty).toFixed(2)}` },
            ];

            let usedAutoTable = false;
            try {
              await import('jspdf-autotable');
              if (doc.autoTable) {
                doc.autoTable({
                  head: [['Description', 'Qty', 'Unit', 'Total']],
                  body: rows.map((r) => [r.desc, r.qty, r.unit, r.total]),
                  startY: 170,
                  theme: 'grid',
                  headStyles: { fillColor: [230, 230, 230], textColor: 20 },
                  styles: { fontSize: 10 },
                });
                usedAutoTable = true;
              }
            } catch {
              // plugin missing → fall back below
            }

            if (!usedAutoTable) {
              const startY = 170;
              doc.setFontSize(10);
              doc.text('Description', 40, startY);
              doc.text('Qty', 300, startY);
              doc.text('Unit', 350, startY);
              doc.text('Total', 450, startY);
              doc.text(rows[0].desc, 40, startY + 18);
              doc.text(rows[0].qty, 300, startY + 18);
              doc.text(rows[0].unit, 350, startY + 18);
              doc.text(rows[0].total, 450, startY + 18);
            }

            const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 210;
            const amountPaid = sessionObj.amount_total ? (sessionObj.amount_total / 100) : (unitPrice * qty);
            doc.setFontSize(11);
            doc.text(`Subtotal: $${(unitPrice * qty).toFixed(2)}`, 350, finalY + 10);
            doc.text(`Total Paid: $${amountPaid.toFixed(2)}`, 350, finalY + 30);

            // Simple footer
            const footerY = finalY + 60;
            doc.setFontSize(10);
            doc.text('Thank you for using Zero Waste collection services', 40, footerY);

            try {
              doc.save(`payment_receipt_${invoiceId}.pdf`);
            } catch (err) {
              console.error('Failed to save PDF', err);
            }
          };

          await generateReceipt(session);

          // Optimistically mark paid and refresh
          const wasteRequestId = session?.metadata?.wasteRequestId;
          if (wasteRequestId) {
            setRequests((prev) =>
              prev.map((r) => (r._id === wasteRequestId ? { ...r, status: 'payment complete' } : r))
            );
          }
          fetchRequests();

          // Clean the URL
          const newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (err) {
          if (attempt < maxAttempts) {
            const delay = 2000 * Math.pow(2, attempt - 1);
            setTimeout(() => tryConfirm(attempt + 1, maxAttempts), delay);
          } else {
            console.error('All confirm attempts failed. Please refresh later or check payments.');
          }
        }
      };

      tryConfirm();
    }
  }, [requests]);

  // ===== Start Stripe checkout for the selected request =====
  const handleRequestSelect = async (request) => {
    try {
      const residentId = localStorage.getItem('residentId');
      const { data } = await axios.post('http://localhost:3050/api/payment/create-checkout-session', {
        residentId,
        wasteRequestId: request._id, // backend should resolve whether it's normal/special
        // If your backend needs to know which type, also send: kind: request.kind
      });

      const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) {
        alert('Stripe failed to initialize.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      await stripe.redirectToCheckout({ sessionId: data.id });
    } catch (error) {
      console.error('Payment error:', error.response?.data || error.message);
      alert('Failed to start checkout. Please try again.');
    }
  };

  return (
    <div className="payment-page-container">
      <SidebarIcon />
      <div className="main-content-payment">
        <Header />
        <div className="payment-content">
          <div className="flex items-center justify-between">
            <h2>Waste Collection Requests</h2>
            <div>
              <button
                onClick={fetchRequests}
                className="px-3 py-1 mr-2 bg-blue-500 text-white rounded"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowConfirmDebug((prev) => !prev)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Debug
              </button>
            </div>
          </div>

          <table className="payment-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type of Waste</th>
                <th>Quantity (kg)</th>
                <th>Amount ($)</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.map((request) => {
                  const amount = calculateAmount(request.wasteType, request.quantity);
                  return (
                    <tr key={request._id}>
                      <td>{new Date(request.collectionDate).toLocaleDateString()}</td>
                      <td>{request.wasteType}</td>
                      <td>{request.quantity}</td>

                      {/* Amount + Special tag */}
                      <td className="whitespace-nowrap">
                        {amount}
                        {isSpecialPickup(request.wasteType) && (
                          <span
                            className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200 align-middle"
                            title="Special Pickup"
                          >
                            Special
                          </span>
                        )}
                      </td>

                      <td>
                        {request.status === 'payment complete' ? (
                          <span className="text-green-600 font-bold">Paid</span>
                        ) : (
                          <span className="text-yellow-600 font-semibold">Pending</span>
                        )}
                      </td>
                      <td>
                        <button className="pay-button" onClick={() => handleRequestSelect(request)}>
                          Pay ${amount}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6">No requests</td>
                </tr>
              )}
            </tbody>
          </table>

          {showConfirmDebug && lastConfirm && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-bold">Last Confirm Response (debug)</h3>
              <pre className="text-xs overflow-auto">{JSON.stringify(lastConfirm, null, 2)}</pre>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default PaymentPage;
