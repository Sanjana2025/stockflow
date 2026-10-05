import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_PATH = path.join(__dirname, "../../proto/inventory.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const inventoryProto = grpc.loadPackageDefinition(
  packageDefinition
) as any;

const stock: Record<string, { name: string; stock: number }> = {
  P001: { name: "iPhone 15", stock: 10 },
  P002: { name: "Dell Laptop", stock: 7 },
  P003: { name: "Logitech Mouse", stock: 25 },
  P004: { name: "Samsung Monitor", stock: 12 },
};

function reserveStock(
  call: any,
  callback: any
) {
  const { productId, quantity } = call.request;

  const product = stock[productId];

  if (!product) {
    return callback(null, {
      success: false,
      message: "Product not found",
      remainingStock: 0,
    });
  }

  if (product.stock < quantity) {
    return callback(null, {
      success: false,
      message: "Insufficient stock",
      remainingStock: product.stock,
    });
  }

  product.stock -= quantity;

  callback(null, {
    success: true,
    message: `Reserved ${quantity} unit(s) of ${product.name}`,
    remainingStock: product.stock,
  });
}

function getStock(
  call: any,
  callback: any
) {
  const { productId } = call.request;

  const product = stock[productId];

  if (!product) {
    return callback(null, {
      productId,
      productName: "Unknown",
      stock: 0,
    });
  }

  callback(null, {
    productId,
    productName: product.name,
    stock: product.stock,
  });
}

const server = new grpc.Server();

server.addService(inventoryProto.inventory.InventoryService.service, {
  ReserveStock: reserveStock,
  GetStock: getStock,
});

server.bindAsync(
  "0.0.0.0:50051",
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error("Failed to start gRPC server:", error);
      return;
    }

    console.log(`Inventory gRPC Service running on port ${port}`);
  }
);