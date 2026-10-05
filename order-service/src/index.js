"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path_1 = __importDefault(require("path"));
const kafkajs_1 = require("kafkajs");
// ==============================
// Load Order Protocol Buffer
// ==============================
const ORDER_PROTO = path_1.default.join(__dirname, "../../proto/order.proto");
const orderPackageDefinition = protoLoader.loadSync(ORDER_PROTO, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const orderProto = grpc.loadPackageDefinition(orderPackageDefinition);
// ==============================
// Load Inventory Protocol Buffer
// ==============================
const INVENTORY_PROTO = path_1.default.join(__dirname, "../../proto/inventory.proto");
const inventoryPackageDefinition = protoLoader.loadSync(INVENTORY_PROTO, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const inventoryProto = grpc.loadPackageDefinition(inventoryPackageDefinition);
// ==============================
// Inventory Service
// ==============================
const inventoryClient = new inventoryProto.inventory.InventoryService("inventory-service:50051", grpc.credentials.createInsecure());
// ==============================
// Kafka
// ==============================
const kafka = new kafkajs_1.Kafka({
    clientId: "order-service",
    brokers: ["172.29.28.113:9092"],
});
const producer = kafka.producer();
// ==============================
// Create Order
// ==============================
async function createOrder(call, callback) {
    const { productId, quantity } = call.request;
    const orderId = "ORD-" + Date.now();
    console.log("Creating order:", orderId);
    inventoryClient.ReserveStock({
        productId,
        quantity,
    }, async (error, response) => {
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
        console.log("Inventory Response:", response.message);
        if (!response.success) {
            callback(null, {
                orderId,
                productId,
                quantity,
                status: "Order Failed",
            });
            return;
        }
        console.log("Remaining Stock:", response.remainingStock);
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
            console.log("OrderCreated event published to Kafka");
            callback(null, {
                orderId,
                productId,
                quantity,
                status: "Order Created",
            });
        }
        catch (kafkaError) {
            console.error("Kafka Error:", kafkaError.message);
            callback(null, {
                orderId,
                productId,
                quantity,
                status: "Order Created - Event Failed",
            });
        }
    });
}
// ==============================
// Start gRPC Server
// ==============================
const server = new grpc.Server();
server.addService(orderProto.order.OrderService.service, {
    CreateOrder: createOrder,
});
server.bindAsync("0.0.0.0:50052", grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
        console.error("Failed to start Order Service:", error);
        return;
    }
    console.log(`Order Service running on port ${port}`);
});
//# sourceMappingURL=index.js.map