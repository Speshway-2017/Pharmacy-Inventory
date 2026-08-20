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
  Banknote,
  MapPin
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

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && medicines.length > 0) {
      addToCart(medicines[0]);
    }
  };

  const addToCart = (med: Medicine, initialUnitType: 'PACKAGE' | 'LOOSE' = 'PACKAGE') => {
    setError(null);

    // Expired check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(med.expiryDate);
    expDate.setHours(0, 0, 0, 0);

    if (expDate < today || med.status === 'EXPIRED') {
      setError(`Cannot add expired medicine '${med.name}' (Batch: ${med.batchNumber}, Expiry: ${med.expiryDate}).`);
      return;
    }

    if (med.quantity <= 0) {
      setError(`Medicine '${med.name}' is out of stock (0 base units remaining).`);
      return;
    }

    const unitsPerPkg = Math.max(1, med.unitsPerPackage || 1);
    const isLoose = initialUnitType === 'LOOSE';
    const loosePrice = Math.round((med.sellingPrice / unitsPerPkg) * 100) / 100;
    const unitPrice = isLoose ? loosePrice : med.sellingPrice;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(item => item.medicineId === med.id && item.unitType === initialUnitType);
      
      if (existingIndex !== -1) {
        const existing = prevCart[existingIndex];
        const newQty = existing.quantity + 1;
        const requiredBaseUnits = initialUnitType === 'PACKAGE' ? (newQty * unitsPerPkg) : newQty;

        if (requiredBaseUnits > med.quantity) {
          setError(`Cannot add more than available stock (${med.quantity} base units) for '${med.name}'.`);
          return prevCart;
        }

        const updated = [...prevCart];
        updated[existingIndex] = { ...existing, quantity: newQty };
        return updated;
      } else {
        const requiredBaseUnits = initialUnitType === 'PACKAGE' ? (1 * unitsPerPkg) : 1;
        if (requiredBaseUnits > med.quantity) {
          setError(`Insufficient stock for '${med.name}'.`);
          return prevCart;
        }

        return [
          ...prevCart,
          {
            medicineId: med.id,
            code: med.code || `MED-${med.id.slice(-6).toUpperCase()}`,
            name: med.name,
            genericName: med.genericName,
            batchNumber: med.batchNumber,
            expiryDate: med.expiryDate,
            mrp: med.mrp,
            sellingPrice: unitPrice,
            quantity: 1,
            unitType: initialUnitType,
            unitsPerPackage: unitsPerPkg,
            looseUnitName: med.looseUnitName || 'Tablet',
            availableQuantity: med.quantity,
            barcode: med.barcode
          }
        ];
      }
    });

    setSearchTerm('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const toggleUnitType = (medicineId: string, currentUnitType: 'PACKAGE' | 'LOOSE') => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.medicineId === medicineId) {
          const newUnitType: 'PACKAGE' | 'LOOSE' = currentUnitType === 'PACKAGE' ? 'LOOSE' : 'PACKAGE';
          const unitsPerPkg = item.unitsPerPackage || 1;
          const origMed = medicines.find(m => m.id === medicineId);
          const fullPkgPrice = origMed?.sellingPrice || item.sellingPrice;
          const loosePrice = Math.round((fullPkgPrice / unitsPerPkg) * 100) / 100;

          const newUnitPrice = newUnitType === 'PACKAGE' ? fullPkgPrice : loosePrice;
          const requiredBaseUnits = newUnitType === 'PACKAGE' ? (item.quantity * unitsPerPkg) : item.quantity;

          if (requiredBaseUnits > item.availableQuantity) {
            setError(`Cannot switch unit type. Stock available is ${item.availableQuantity} base units.`);
            return item;
          }

          return {
            ...item,
            unitType: newUnitType,
            sellingPrice: newUnitPrice
          };
        }
        return item;
      })
    );
  };

  const updateCartQuantity = (medicineId: string, unitType: 'PACKAGE' | 'LOOSE', newQty: number) => {
    setError(null);
    if (newQty <= 0) {
      removeFromCart(medicineId, unitType);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.medicineId === medicineId && item.unitType === unitType) {
          const unitsPerPkg = item.unitsPerPackage || 1;
          const requiredBaseUnits = unitType === 'PACKAGE' ? (newQty * unitsPerPkg) : newQty;

          if (requiredBaseUnits > item.availableQuantity) {
            setError(`Stock limit reached for '${item.name}'. Available: ${item.availableQuantity} base units.`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (medicineId: string, unitType: 'PACKAGE' | 'LOOSE') => {
    setCart(prevCart => prevCart.filter(item => !(item.medicineId === medicineId && item.unitType === unitType)));
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
          code: item.code || '',
          name: item.name,
          genericName: item.genericName || item.name,
          unitPrice: Number(item.sellingPrice) || 0,
          quantity: Number(item.quantity) || 1,
          unitType: item.unitType || 'PACKAGE',
          unitsPerPackage: item.unitsPerPackage || 1,
          looseUnitName: item.looseUnitName || 'Tablet',
          barcode: item.barcode || ''
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
      setError(err.message || 'Billing transaction failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
      {/* LEFT COLUMN: Medicine Search & Directory Grid */}
      <div>
        {/* Search Header Box */}
        <div className="table-container" style={{ padding: '16px', marginBottom: '16px', background: '#FFFFFF' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '12px' }} />
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              style={{ paddingLeft: '40px', fontSize: '15px', height: '44px' }}
              placeholder="Scan barcode or type code (MED-xxx), name, strength..."
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
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Medicines Results Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {medicines.map((med) => {
            const isExpired = new Date(med.expiryDate) < new Date() || med.status === 'EXPIRED';
            const isOutOfStock = med.quantity <= 0;
            const unitsPerPkg = Math.max(1, med.unitsPerPackage || 1);
            const pkgQty = Math.floor(med.quantity / unitsPerPkg);
            const looseQty = med.quantity % unitsPerPkg;

            return (
              <div
                key={med.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: isExpired || isOutOfStock ? 0.6 : 1
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: 'var(--primary-blue)' }}>
                      {med.code || `MED-${med.id.slice(-6).toUpperCase()}`}
                    </span>
                    <span style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                      {med.category}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {med.name} {med.strength ? `(${med.strength})` : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {med.genericName} | {med.dosageForm || 'Tablet'}
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span>Batch: <strong style={{ fontFamily: 'monospace' }}>{med.batchNumber}</strong></span>
                    <span>Exp: <strong>{med.expiryDate}</strong></span>
                  </div>

                  {med.rack && (
                    <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={10} color="#7C3AED" />
                      <span>Rack {med.rack} {med.row ? `→ R-${med.row}` : ''} {med.shelfBin ? `→ Bin ${med.shelfBin}` : ''}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F766E' }}>
                      ₹{(Number(med.sellingPrice) || 0).toFixed(2)}
                      <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 400 }}> / {med.packageType || 'Strip'}</span>
                    </div>
                    <div style={{ fontSize: '11px', textAlign: 'right', fontWeight: 600 }}>
                      {pkgQty > 0 ? `${pkgQty} ${med.packageType || 'Strip'}s ` : ''}
                      {looseQty > 0 ? `+ ${looseQty} ${med.looseUnitName || 'tbl'}` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      disabled={isExpired || isOutOfStock}
                      onClick={() => addToCart(med, 'PACKAGE')}
                    >
                      <Plus size={13} />
                      <span>Add {med.packageType || 'Strip'}</span>
                    </button>

                    {med.sellingMode === 'FULL_PACKAGE_AND_LOOSE' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={isExpired || isOutOfStock}
                        onClick={() => addToCart(med, 'LOOSE')}
                        title={`Add Loose ${med.looseUnitName || 'Unit'}`}
                      >
                        <span>+ Loose</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Sales Counter Cart Panel */}
      <div className="pos-cart-panel" style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
        {/* Cart Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="var(--primary-blue)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>POS Sales Counter</h3>
          </div>
          <span className="badge badge-in-stock" style={{ fontSize: '12px' }}>{cart.length} line items</span>
        </div>

        {/* Cart Items List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Cart is empty. Scan barcode or click a medicine to add.
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.medicineId}-${item.unitType}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderBottom: '1px solid #F1F5F9',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{item.code}</span>
                    <span>|</span>
                    <span>₹{(Number(item.sellingPrice) || 0).toFixed(2)} / {item.unitType === 'LOOSE' ? (item.looseUnitName || 'Unit') : 'Package'}</span>
                  </div>

                  {/* Unit Mode Switcher Pill */}
                  <div style={{ display: 'inline-flex', gap: '4px', marginTop: '6px', background: '#E2E8F0', padding: '2px', borderRadius: '6px' }}>
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        background: item.unitType === 'PACKAGE' ? '#FFFFFF' : 'transparent',
                        fontWeight: item.unitType === 'PACKAGE' ? 700 : 400,
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleUnitType(item.medicineId, 'LOOSE')}
                    >
                      Full Package
                    </button>
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        background: item.unitType === 'LOOSE' ? '#FFFFFF' : 'transparent',
                        fontWeight: item.unitType === 'LOOSE' ? 700 : 400,
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleUnitType(item.medicineId, 'PACKAGE')}
                    >
                      Loose {item.looseUnitName || 'Unit'}
                    </button>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 10px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px' }}
                    onClick={() => updateCartQuantity(item.medicineId, item.unitType || 'PACKAGE', item.quantity - 1)}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '14px', width: '24px', textAlign: 'center' }}>{item.quantity}</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 6px' }}
                    onClick={() => updateCartQuantity(item.medicineId, item.unitType || 'PACKAGE', item.quantity + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Line Total */}
                <div style={{ fontWeight: 800, fontSize: '13px', width: '70px', textAlign: 'right', color: '#0F766E' }}>
                  ₹{(item.sellingPrice * item.quantity).toFixed(2)}
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#DC2626', padding: '4px', marginLeft: '6px' }}
                  onClick={() => removeFromCart(item.medicineId, item.unitType || 'PACKAGE')}
                  title="Remove Item"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary & Payment Selection */}
        <div style={{ padding: '16px', background: '#F8FAFC', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 12px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
            <span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Discount (%):</span>
            <input
              type="number"
              min="0"
              max="100"
              className="form-control"
              style={{ width: '80px', height: '30px', textAlign: 'right', padding: '4px' }}
              value={discountPercentage}
              onChange={e => setDiscountPercentage(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '18px', fontWeight: 800, color: '#0F766E', borderTop: '1px dashed #CBD5E1', paddingTop: '8px' }}>
            <span>NET TOTAL:</span>
            <span>₹{netTotal.toFixed(2)}</span>
          </div>

          {/* Payment Method Radio Buttons */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#475569' }}>Select Payment Method</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${paymentMethod === 'CASH' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px', fontSize: '12px', justifyContent: 'center' }}
                onClick={() => setPaymentMethod('CASH')}
              >
                <Banknote size={14} />
                <span>CASH</span>
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'UPI' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px', fontSize: '12px', justifyContent: 'center' }}
                onClick={() => setPaymentMethod('UPI')}
              >
                <QrCode size={14} />
                <span>UPI</span>
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'CARD' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px', fontSize: '12px', justifyContent: 'center' }}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard size={14} />
                <span>CARD</span>
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={cart.length === 0 || loading}
            onClick={handleCompleteBill}
          >
            <CheckCircle2 size={18} />
            <span>{loading ? 'Processing Sale...' : `Complete Sale (₹${netTotal.toFixed(2)})`}</span>
          </button>
        </div>
      </div>

      {/* Completed Bill Print Modal */}
      {completedBill && (
        <PrintInvoiceModal
          bill={completedBill}
          onClose={() => setCompletedBill(null)}
        />
      )}
    </div>
  );
};
