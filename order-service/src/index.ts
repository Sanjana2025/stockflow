import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { Kafka } from "kafkajs";

// ==============================
// Load Order Protocol Buffer
// ==============================

const ORDER_PROTO = path.join(__dirname, "../../proto/order.proto");

const orderPackageDefinition = protoLoader.loadSync(ORDER_PROTO, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const orderProto = grpc.loadPackageDefinition(
  orderPackageDefinition
) as any;

// ==============================
// Load Inventory Protocol Buffer
// ==============================

const INVENTORY_PROTO = path.join(
  __dirname,
  "../../proto/inventory.proto"
);

const inventoryPackageDefinition = protoLoader.loadSync(
  INVENTORY_PROTO,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const inventoryProto = grpc.loadPackageDefinition(
  inventoryPackageDefinition
) as any;

// ==============================
// Inventory Service
// ==============================

const inventoryClient =
  new inventoryProto.inventory.InventoryService(
    "inventory-service:50051",
    grpc.credentials.createInsecure()
  );

// ==============================
// Kafka
// ==============================

const kafka = new Kafka({
  clientId: "order-service",
  brokers: ["172.29.28.113:9092"],
});

const producer = kafka.producer();

// ==============================
// Create Order
// ==============================

async function createOrder(
  call: any,
  callback: any
) {
  const { productId, quantity } = call.request;

  const orderId = "ORD-" + Date.now();

  console.log("Creating order:", orderId);

  inventoryClient.ReserveStock(
    {
      productId,
      quantity,
    },
    async (error: any, response: any) => {
      if (error) {
        console.error("Inventory Error:", error.message);

        callback(null, {
          orderId,
          productId,
          quantity,
          status: "Order Failed",
        });

        return;
      }

      console.log(
        "Inventory Response:",
        response.message
      );

      if (!response.success) {
        callback(null, {
          orderId,
          productId,
          quantity,
          status: "Order Failed",
        });

        return;
      }

      console.log(
        "Remaining Stock:",
        response.remainingStock
      );

      try {
        await producer.connect();

        await producer.send({
          topic: "order-created",
          messages: [
            {
              key: orderId,
              value: JSON.stringify({
                event: "OrderCreated",
                orderId,
                productId,
                quantity,
              }),
            },
          ],
        });

        await producer.disconnect();

        console.log(
          "OrderCreated event published to Kafka"
        );

        callback(null, {
          orderId,
          productId,
          quantity,
          status: "Order Created",
        });
      } catch (kafkaError: any) {
        console.error(
          "Kafka Error:",
          kafkaError.message
        );

        callback(null, {
          orderId,
          productId,
          quantity,
          status: "Order Created - Event Failed",
        });
      }
    }
  );
}

// ==============================
// Start gRPC Server
// ==============================

const server = new grpc.Server();

server.addService(
  orderProto.order.OrderService.service,
  {
    CreateOrder: createOrder,
  }
);

server.bindAsync(
  "0.0.0.0:50052",
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error(
        "Failed to start Order Service:",
        error
      );
      return;
    }

    console.log(
      `Order Service running on port ${port}`
    );
  }
);