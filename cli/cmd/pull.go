package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/guoyan/vaultlite/cli/crypto"
	"github.com/guoyan/vaultlite/cli/github"
	"github.com/guoyan/vaultlite/cli/internal/config"
	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runPull(args []string) error {
	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault pull [username]")
			fmt.Println()
			fmt.Println("Download vault from GitHub backup and overwrite local vault.")
			fmt.Println("If vaultlite-backup is public, just pass your GitHub username.")
			fmt.Println("Otherwise, configure a token with 'vault config set github-token <token>'.")
			return nil
		}
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	if _, err := os.Stat(vaultPath); os.IsNotExist(err) {
		return fmt.Errorf("vault not initialized. Run 'vault init' first")
	}

	password, err := readPassword("Master password: ")
	if err != nil {
		return err
	}

	var encrypted []byte
	owner := ""

	if len(args) > 0 && !strings.HasPrefix(args[0], "--") {
		owner = args[0]
	}

	if owner == "" && cfg.GitHubOwner != "" {
		owner = cfg.GitHubOwner
	}

	if cfg.GitHubToken != "" {
		fmt.Print("Downloading vault from GitHub (authenticated)... ")
		encrypted, err = github.DownloadVault(cfg.GitHubToken)
	} else if owner != "" {
		fmt.Printf("Downloading vault from GitHub (public, owner: %s)... ", owner)
		encrypted, err = github.DownloadVaultPublic(owner)
	} else {
		return fmt.Errorf("no token configured and no username provided.\n" +
			"Either:\n" +
			"1. Configure token: vault config set github-token <token>\n" +
			"2. Make repo public and pass username: vault pull <github-username>")
	}
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	plaintext, err := crypto.Decrypt(encrypted, password)
	if err != nil {
		return fmt.Errorf("decryption failed (wrong password?): %w", err)
	}

	var data struct {
		Entries     []vault.VaultEntry `json:"entries"`
		GitHubToken string             `json:"githubToken"`
	}
	if err := json.Unmarshal(plaintext, &data); err != nil {
		return fmt.Errorf("invalid vault data: %w", err)
	}

	if data.GitHubToken != "" && data.GitHubToken != cfg.GitHubToken {
		cfg.GitHubToken = data.GitHubToken
		if err := cfg.Save(configPath); err == nil {
			fmt.Println("GitHub token restored from vault.")
		}
	}

	if err := os.WriteFile(vaultPath, encrypted, 0600); err != nil {
		return fmt.Errorf("failed to write vault: %w", err)
	}

	fmt.Printf("done — restored %d entries\n", len(data.Entries))
	return nil
}
