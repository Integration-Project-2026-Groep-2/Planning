import { getChannel } from "../rabbitmq";

export const setupRabbitMQ = async () => {
    const channel = getChannel();
    console.log("[RabbitMQ] Bezig met configureren van exchanges en queues...");

    const exchanges = [
        { name: "contact.topic", type: "topic" },
        { name: "frontend.topic", type: "topic" },
    ];

    const bindings = [
        // CRM Consumers
        { exchange: "contact.topic", queue: "planning.user.confirmed",   routingKey: "crm.user.confirmed" },
        { exchange: "contact.topic", queue: "planning.user.updated",     routingKey: "crm.user.updated" },
        { exchange: "contact.topic", queue: "planning.user.deactivated", routingKey: "crm.user.deactivated" },

        // Frontend Consumers
        { exchange: "frontend.topic", queue: "planning.location.created",    routingKey: "frontend.location.created" },
        { exchange: "frontend.topic", queue: "planning.location.updated",    routingKey: "frontend.location.updated" },
        { exchange: "frontend.topic", queue: "planning.location.deleted",    routingKey: "frontend.location.deleted" },
        { exchange: "frontend.topic", queue: "planning.locations.requested", routingKey: "frontend.locations.requested" },
        
        { exchange: "frontend.topic", queue: "planning.session.created",     routingKey: "frontend.session.created" },
        { exchange: "frontend.topic", queue: "planning.session.updated",     routingKey: "frontend.session.updated" },
        { exchange: "frontend.topic", queue: "planning.session.cancelled",   routingKey: "frontend.session.cancelled" },
        { exchange: "frontend.topic", queue: "planning.sessions.requested",  routingKey: "frontend.sessions.requested" },

        { exchange: "frontend.topic", queue: "planning.speaker.created",     routingKey: "frontend.speaker.created" },
        { exchange: "frontend.topic", queue: "planning.speaker.updated",     routingKey: "frontend.speaker.updated" },
        { exchange: "frontend.topic", queue: "planning.speaker.deactivated", routingKey: "frontend.speaker.deactivated" },
        { exchange: "frontend.topic", queue: "planning.speakers.requested",  routingKey: "frontend.speakers.requested" },

        { exchange: "frontend.topic", queue: "planning.registration.created", routingKey: "frontend.registration.created" },
    ];

    // Assert Exchanges
    for (const ex of exchanges) {
        await channel.assertExchange(ex.name, ex.type, { durable: true });
    }

    // Assert Queues and Bindings
    for (const b of bindings) {
        await channel.assertQueue(b.queue, { durable: true });
        await channel.bindQueue(b.queue, b.exchange, b.routingKey);
    }

    console.log("[RabbitMQ] Configuratie voltooid!");
};
