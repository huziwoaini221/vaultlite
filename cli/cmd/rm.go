package cmd

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runRm(args []string) error {
	fs := flag.NewFlagSet("rm", flag.ContinueOnError)
	fs.SetOutput(flag.CommandLine.Output())

	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault rm <id>")
			fmt.Println()
			fmt.Println("Delete an entry by ID.")
			return nil
		}
	}

	if err := fs.Parse(args); err != nil {
		return err
	}

	id := strings.Join(fs.Args(), " ")
	if id == "" {
		return fmt.Errorf("entry ID is required")
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

	entry := v.FindEntry(id)
	if entry == nil {
		return fmt.Errorf("no entry found with ID %q", id)
	}

	fmt.Printf("Entry: %s (%s)\n", entry.Title, entry.Username)
	if !confirm("Delete this entry? [y/N]: ") {
		fmt.Println("Cancelled.")
		return nil
	}

	v.DeleteEntry(id)
	if err := v.Save(); err != nil {
		return fmt.Errorf("failed to save vault: %w", err)
	}

	fmt.Println("Entry deleted.")
	return nil
}
