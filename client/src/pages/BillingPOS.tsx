import React, { useEffect, useState, useRef } from 'react';
import { Medicine, CartItem, PaymentMethod, Bill } from '../../../shared/types';
import { apiService } from '../services/api';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import {
  Search,
  Barcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  Banknote
} from 'lucide-react';

export const BillingPOS: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto focus search field on mount for fast cashier usage
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    loadAvailableMedicines();
  }, []);

  const loadAvailableMedicines = async (query: string = '') => {
    try {
      const res = await apiService.getMedicines({ search: query });
      if (res.success) {
        setMedicines(res.medicines);
      }
    } catch (err) {
      console.error('Failed to search medicines:', err);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    loadAvailableMedicines(val);
  };

  // Barcode / Fast Add
  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && medicines.length > 0) {
      // Add first matching item
      addToCart(medicines[0]);
    }
  };

  const addToCart = (med: Medicine) => {
    setError(null);

    // Business Rule Check: Cannot sell expired medicines!
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(med.expiryDate);
    expDate.setHours(0, 0, 0, 0);

    if (expDate < today || med.status === 'EXPIRED') {
      setError(`Cannot add expired medicine '${med.name}' (Batch: ${med.batchNumber}, Expiry: ${med.expiryDate}).`);
      return;
    }

    // Business Rule Check: Cannot sell 0 stock medicines!
    if (med.quantity <= 0) {
      setError(`Medicine '${med.name}' is out of stock (0 units remaining).`);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(item => item.medicineId === med.id);
      if (existingIndex !== -1) {
        const existing = prevCart[existingIndex];
        const newQty = existing.quantity + 1;

        if (newQty > med.quantity) {
          setError(`Cannot add more than available stock (${med.quantity} units) for '${med.name}'.`);
          return prevCart;
        }

        const updated = [...prevCart];
        updated[existingIndex] = { ...existing, quantity: newQty };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            medicineId: med.id,
            name: med.name,
            genericName: med.genericName,
            batchNumber: med.batchNumber,
            expiryDate: med.expiryDate,
            mrp: med.mrp,
            sellingPrice: med.sellingPrice,
            quantity: 1,
            availableQuantity: med.quantity,
            barcode: med.barcode
          }
        ];
      }
    });

    setSearchTerm('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const updateCartQuantity = (medicineId: string, newQty: number) => {
    setError(null);
    if (newQty <= 0) {
      removeFromCart(medicineId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.medicineId === medicineId) {
          if (newQty > item.availableQuantity) {
            setError(`Stock limit reached for '${item.name}'. Available: ${item.availableQuantity}`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prevCart => prevCart.filter(item => item.medicineId !== medicineId));
  };

  // Computations
  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);

  let computedDiscount = discountAmount;
  if (discountPercentage > 0) {
    computedDiscount = (subtotal * discountPercentage) / 100;
  }

  const netTotal = Math.max(0, subtotal - computedDiscount);

  const handleCompleteBill = async () => {
    if (cart.length === 0) {
      setError('Cart is empty. Please add items to create a bill.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiService.createBill({
        items: cart.map(item => ({
          medicineId: item.medicineId,
          name: item.name,
          unitPrice: item.sellingPrice,
          quantity: item.quantity,
          barcode: item.barcode
        })),
        discountAmount: computedDiscount,
        discountPercentage,
        paymentMethod
      });

      if (res.success && res.bill) {
        setCompletedBill(res.bill);
        setCart([]);
        setDiscountAmount(0);
        setDiscountPercentage(0);
        loadAvailableMedicines();
      }
    } catch (err: any) {
      setError(err.message || 'Bill creation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-container">
      {/* LEFT COLUMN: Search & Select Medicine */}
      <div className="pos-search-panel">
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Barcode size={20} color="var(--primary-teal)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Scan Barcode / Search Medicine</h3>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              style={{ paddingLeft: '40px', fontSize: '15px', fontWeight: 500 }}
              placeholder="Scan barcode or type medicine name / batch..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDownSearch}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '10px 16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #FCA5A5'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Medicine Results Grid */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#F8FAFC' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {medicines.map((med) => {
              const isExpired = med.status === 'EXPIRED';
              const isLow = med.quantity <= 0;

              return (
                <div
                  key={med.id}
                  onClick={() => addToCart(med)}
                  style={{
                    background: isExpired ? '#FEF2F2' : '#FFFFFF',
                    border: isExpired ? '1px solid #FCA5A5' : '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '14px',
                    cursor: isExpired || isLow ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '14px', color: isExpired ? '#DC2626' : 'var(--text-primary)' }}>
                    {med.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {med.genericName} | Batch: {med.batchNumber}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary-blue)' }}>
                      ₹{med.sellingPrice.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: isLow ? '#DC2626' : '#16A34A' }}>
                      {isExpired ? 'EXPIRED' : `${med.quantity} in stock`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Current Bill Cart Panel */}
      <div className="pos-cart-panel">
        {/* Cart Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="var(--primary-blue)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Current Bill</h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cart.length} items</span>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Cart is empty. Scan barcode or click a medicine to add.
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.medicineId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  borderBottom: '1px solid #F1F5F9',
                  background: '#FFFFFF',
                  borderRadius: '6px',
                  marginBottom: '6px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Batch: {item.batchNumber} | ₹{item.sellingPrice.toFixed(2)} each
                  </div>
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 12px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px' }}
                    onClick={() => updateCartQuantity(item.medicineId, item.quantity - 1)}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 700, width: '24px', textAlign: 'center' }}>{item.quantity}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px' }}
                    onClick={() => updateCartQuantity(item.medicineId, item.quantity + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Line Total */}
                <div style={{ fontWeight: 700, fontSize: '13px', width: '70px', textAlign: 'right' }}>
                  ₹{(item.sellingPrice * item.quantity).toFixed(2)}
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#DC2626', padding: '4px', marginLeft: '6px' }}
                  onClick={() => removeFromCart(item.medicineId)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Payment Selection */}
        <div style={{ padding: '16px', background: '#F8FAFC', borderTop: '1px solid var(--border-color)' }}>
          {/* Subtotal & Discount */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
            <span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Discount (₹):</span>
            <input
              type="number"
              min="0"
              className="form-control"
              style={{ width: '100px', padding: '4px 8px', textAlign: 'right' }}
              value={discountAmount}
              onChange={e => {
                setDiscountAmount(Number(e.target.value) || 0);
                setDiscountPercentage(0);
              }}
            />
          </div>

          {/* NET TOTAL */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderTop: '1px dashed #CBD5E1', paddingTop: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800 }}>TOTAL AMOUNT</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-blue)' }}>
              ₹{netTotal.toFixed(2)}
            </span>
          </div>

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
              Select Payment Method:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px', fontSize: '12px' }}
                onClick={() => setPaymentMethod('CASH')}
              >
                <Banknote size={14} />
                <span>CASH</span>
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'UPI' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px', fontSize: '12px' }}
                onClick={() => setPaymentMethod('UPI')}
              >
                <QrCode size={14} />
                <span>UPI</span>
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'CARD' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px', fontSize: '12px' }}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard size={14} />
                <span>CARD</span>
              </button>
            </div>
          </div>

          {/* Complete Bill Primary Button */}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', height: '48px' }}
            onClick={handleCompleteBill}
            disabled={loading || cart.length === 0}
          >
            <CheckCircle2 size={18} />
            <span>{loading ? 'Processing Bill...' : 'COMPLETE BILL & PRINT'}</span>
          </button>
        </div>
      </div>

      {/* Invoice Modal Popup */}
      {completedBill && (
        <PrintInvoiceModal
          bill={completedBill}
          onClose={() => setCompletedBill(null)}
        />
      )}
    </div>
  );
};
