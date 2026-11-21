# Product Catalogue PoC

A product catalogue proof of concept: React + TypeScript client, NestJS backend, product data from the Fake Store API through the backend.

The solution is on the `feature/product-catalogue` branch, in [pull request #1](https://github.com/kumbarsachin67gmail/officeworks-catalogue/pull/1), left open for review as the brief asks. Start with that PR's description, then the [README on that branch](https://github.com/kumbarsachin67gmail/officeworks-catalogue/blob/feature/product-catalogue/README.md) for setup and run instructions.

## Run it

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/). No `.env`, accounts or API keys are needed.

```bash
git clone https://github.com/kumbarsachin67gmail/officeworks-catalogue.git
cd officeworks-catalogue
git checkout feature/product-catalogue
docker compose up --build
```

The first run takes about 3 minutes. Then open:

- The catalogue: http://localhost:8080
- The sales inbox (every enquiry email): http://localhost:8025

Stop with `Ctrl+C`, then `docker compose down`.
