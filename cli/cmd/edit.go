package cmd

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runEdit(args []string) error {
	fs := flag.NewFlagSet("edit", flag.ContinueOnError)
	fs.SetOutput(flag.CommandLine.Output())

	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault edit <id>")
			fmt.Println()
			fmt.Println("Edit an existing entry by ID.")
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

	fmt.Printf("Editing entry: %s (%s)\n", entry.Title, entry.Username)
	fmt.Println("Press enter to keep the current value.")
	fmt.Println()

	title, _ := readLine(fmt.Sprintf("Title [%s]: ", entry.Title))
	if title != "" {
		entry.Title = title
	}

	username, _ := readLine(fmt.Sprintf("Username [%s]: ", entry.Username))
	if username != "" {
		entry.Username = username
	}

	fmt.Printf("Password [%s]: (enter to keep, or type new)\n", strings.Repeat("*", len(entry.Password)))
	pass, _ := readLine("New password: ")
	if pass != "" {
		entry.Password = pass
	}

	url, _ := readLine(fmt.Sprintf("URL [%s]: ", entry.URL))
	if url != "" {
		entry.URL = url
	}

	note, _ := readLine(fmt.Sprintf("Note [%s]: ", entry.Note))
	if note != "" {
		entry.Note = note
	}

	currentTags := strings.Join(entry.Tags, ", ")
	tagsStr, _ := readLine(fmt.Sprintf("Tags [%s]: ", currentTags))
	if tagsStr != "" {
		var tags []string
		for _, t := range strings.Split(tagsStr, ",") {
			t = strings.TrimSpace(t)
			if t != "" {
				tags = append(tags, t)
			}
		}
		if len(tags) > 0 {
			entry.Tags = tags
		}
	}

	v.UpdateEntry(id, *entry)
	if err := v.Save(); err != nil {
		return fmt.Errorf("failed to save vault: %w", err)
	}

	fmt.Println("Entry updated.")
	return nil
}
