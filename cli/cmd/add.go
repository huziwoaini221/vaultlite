package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runAdd(args []string) error {
	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault add")
			fmt.Println()
			fmt.Println("Add a new entry interactively.")
			fmt.Println("Press enter at password prompt to generate a random password.")
			return nil
		}
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

	var entry vault.VaultEntry
	entry.ID = generateID()

	title, err := readLine("Title: ")
	if err != nil {
		return err
	}
	if title == "" {
		return fmt.Errorf("title is required")
	}
	entry.Title = title

	entry.Username, _ = readLine("Username: ")

	pass, _ := readLine("Password (enter to generate): ")
	if pass == "" {
		pass = generatePassword(GenerateOptions{
			Length:    24,
			Uppercase: true,
			Lowercase: true,
			Digits:    true,
			Symbols:   true,
		})
		fmt.Printf("Generated password: %s\n", pass)
	}
	entry.Password = pass

	entry.URL, _ = readLine("URL: ")
	entry.Note, _ = readLine("Note: ")

	tagsStr, _ := readLine("Tags (comma separated): ")
	if tagsStr != "" {
		for _, t := range strings.Split(tagsStr, ",") {
			t = strings.TrimSpace(t)
			if t != "" {
				entry.Tags = append(entry.Tags, t)
			}
		}
	}

	totpStr, _ := readLine("TOTP secret (base32): ")
	if totpStr != "" {
		entry.TOTPSecret = totpStr
	}

	v.AddEntry(entry)
	if err := v.Save(); err != nil {
		return fmt.Errorf("failed to save vault: %w", err)
	}

	fmt.Printf("Entry added (ID: %s)\n", entry.ID)
	return nil
}
