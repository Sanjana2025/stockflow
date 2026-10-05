import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "payment-service",
  brokers: ["172.29.28.113:9092"],
});

const consumer = kafka.consumer({
  groupId: "payment-group",
});

console.log("Payment Service starting...");

async function startConsumer() {
  await consumer.connect();

  console.log("Connected to Kafka");

  await consumer.subscribe({
    topic: "order-created",
    fromBeginning: true,
  });

  console.log("Listening for OrderCreated events...");

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) {
        return;
      }

      const order = JSON.parse(message.value.toString());

      console.log("OrderCreated event received!");
      console.log("Processing payment for Order:", order.orderId);
      console.log("Product ID:", order.productId);
      console.log("Quantity:", order.quantity);

      console.log(
        `Payment successful for Order ${order.orderId}!`
      );
    },
  });
}

startConsumer().catch((error) => {
  console.error("Kafka Error:", error);
});