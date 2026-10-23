.PHONY: dev migrate seed test test-unit test-postgres frontend-check isolation down

dev:
	docker compose up --build

migrate:
	cd backend && alembic upgrade head

seed:
	cd backend && python -m app.demo.seed

test-unit:
	cd backend && pytest -q tests/unit

test-postgres:
	cd backend && RUN_POSTGRES_TESTS=1 TENANTCORE_TEST_ALLOW_RESET=YES pytest -q

test: test-unit
	cd frontend && npm ci && npm run typecheck && npm run lint && npm test && npm run build

frontend-check:
	cd frontend && npm run typecheck && npm run lint && npm test && npm run build && npm audit --audit-level=moderate

isolation:
	cd scripts && python demo_isolation.py

down:
	docker compose down
