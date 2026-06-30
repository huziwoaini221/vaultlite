package cmd

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runList(args []string) error {
	fs := flag.NewFlagSet("list", flag.ContinueOnError)
	format := fs.String("format", "table", "Output format (table, json)")
	fs.SetOutput(flag.CommandLine.Output())

	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault list [--format table|json]")
			fmt.Println()
			fmt.Println("List all entries.")
			return nil
		}
	}

	if err := fs.Parse(args); err != nil {
		return err
	}

	if _, err := os.Stat(vaultPath); os.IsNotExist(err) {
		return fmt.Errorf("vault not initialized. Run 'vault init' first")
	}

	password, err := readPassword("Master password: ")
	if err != nil {
		return err
	}

	v, err := vault.LoadVault(vaultPath, password)
	if err != nil {
		return fmt.Errorf("failed to load vault (wrong password?): %w", err)
	}

	entries := v.ListEntries()
	if len(entries) == 0 {
		fmt.Println("No entries found.")
		return nil
	}

	if *format == "json" {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(entries)
	}

	printEntryTable(entries)
	return nil
}

func printEntryTable(entries []vault.VaultEntry) {
	idW := 8
	titleW := 10
	userW := 10
	urlW := 15
	updatedW := 10

	for _, e := range entries {
		if len(e.ID) > idW {
			idW = len(e.ID)
		}
		if len(e.Title) > titleW {
			titleW = len(e.Title)
		}
		if len(e.Username) > userW {
			userW = len(e.Username)
		}
		if len(e.URL) > urlW {
			urlW = len(e.URL)
		}
		if len(e.UpdatedAt) > updatedW {
			updatedW = len(e.UpdatedAt)
		}
	}

	const maxWidth = 40
	if titleW > maxWidth {
		titleW = maxWidth
	}
	if userW > maxWidth {
		userW = maxWidth
	}

	line := fmt.Sprintf("%-*s  %-*s  %-*s  %-*s  %s", idW, "ID", titleW, "Title", userW, "Username", urlW, "URL", "Updated")
	fmt.Println(line)
	fmt.Println(strings.Repeat("-", len(line)))

	for _, e := range entries {
		title := e.Title
		if len(title) > maxWidth {
			title = title[:maxWidth-3] + "..."
		}
		username := e.Username
		if len(username) > maxWidth {
			username = username[:maxWidth-3] + "..."
		}
		updated := e.UpdatedAt
		if len(updated) > 19 {
			updated = updated[:19]
		}
		fmt.Printf("%-*s  %-*s  %-*s  %-*s  %s\n", idW, e.ID, titleW, title, userW, username, urlW, e.URL, updated)
	}
}
