import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: ["172.29.28.113:9092"],
});

const consumer = kafka.consumer({
  groupId: "notification-group",
});

console.log("Notification Service starting...");
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
      console.log("Order ID:", order.orderId);
      console.log("Product ID:", order.productId);
      console.log("Quantity:", order.quantity);

      console.log(
        `Notification: Order ${order.orderId} has been created successfully.`
      );
    },
  });
}

startConsumer().catch((error) => {
  console.error("Kafka Error:", error);
});