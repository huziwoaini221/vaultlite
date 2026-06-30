package cmd

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/guoyan/vaultlite/cli/internal/vault"
)

func runTotp(args []string) error {
	for _, a := range args {
		if a == "--help" || a == "-h" {
			fmt.Println("Usage: vault totp <query>")
			fmt.Println()
			fmt.Println("Generate a TOTP code for an entry with a TOTP secret.")
			fmt.Println("The query can be a title, username, URL, or ID.")
			return nil
		}
	}

	if _, err := os.Stat(vaultPath); os.IsNotExist(err) {
		return fmt.Errorf("vault not initialized. Run 'vault init' first")
	}

	if len(args) == 0 || args[0] == "" {
		return fmt.Errorf("missing search query")
	}
	query := strings.Join(args, " ")

	password, err := readPassword("Master password: ")
	if err != nil {
		return err
	}

	v, err := vault.LoadVault(vaultPath, password)
	if err != nil {
		return fmt.Errorf("failed to load vault: %w", err)
	}

	entry := v.FindEntry(query)
	if entry == nil {
		return fmt.Errorf("no entry found for: %s", query)
	}

	if entry.TOTPSecret == "" {
		return fmt.Errorf("entry '%s' has no TOTP secret configured", entry.Title)
	}

	code, remaining, err := generateTotpCode(entry.TOTPSecret)
	if err != nil {
		return fmt.Errorf("failed to generate TOTP: %w", err)
	}

	fmt.Printf("Entry:    %s\n", entry.Title)
	if entry.Username != "" {
		fmt.Printf("Username: %s\n", entry.Username)
	}
	fmt.Printf("Code:     %s\n", code)
	fmt.Printf("Expires:  %d seconds\n", remaining)

	if err := copyToClipboard(code); err == nil {
		fmt.Println("(copied to clipboard)")
	}

	return nil
}

func generateTotpCode(secret string) (string, int, error) {
	cleaned := strings.ToUpper(strings.TrimSpace(secret))
	decoded, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(cleaned)
	if err != nil {
		decoded, err = base32.StdEncoding.DecodeString(cleaned)
		if err != nil {
			return "", 0, fmt.Errorf("invalid base32 secret: %w", err)
		}
	}

	now := time.Now().Unix()
	counter := now / 30
	remaining := int(30 - (now % 30))

	counterBytes := make([]byte, 8)
	binary.BigEndian.PutUint64(counterBytes, uint64(counter))

	mac := hmac.New(sha1.New, decoded)
	mac.Write(counterBytes)
	hs := mac.Sum(nil)

	offset := hs[19] & 0xf
	code := int(hs[offset]&0x7f)<<24 |
		int(hs[offset+1]&0xff)<<16 |
		int(hs[offset+2]&0xff)<<8 |
		int(hs[offset+3]&0xff)
	code %= 1000000

	return fmt.Sprintf("%06d", code), remaining, nil
}
