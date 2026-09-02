import React, { useEffect, useState, useRef } from 'react';
import { Medicine, CartItem, PaymentMethod, Bill, HeldBill } from '../../../shared/types';
import { apiService } from '../services/api';
import { OfflineEngine } from '../services/offlineEngine';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { HeldBillsModal } from '../components/HeldBillsModal';
import { HoldBillPromptModal } from '../components/HoldBillPromptModal';
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
  MapPin,
  Printer,
  FileText,
  Pill,
  Pause,
  Play
} from 'lucide-react';

export const BillingPOS: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    try {
      const saved = localStorage.getItem('pharmacy_held_bills');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHeldBillsModal, setShowHeldBillsModal] = useState<boolean>(false);
  const [showHoldPromptModal, setShowHoldPromptModal] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper to sync held bills across localStorage and offline JSON disk storage
  const updateAndPersistHeldBills = (newBills: HeldBill[]) => {
    setHeldBills(newBills);
    try {
      localStorage.setItem('pharmacy_held_bills', JSON.stringify(newBills));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
    OfflineEngine.writeJson('held-bills.json', 'pharmacy_held_bills', newBills);
  };

  useEffect(() => {
    const restoreHeldBills = async () => {
      try {
        const diskBills = await OfflineEngine.readJson<HeldBill[]>('held-bills.json', 'pharmacy_held_bills', []);
        if (Array.isArray(diskBills) && diskBills.length > 0) {
          setHeldBills(diskBills);
          localStorage.setItem('pharmacy_held_bills', JSON.stringify(diskBills));
        }
      } catch (err) {
        console.error('Failed to restore held bills:', err);
      }
    };
    restoreHeldBills();
  }, []);

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
    if (e.key === 'Enter') {
      loadAvailableMedicines(searchTerm);
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
      const existingIndex = prevCart.findIndex(item => item.medicineId === med.id);
      
      if (existingIndex !== -1) {
        const existing = prevCart[existingIndex];
        const newPkgQty = initialUnitType === 'PACKAGE' ? existing.packageQuantity + 1 : existing.packageQuantity;
        const newLooseQty = initialUnitType === 'LOOSE' ? existing.looseQuantity + 1 : existing.looseQuantity;
        const requiredBaseUnits = (newPkgQty * unitsPerPkg) + newLooseQty;

        if (requiredBaseUnits > med.quantity) {
          setError(`Cannot add more than available stock (${med.quantity} base units) for '${med.name}'.`);
          return prevCart;
        }

        const updated = [...prevCart];
        updated[existingIndex] = {
          ...existing,
          packageQuantity: newPkgQty,
          looseQuantity: newLooseQty,
          quantity: requiredBaseUnits
        };
        return updated;
      } else {
        const newPkgQty = initialUnitType === 'PACKAGE' ? 1 : 0;
        const newLooseQty = initialUnitType === 'LOOSE' ? 1 : 0;
        const requiredBaseUnits = (newPkgQty * unitsPerPkg) + newLooseQty;

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
            sellingPrice: med.sellingPrice,
            packageQuantity: newPkgQty,
            looseQuantity: newLooseQty,
            quantity: requiredBaseUnits,
            unitType: initialUnitType,
            unitsPerPackage: unitsPerPkg,
            looseUnitName: med.looseUnitName || 'Tablet',
            packageType: med.packageType || 'Strip',
            sellingMode: med.sellingMode || 'FULL_PACKAGE_ONLY',
            availableQuantity: med.quantity,
            barcode: med.barcode
          }
        ];
      }
    });

    setSearchTerm('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prevCart => prevCart.filter(item => item.medicineId !== medicineId));
  };

  const updateCartItemQuantities = (medicineId: string, newPkgQty: number, newLooseQty: number) => {
    setError(null);
    const pkgQty = Math.max(0, newPkgQty);
    const looseQty = Math.max(0, newLooseQty);

    if (pkgQty === 0 && looseQty === 0) {
      removeFromCart(medicineId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.medicineId === medicineId) {
          const unitsPerPkg = item.unitsPerPackage || 1;
          const requiredBaseUnits = (pkgQty * unitsPerPkg) + looseQty;

          if (requiredBaseUnits > item.availableQuantity) {
            setError(`Stock limit reached for '${item.name}'. Available: ${item.availableQuantity} base units.`);
            return item;
          }

          return {
            ...item,
            packageQuantity: pkgQty,
            looseQuantity: looseQty,
            quantity: requiredBaseUnits
          };
        }
        return item;
      })
    );
  };

  const handleOpenHoldModal = () => {
    if (cart.length === 0) {
      setError('Cart is empty. Add items before holding a bill.');
      return;
    }
    setShowHoldPromptModal(true);
  };

  const confirmHoldCart = (customerNameNote?: string) => {
    if (cart.length === 0) return;

    const newHeldBill: HeldBill = {
      id: `hold-${Date.now()}`,
      customerName: customerNameNote,
      cart: [...cart],
      discountPercentage,
      paymentMethod,
      subtotal,
      heldAt: new Date().toISOString()
    };

    const updated = [newHeldBill, ...heldBills];
    updateAndPersistHeldBills(updated);
    setCart([]);
    setDiscountAmount(0);
    setDiscountPercentage(0);
    setError(null);
    setShowHoldPromptModal(false);
  };

  const handleResumeHeldBill = (heldBillId: string) => {
    const target = heldBills.find(b => b.id === heldBillId);
    if (!target) return;

    let updatedHeld = heldBills.filter(b => b.id !== heldBillId);

    // If current active cart has items, preserve active cart into held bills automatically
    if (cart.length > 0) {
      const activeCartAsHeld: HeldBill = {
        id: `hold-${Date.now()}`,
        customerName: 'Active Sale (Held on Resume)',
        cart: [...cart],
        discountPercentage,
        paymentMethod,
        subtotal,
        heldAt: new Date().toISOString()
      };
      updatedHeld = [activeCartAsHeld, ...updatedHeld];
    }

    setCart(target.cart);
    setDiscountPercentage(target.discountPercentage || 0);
    setPaymentMethod(target.paymentMethod || 'CASH');
    updateAndPersistHeldBills(updatedHeld);
    setShowHeldBillsModal(false);
    setError(null);
  };

  const handleDeleteHeldBill = (heldBillId: string) => {
    const updated = heldBills.filter(b => b.id !== heldBillId);
    updateAndPersistHeldBills(updated);
  };

  const handleClearAllHeldBills = () => {
    updateAndPersistHeldBills([]);
  };

  // Computations
  const subtotal = cart.reduce((sum, item) => {
    const unitsPerPkg = Math.max(1, item.unitsPerPackage || 1);
    const looseUnitPrice = (Number(item.sellingPrice) || 0) / unitsPerPkg;
    const pkgTotal = (item.packageQuantity || 0) * (Number(item.sellingPrice) || 0);
    const looseTotal = (item.looseQuantity || 0) * looseUnitPrice;
    return sum + pkgTotal + looseTotal;
  }, 0);

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
          packageQuantity: item.packageQuantity || 0,
          looseQuantity: item.looseQuantity || 0,
          quantity: (item.packageQuantity || 0) + (item.looseQuantity || 0),
          unitType: item.packageQuantity > 0 && item.looseQuantity > 0 ? 'BOTH' : (item.packageQuantity > 0 ? 'PACKAGE' : 'LOOSE'),
          unitsPerPackage: item.unitsPerPackage || 1,
          looseUnitName: item.looseUnitName || 'Tablet',
          packageType: item.packageType || 'Strip',
          barcode: item.barcode || ''
        })),
        discountAmount: computedDiscount,
        discountPercentage,
        paymentMethod
      });

      if (res.success && res.bill) {
        setCompletedBill(res.bill);
        setShowPrintModal(false);
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

  // If a sale was just completed, show the Sale Success Screen
  if (completedBill) {
    return (
      <div style={{ maxWidth: '720px', margin: '20px auto', padding: '0 16px' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #CBD5E1',
            padding: '36px 32px',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
            textAlign: 'center'
          }}
        >
          {/* Animated Success Icon */}
          <div
            style={{
              width: '76px',
              height: '76px',
              background: '#ECFDF5',
              borderRadius: '50%',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              border: '4px solid #D1FAE5',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
            }}
          >
            <CheckCircle2 size={42} />
          </div>

          <span
            style={{
              display: 'inline-block',
              background: '#D1FAE5',
              color: '#065F46',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 14px',
              borderRadius: '20px',
              marginBottom: '10px'
            }}
          >
            ✓ SALE COMPLETED SUCCESSFULLY
          </span>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
            Payment Received
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 26px 0' }}>
            Inventory stock deducted & sale logged. Issue a bill if requested by the customer.
          </p>

          {/* Invoice Summary Card */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              textAlign: 'left',
              marginBottom: '28px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Invoice Number
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: '#0F766E', marginTop: '2px' }}>
                  {completedBill.invoiceNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Total Paid
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F766E', marginTop: '2px' }}>
                  ₹{(completedBill.totalAmount || 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', fontSize: '13px', marginBottom: '16px' }}>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px', display: 'block', fontWeight: 600 }}>Payment Method</span>
                <span className="badge badge-in-stock" style={{ marginTop: '4px', display: 'inline-block', fontSize: '11px', fontWeight: 700 }}>
                  {completedBill.paymentMethod}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px', display: 'block', fontWeight: 600 }}>Date & Time</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '12px' }}>
                  {completedBill.date} ({completedBill.time})
                </span>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px', display: 'block', fontWeight: 600 }}>Line Items</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '12px' }}>
                  {completedBill.items.length} item(s)
                </span>
              </div>
            </div>

            {/* Itemized List */}
            <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Purchased Items:
              </div>
              <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                {completedBill.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#334155',
                      padding: '5px 0',
                      borderBottom: idx < completedBill.items.length - 1 ? '1px solid #F1F5F9' : 'none'
                    }}
                  >
                    <span>
                      <strong style={{ color: '#0F172A' }}>{item.name}</strong> × {item.quantity} {item.unitType === 'LOOSE' ? (item.looseUnitName || 'Unit') : 'Package'}
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F766E' }}>
                      ₹{((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              style={{
                background: '#0F766E',
                borderColor: '#0F766E',
                padding: '12px 26px',
                fontSize: '15px',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={() => setShowPrintModal(true)}
            >
              <Printer size={18} />
              <span>Issue Bill / Print Receipt</span>
            </button>

            <button
              className="btn btn-secondary btn-lg"
              style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => {
                setCompletedBill(null);
                setShowPrintModal(false);
              }}
            >
              <Plus size={18} />
              <span>Start New Sale</span>
            </button>
          </div>
        </div>

        {/* Modal for Printing if customer requests bill */}
        {showPrintModal && (
          <PrintInvoiceModal
            bill={completedBill}
            onClose={() => setShowPrintModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '20px', height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
      {/* LEFT COLUMN: Medicine Search & Directory Grid (Independent Scroll) */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingRight: '6px' }}>
        {/* Sticky Search Header Box */}
        <div className="table-container" style={{ padding: '14px', marginBottom: '14px', background: '#FFFFFF', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
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
            const looseName = med.looseUnitName || 'Tablet';
            const pkgName = med.packageType || 'Strip';
            const loosePrice = Math.round(((med.sellingPrice || 0) / unitsPerPkg) * 100) / 100;

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

                  {/* 1 Strip Quantity Highlight Badge */}
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#1D4ED8',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginBottom: '8px'
                    }}
                  >
                    <Pill size={13} color="#2563EB" />
                    <span>1 {pkgName} = {unitsPerPkg} {looseName}s</span>
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
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F766E', lineHeight: 1.2 }}>
                        ₹{(Number(med.sellingPrice) || 0).toFixed(2)}
                        <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}> / {pkgName}</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                        (₹{loosePrice.toFixed(2)} / {looseName})
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                      {pkgQty > 0 ? `${pkgQty} ${pkgName}s` : ''}
                      {looseQty > 0 ? ` + ${looseQty} ${looseName}` : ''}
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

      {/* RIGHT COLUMN: POS Sales Counter Cart Panel (Independent Scroll + Fixed Footer) */}
      <div className="pos-cart-panel" style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Fixed Cart Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} color="var(--primary-blue)" />
            <h3 style={{ fontSize: '15.5px', fontWeight: 700, margin: 0 }}>POS Sales Counter</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Held Bills Manager Drawer Button */}
            {heldBills.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  background: '#FEF3C7',
                  color: '#B45309',
                  borderColor: '#FDE68A',
                  fontWeight: 700,
                  fontSize: '12px',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '8px'
                }}
                onClick={() => setShowHeldBillsModal(true)}
                title="View held bills"
              >
                <Pause size={14} color="#D97706" />
                <span>Held Bills ({heldBills.length})</span>
              </button>
            )}

            {/* Hold Current Bill Button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '12px',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px'
              }}
              disabled={cart.length === 0}
              onClick={handleOpenHoldModal}
              title="Put current sale on hold and start new sale"
            >
              <Pause size={14} />
              <span>Hold Bill</span>
            </button>
          </div>
        </div>

        {/* Cart Items List - INDEPENDENT SCROLL AREA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Cart is empty. Scan barcode or click a medicine to add.
            </div>
          ) : (
            cart.map((item) => {
              const unitsPerPkg = Math.max(1, item.unitsPerPackage || 1);
              const pkgPrice = Number(item.sellingPrice) || 0;
              const loosePrice = Math.round((pkgPrice / unitsPerPkg) * 100) / 100;
              const itemTotal = ((item.packageQuantity || 0) * pkgPrice) + ((item.looseQuantity || 0) * loosePrice);

              return (
                <div
                  key={item.medicineId}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid #F1F5F9',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    border: '1px solid #CBD5E1'
                  }}
                >
                  {/* Item Header & Delete Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace' }}>{item.code}</span>
                        <span>|</span>
                        <span>₹{pkgPrice.toFixed(2)} / {item.packageType || 'Strip'}</span>
                        {item.sellingMode === 'FULL_PACKAGE_AND_LOOSE' && (
                          <>
                            <span>•</span>
                            <span>₹{loosePrice.toFixed(2)} / {item.looseUnitName || 'Tablet'}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0F766E', textAlign: 'right' }}>
                        ₹{itemTotal.toFixed(2)}
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#DC2626', padding: '4px 6px', borderRadius: '6px' }}
                        onClick={() => removeFromCart(item.medicineId)}
                        title="Remove Item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Dual Quantity Inputs Area */}
                  <div style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Package Quantity Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📦 {item.packageType || 'Strip'}s (Full):</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', height: '26px' }}
                          onClick={() => updateCartItemQuantities(item.medicineId, item.packageQuantity - 1, item.looseQuantity)}
                          title="Decrease full strips"
                        >
                          <Minus size={11} />
                        </button>

                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          style={{
                            width: '52px',
                            height: '26px',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '12.5px',
                            padding: '2px 4px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A'
                          }}
                          value={item.packageQuantity === 0 ? '0' : item.packageQuantity}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            updateCartItemQuantities(item.medicineId, isNaN(val) ? 0 : val, item.looseQuantity);
                          }}
                        />

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', height: '26px' }}
                          onClick={() => updateCartItemQuantities(item.medicineId, item.packageQuantity + 1, item.looseQuantity)}
                          title="Increase full strips"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Loose Unit Quantity Row (Only if FULL_PACKAGE_AND_LOOSE) */}
                    {item.sellingMode === 'FULL_PACKAGE_AND_LOOSE' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px dashed #F1F5F9', paddingTop: '4px' }}>
                        <span style={{ color: '#0F766E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>💊 Loose {item.looseUnitName || 'Tablet'}s:</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', height: '26px' }}
                            onClick={() => updateCartItemQuantities(item.medicineId, item.packageQuantity, item.looseQuantity - 1)}
                            title="Decrease loose tablets"
                          >
                            <Minus size={11} />
                          </button>

                          <input
                            type="number"
                            min="0"
                            className="form-control"
                            style={{
                              width: '52px',
                              height: '26px',
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '12.5px',
                              padding: '2px 4px',
                              borderRadius: '6px',
                              border: '1px solid #99F6E4',
                              color: '#0F766E',
                              background: '#F0FDF4'
                            }}
                            value={item.looseQuantity === 0 ? '0' : item.looseQuantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              updateCartItemQuantities(item.medicineId, item.packageQuantity, isNaN(val) ? 0 : val);
                            }}
                          />

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', height: '26px' }}
                            onClick={() => updateCartItemQuantities(item.medicineId, item.packageQuantity, item.looseQuantity + 1)}
                            title="Increase loose tablets"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '10.5px', color: '#64748B', fontStyle: 'italic', borderTop: '1px dashed #F1F5F9', paddingTop: '4px' }}>
                        Full package sales only
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Fixed Summary & Payment Selection Footer */}
        <div style={{ padding: '14px 16px', background: '#F8FAFC', borderTop: '1px solid var(--border-color)', flexShrink: 0, borderRadius: '0 0 12px 12px' }}>
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

      {/* HeldBillsModal Dialog */}
      {showHeldBillsModal && (
        <HeldBillsModal
          heldBills={heldBills}
          onClose={() => setShowHeldBillsModal(false)}
          onResume={handleResumeHeldBill}
          onDelete={handleDeleteHeldBill}
          onClearAll={handleClearAllHeldBills}
        />
      )}

      {/* HoldBillPromptModal Dialog */}
      {showHoldPromptModal && (
        <HoldBillPromptModal
          itemCount={cart.reduce((sum, i) => sum + (i.packageQuantity || 0) + (i.looseQuantity || 0), 0)}
          subtotal={subtotal}
          onConfirm={confirmHoldCart}
          onClose={() => setShowHoldPromptModal(false)}
        />
      )}
    </div>
  );
};
