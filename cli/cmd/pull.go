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

func runPull(args []string) error {
	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault pull")
			fmt.Println()
			fmt.Println("Download vault from GitHub backup and overwrite local vault.")
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

	fmt.Print("Downloading vault from GitHub... ")
	encrypted, err := github.DownloadVault(cfg.GitHubToken)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	plaintext, err := crypto.Decrypt(encrypted, password)
	if err != nil {
		return fmt.Errorf("decryption failed (wrong password?): %w", err)
	}

	var data vault.VaultData
	if err := json.Unmarshal(plaintext, &data); err != nil {
		return fmt.Errorf("invalid vault data: %w", err)
	}

	if err := os.WriteFile(vaultPath, encrypted, 0600); err != nil {
		return fmt.Errorf("failed to write vault: %w", err)
	}

	fmt.Printf("done — restored %d entries\n", len(data.Entries))
	return nil
}
