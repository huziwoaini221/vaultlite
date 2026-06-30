.PHONY: dev build clean typecheck web cli cli-release

GO := go
GOBUILD := CGO_ENABLED=0 $(GO) build -ldflags="-s -w"
RELEASE_DIR := release

dev: web
	cd web && npm run dev

build: cli web

web:
	cd web && npm ci && npm run build
	mkdir -p dist
	rm -rf dist/web
	cp -r web/dist dist/web

cli:
	mkdir -p dist
	cd cli && $(GOBUILD) -o ../dist/vault .

cli-release:
	rm -rf $(RELEASE_DIR)
	mkdir -p $(RELEASE_DIR)
	cd cli && GOOS=linux   GOARCH=amd64 $(GOBUILD) -o ../$(RELEASE_DIR)/vault-linux-amd64   .
	cd cli && GOOS=linux   GOARCH=arm64 $(GOBUILD) -o ../$(RELEASE_DIR)/vault-linux-arm64   .
	cd cli && GOOS=darwin  GOARCH=amd64 $(GOBUILD) -o ../$(RELEASE_DIR)/vault-darwin-amd64  .
	cd cli && GOOS=darwin  GOARCH=arm64 $(GOBUILD) -o ../$(RELEASE_DIR)/vault-darwin-arm64  .
	cd cli && GOOS=windows GOARCH=amd64 $(GOBUILD) -o ../$(RELEASE_DIR)/vault-windows-amd64.exe .

clean:
	rm -rf dist/ web/dist $(RELEASE_DIR)

typecheck:
	cd web && npm run typecheck
