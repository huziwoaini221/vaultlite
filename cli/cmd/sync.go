package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/guoyan/vaultlite/cli/crypto"
	"github.com/guoyan/vaultlite/cli/github"
	"github.com/guoyan/vaultlite/cli/internal/config"
	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runSync(args []string) error {
	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault sync")
			fmt.Println()
			fmt.Println("Encrypt the vault and push backup to GitHub.")
			return nil
		}
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}
	if cfg.GitHubToken == "" {
		return fmt.Errorf("GitHub token not configured. Run 'vault config set github-token <token>'")
	}

	if _, err := os.Stat(vaultPath); os.IsNotExist(err) {
		return fmt.Errorf("vault not initialized. Run 'vault init' first")
	}

	password, err := readPassword("Master password: ")
	if err != nil {
		return err
	}

	_, err = vault.LoadVault(vaultPath, password)
	if err != nil {
		return fmt.Errorf("failed to load vault (wrong password?): %w", err)
	}

	existing, err := os.ReadFile(vaultPath)
	if err != nil {
		return err
	}

	plaintext, err := crypto.Decrypt(existing, password)
	if err != nil {
		return err
	}

	var data map[string]interface{}
	if err := json.Unmarshal(plaintext, &data); err != nil {
		return err
	}
	if data == nil {
		data = make(map[string]interface{})
	}
	data["githubToken"] = cfg.GitHubToken

	updated, err := json.Marshal(data)
	if err != nil {
		return err
	}

	encrypted, err := crypto.Encrypt(updated, password)
	if err != nil {
		return err
	}

	fmt.Print("Syncing to GitHub... ")
	if err := github.UploadVault(cfg.GitHubToken, encrypted, "VaultLite backup"); err != nil {
		fmt.Println("failed")
		return fmt.Errorf("sync failed: %w", err)
	}

	if err := os.WriteFile(vaultPath, encrypted, 0600); err != nil {
		return fmt.Errorf("failed to update local vault: %w", err)
	}

	fmt.Println("done")
	return nil
}
