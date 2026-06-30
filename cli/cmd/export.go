package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/guoyan/vaultlite/cli/crypto"
	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runExport(args []string) error {
	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault export [output-path]")
			fmt.Println()
			fmt.Println("Export the encrypted vault file (vault.enc).")
			fmt.Println("If no output path is given, prints to stdout.")
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
		return fmt.Errorf("failed to load vault: %w", err)
	}

	data, err := os.ReadFile(vaultPath)
	if err != nil {
		return fmt.Errorf("failed to read vault file: %w", err)
	}

	outputPath := ""
	if len(args) > 0 && args[0] != "" && args[0][0] != '-' {
		outputPath = args[0]
	}

	if outputPath != "" {
		if err := os.MkdirAll(filepath.Dir(outputPath), 0700); err != nil {
			return fmt.Errorf("failed to create output directory: %w", err)
		}
		if err := os.WriteFile(outputPath, data, 0600); err != nil {
			return fmt.Errorf("failed to write export file: %w", err)
		}
		fmt.Printf("Exported vault to %s (%d entries)\n", outputPath, len(v.ListEntries()))
	} else {
		os.Stdout.Write(data)
	}

	return nil
}

func runImport(args []string) error {
	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault import [--format bitwarden] <file>")
			fmt.Println()
			fmt.Println("Import entries from a file.")
			fmt.Println("  --format bitwarden  Import from Bitwarden CSV export")
			fmt.Println("  Default format is VaultLite vault.enc file.")
			return nil
		}
	}

	if _, err := os.Stat(vaultPath); os.IsNotExist(err) {
		return fmt.Errorf("vault not initialized. Run 'vault init' first")
	}

	format := "vault"
	fileArg := ""
	for i, a := range args {
		if a == "--format" || a == "-f" {
			if i+1 < len(args) {
				format = args[i+1]
				i++
			}
		} else if len(a) > 0 && a[0] != '-' {
			fileArg = a
		}
	}

	if fileArg == "" {
		return fmt.Errorf("missing file argument")
	}

	if _, err := os.Stat(fileArg); os.IsNotExist(err) {
		return fmt.Errorf("file not found: %s", fileArg)
	}

	switch format {
	case "bitwarden":
		return importBitwardenCSV(fileArg)
	default:
		return importVaultEnc(fileArg)
	}
}

func importVaultEnc(filePath string) error {
	password, err := readPassword("Master password: ")
	if err != nil {
		return err
	}

	existingVault, err := vault.LoadVault(vaultPath, password)
	if err != nil {
		return fmt.Errorf("failed to load existing vault: %w", err)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	plain, err := crypto.Decrypt(data, password)
	if err != nil {
		return fmt.Errorf("failed to decrypt import file (wrong password?): %w", err)
	}

	var imported vault.VaultData
	if err := json.Unmarshal(plain, &imported); err != nil {
		return fmt.Errorf("invalid vault file: %w", err)
	}

	existingVault.Data.Entries = append(existingVault.Data.Entries, imported.Entries...)
	if err := existingVault.Save(); err != nil {
		return fmt.Errorf("failed to save vault: %w", err)
	}

	fmt.Printf("Imported %d entries (total: %d)\n", len(imported.Entries), len(existingVault.ListEntries()))
	return nil
}

func importBitwardenCSV(filePath string) error {
	password, err := readPassword("Master password: ")
	if err != nil {
		return err
	}

	v, err := vault.LoadVault(vaultPath, password)
	if err != nil {
		return fmt.Errorf("failed to load vault: %w", err)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	text := string(data)
	lines := strings.Split(strings.TrimSpace(text), "\n")
	if len(lines) < 2 {
		return fmt.Errorf("CSV file has no data rows")
	}

	headers := parseCSVLine(lines[0])
	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[strings.ToLower(h)] = i
	}

	count := 0
	for i := 1; i < len(lines); i++ {
		line := strings.TrimSpace(lines[i])
		if line == "" {
			continue
		}
		values := parseCSVLine(line)
		get := func(name string) string {
			names := []string{name, strings.ToLower(name)}
			for _, n := range names {
				if idx, ok := headerMap[n]; ok && idx < len(values) {
					return values[idx]
				}
			}
			return ""
		}

		entry := vault.VaultEntry{
			ID:       generateID(),
			Title:    get("name"),
			Password: get("password"),
			Note:     get("notes"),
		}
		if entry.Title == "" {
			entry.Title = get("title")
		}

		username := get("username")
		if username == "" {
			username = get("user")
		}
		entry.Username = username

		url := get("url")
		if url == "" {
			url = get("uri")
		}
		entry.URL = url

		folder := get("folder")
		if folder == "" {
			folder = get("collections")
		}
		if folder != "" {
			entry.Tags = strings.Split(folder, "/")
		}

		_ = get("login_uri")

		if entry.Title != "" || entry.Password != "" {
			v.AddEntry(entry)
			count++
		}
	}

	if err := v.Save(); err != nil {
		return fmt.Errorf("failed to save vault: %w", err)
	}

	fmt.Printf("Imported %d entries from Bitwarden CSV (total: %d)\n", count, len(v.ListEntries()))
	return nil
}

func parseCSVLine(line string) []string {
	var result []string
	var current strings.Builder
	inQuotes := false
	for i := 0; i < len(line); i++ {
		ch := line[i]
		if ch == '"' {
			if inQuotes && i+1 < len(line) && line[i+1] == '"' {
				current.WriteByte('"')
				i++
			} else {
				inQuotes = !inQuotes
			}
		} else if ch == ',' && !inQuotes {
			result = append(result, current.String())
			current.Reset()
		} else {
			current.WriteByte(ch)
		}
	}
	result = append(result, current.String())
	return result
}
