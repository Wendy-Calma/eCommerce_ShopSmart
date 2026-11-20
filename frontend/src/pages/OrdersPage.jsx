import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const formatPeso = (value) => `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function OrdersPage() {
  const { user, checking } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    setError('');
    api.getOrders()
      .then((data) => { if (active) setOrders(data.orders); })
      .catch((caught) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [user]);

  if (checking) return <section><StatusMessage>Checking your session…</StatusMessage></section>;
  if (!user) return (
    <section>
      <div className="empty-state">
        <h1>Sign in to see your orders</h1>
        <Link className="button" to="/login" state={{ from: '/orders' }}>Sign in</Link>
      </div>
    </section>
  );

  return (
    <section>
      <div className="page-heading"><p className="eyebrow">YOUR ACCOUNT</p><h1>My orders</h1></div>
      <StatusMessage type="error">{error}</StatusMessage>
      {!orders && !error && <StatusMessage>Loading your orders…</StatusMessage>}
      {orders?.length === 0 && <div className="empty-state"><h2>You have no orders yet</h2><Link className="button" to="/">Browse products</Link></div>}
      {orders?.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <header>
                <h2>Order #{order.id}</h2>
                <span>{new Date(order.createdAt).toLocaleString('en-PH')}</span>
              </header>
              <ul>
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>{item.productName ?? `Product #${item.productId}`} × {item.quantity}</span>
                    <strong>{formatPeso(item.unitPrice * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
              <p className="summary-total"><span>Total</span><strong>{formatPeso(order.total)}</strong></p>
              <small>Status: {order.status} • Simulated order, no payment collected</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
