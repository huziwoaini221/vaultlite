package cmd

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runGet(args []string) error {
	fs := flag.NewFlagSet("get", flag.ContinueOnError)
	copyField := fs.String("c", "", "Copy field to clipboard (password, username)")
	format := fs.String("f", "", "Output format (json)")
	fs.SetOutput(flag.CommandLine.Output())

	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault get [flags] <query>")
			fmt.Println()
			fmt.Println("Search entries by title, username, or URL. First match wins.")
			fmt.Println()
			fmt.Println("Flags:")
			fmt.Println("  -c <field>    Copy field to clipboard (password, username)")
			fmt.Println("  -f json       Output in JSON format")
			return nil
		}
	}

	if err := fs.Parse(args); err != nil {
		return err
	}

	query := strings.Join(fs.Args(), " ")
	if query == "" {
		return fmt.Errorf("query is required")
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

	entry := v.FindEntry(query)
	if entry == nil {
		return fmt.Errorf("no entry found for %q", query)
	}

	if *copyField != "" {
		var val string
		switch *copyField {
		case "password":
			val = entry.Password
		case "username":
			val = entry.Username
		default:
			return fmt.Errorf("invalid field: %s (valid: password, username)", *copyField)
		}
		if err := copyToClipboard(val); err != nil {
			fmt.Fprintf(os.Stderr, "Clipboard not available: %v\n", err)
		}
		fmt.Println(val)
		return nil
	}

	if *format == "json" {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(entry)
	}

	fmt.Printf("ID:        %s\n", entry.ID)
	fmt.Printf("Title:     %s\n", entry.Title)
	fmt.Printf("Username:  %s\n", entry.Username)
	fmt.Printf("Password:  %s\n", entry.Password)
	fmt.Printf("URL:       %s\n", entry.URL)
	fmt.Printf("Note:      %s\n", entry.Note)
	fmt.Printf("Tags:      %s\n", strings.Join(entry.Tags, ", "))
	fmt.Printf("Created:   %s\n", entry.CreatedAt)
	fmt.Printf("Updated:   %s\n", entry.UpdatedAt)
	return nil
}
