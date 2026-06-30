package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/guoyan/vaultlite/cli/github"
	"github.com/guoyan/vaultlite/cli/internal/config"
	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runInit(args []string) error {
	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault init")
			fmt.Println()
			fmt.Println("Initialize a new vault.")
			fmt.Println("Prompts for master password and optional GitHub backup setup.")
			return nil
		}
	}

	if _, err := os.Stat(vaultPath); err == nil {
		if !confirm("Vault already exists. Overwrite? [y/N]: ") {
			fmt.Println("Cancelled.")
			return nil
		}
	}

	password, err := readPassword("Master password: ")
	if err != nil {
		return err
	}
	if len(password) == 0 {
		return fmt.Errorf("password cannot be empty")
	}

	confirmPass, err := readPassword("Confirm master password: ")
	if err != nil {
		return err
	}
	if password != confirmPass {
		return fmt.Errorf("passwords do not match")
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		return err
	}

	if confirm("Set up GitHub backup? [y/N]: ") {
		token, err := readPassword("GitHub personal access token: ")
		if err != nil {
			return err
		}
		token = strings.TrimSpace(token)
		if token != "" {
			fmt.Print("Checking GitHub connection... ")
			if err := github.EnsureRepo(token); err != nil {
				fmt.Println("failed")
				return fmt.Errorf("GitHub setup failed: %w", err)
			}
			fmt.Println("ok")
			cfg.GitHubToken = token
			cfg.GitHubRepo = "vaultlite-backup"
		}
	}

	if _, err := vault.CreateVault(vaultPath, password); err != nil {
		return fmt.Errorf("failed to create vault: %w", err)
	}

	if err := cfg.Save(configPath); err != nil {
		return fmt.Errorf("failed to save config: %w", err)
	}

	fmt.Println("Vault initialized successfully.")
	return nil
}
