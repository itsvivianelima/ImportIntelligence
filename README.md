# IMPORT INTELLIGENCE

IMPORT INTELLIGENCE is a greenfield import management platform. It is separate from any prior application, uses a new project namespace, and starts with zero operational or business records.

## Scope

- App-owned authenticated login and account menu with SIGN OUT.
- SETTINGS -> GENERAL -> APPEARANCE with LIGHT, DARK, and SYSTEM options.
- Empty D1 schema for Suppliers, Part Numbers, Requesters, Agents, POL, CFS, Demands, Shipments, Consolidations, Freight Contracts, Public Rates, Surcharges, Exchange Rates, Commercial Invoices, Packages, Containers, and Audit Events.
- Technical D1 authentication tables for application users and sessions. These are not operational records.
- Full-page editor surfaces for Supplier, Demand, Shipment, Freight Contract, and Consolidation workflows.
- Shipment status logic using DELIVERY DATE as the final operational milestone.
- Demand fulfillment status logic and package CBM calculation.

## Data State

The final database is intentionally empty. No fake suppliers, requests, shipments, rates, contracts, invoices, packages, containers, costs, or production-like records are seeded.
