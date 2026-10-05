import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

// ==============================
// Load Order Protocol Buffer
// ==============================

const PROTO_PATH = path.join(
  __dirname,
  "../../proto/order.proto"
);

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const orderProto = grpc.loadPackageDefinition(
  packageDefinition
) as any;

// ==============================
// Connect to Order Service
// ==============================

const orderClient =
  new orderProto.order.OrderService(
    "order-service:50052",
    grpc.credentials.createInsecure()
  );

// ==============================
// GraphQL Schema
// ==============================

const typeDefs = `#graphql

  type Order {
    orderId: ID!
    productId: ID!
    quantity: Int!
    status: String!
  }

  type Mutation {
    createOrder(
      productId: ID!
      quantity: Int!
    ): Order
  }

  type Query {
    health: String
  }
`;

// ==============================
// GraphQL Resolvers
// ==============================

const resolvers = {

  Query: {
    health: () => "GraphQL Gateway is running",
  },

  Mutation: {
    createOrder: async (
      _parent: any,
      args: {
        productId: string;
        quantity: number;
      }
    ) => {

      return new Promise((resolve, reject) => {

        orderClient.CreateOrder(
          {
            productId: args.productId,
            quantity: args.quantity,
          },

          (error: any, response: any) => {

            if (error) {
              reject(error);
              return;
            }

            resolve({
              orderId: response.orderId,
              productId: response.productId,
              quantity: response.quantity,
              status: response.status,
            });
          }
        );

      });
    },
  },
};

// ==============================
// Start GraphQL Server
// ==============================

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

async function startServer() {

  const { url } =
    await startStandaloneServer(
      server,
      {
        listen: {
          port: 4000,
        },
      }
    );

  console.log(
    `GraphQL Gateway running at ${url}`
  );
}

startServer();