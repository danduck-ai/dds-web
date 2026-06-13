# Order Data Model

## Status

This document has been superseded.

The current order, production, and shipment data structure is defined in:

- [`docs/data_structure/order-production-shipment-model.md`](./data_structure/order-production-shipment-model.md)

## Reason

The previous model used `ProductionPlan` as an intermediate production-planning entity tied to `ShipmentPlan`.

The current model removes that intermediate layer. Production is now planned and completed by `OrderProduct`, while shipment records later consume completed production quantity from that order product.

Use the new data-structure document for all future database design and AI Agent implementation work.
