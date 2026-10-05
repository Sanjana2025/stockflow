import { useState } from "react";
import "./App.css";

function App() {
  const [productId, setProductId] = useState("P001");
  const [quantity, setQuantity] = useState(1);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const products = [
    { id: "P001", name: "iPhone 15" },
    { id: "P002", name: "Dell Laptop" },
    { id: "P003", name: "Logitech Mouse" },
    { id: "P004", name: "Samsung Monitor" },
  ];

  const createOrder = async () => {
    setLoading(true);
    setOrder(null);

    const query = `
      mutation {
        createOrder(productId: "${productId}", quantity: ${quantity}) {
          orderId
          productId
          quantity
          status
        }
      }
    `;

    try {
      const response = await fetch("http://localhost:4000/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setOrder(data.data.createOrder);
    } catch (error: any) {
      setOrder({
        status: "Order Failed",
        error: error.message,
      });
    }

    setLoading(false);
  };

  return (
    <div className="app">
      <div className="card">
        <div className="header">
  <div className="logo">EVENT-DRIVEN SYSTEM</div>
  <h1>StockFlow</h1>
          <p>Event-Driven Inventory & Order Management</p>
        </div>

        <div className="form">
          <label>Product</label>

          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          <label>Quantity</label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />

          <button onClick={createOrder} disabled={loading}>
            {loading ? "Creating Order..." : "Place Order"}
          </button>
        </div>

        {order && (
          <div className="result">
            <h2>{order.status}</h2>

            {order.orderId && (
              <>
                <p>
                  <strong>Order ID:</strong> {order.orderId}
                </p>
                <p>
                  <strong>Product:</strong> {order.productId}
                </p>
                <p>
                  <strong>Quantity:</strong> {order.quantity}
                </p>
              </>
            )}

            {order.error && <p>{order.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;