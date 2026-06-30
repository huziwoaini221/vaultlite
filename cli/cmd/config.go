package cmd

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/guoyan/vaultlite/cli/internal/config"
)

func runConfig(args []string) error {
	fs := flag.NewFlagSet("config", flag.ContinueOnError)
	fs.SetOutput(flag.CommandLine.Output())

	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault config [set <key> <value>]")
			fmt.Println()
			fmt.Println("View or edit configuration.")
			fmt.Println()
			fmt.Println("Keys:")
			fmt.Println("  github-token       GitHub personal access token")
			fmt.Println("  github-repo        GitHub repository name (default: vaultlite-backup)")
			fmt.Println("  auto-backup        Enable auto backup (true/false)")
			fmt.Println()
			fmt.Println("Examples:")
			fmt.Println("  vault config")
			fmt.Println("  vault config set github-token ghp_xxx")
			return nil
		}
	}

	if err := fs.Parse(args); err != nil {
		return err
	}

	cfg, err := config.Load(configPath)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	rest := fs.Args()
	if len(rest) == 0 {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(cfg)
	}

	if rest[0] == "set" && len(rest) >= 3 {
		key, value := rest[1], strings.Join(rest[2:], " ")
		switch key {
		case "github-token":
			cfg.GitHubToken = value
		case "github-repo":
			cfg.GitHubRepo = value
		case "auto-backup":
			switch strings.ToLower(value) {
			case "true", "yes", "1":
				cfg.AutoBackup = true
			case "false", "no", "0":
				cfg.AutoBackup = false
			default:
				return fmt.Errorf("invalid value for auto-backup: %s (use true/false)", value)
			}
		default:
			return fmt.Errorf("unknown config key: %s (valid: github-token, github-repo, auto-backup)", key)
		}
		return cfg.Save(configPath)
	}

	if rest[0] == "set" && len(rest) < 3 {
		return fmt.Errorf("usage: vault config set <key> <value>")
	}

	return fmt.Errorf("unknown subcommand: %s (use: vault config [set <key> <value>])", rest[0])
}
