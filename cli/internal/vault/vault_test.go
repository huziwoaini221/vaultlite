package vault

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCreateAndLoadVault(t *testing.T) {
	dir := t.TempDir()
	vaultPath := filepath.Join(dir, "vault.enc")
	password := "test-master-password"

	v, err := CreateVault(vaultPath, password)
	if err != nil {
		t.Fatalf("CreateVault failed: %v", err)
	}

	if len(v.ListEntries()) != 0 {
		t.Fatalf("Expected empty vault, got %d entries", len(v.ListEntries()))
	}

	loaded, err := LoadVault(vaultPath, password)
	if err != nil {
		t.Fatalf("LoadVault failed: %v", err)
	}

	if len(loaded.ListEntries()) != 0 {
		t.Fatalf("Expected empty loaded vault, got %d entries", len(loaded.ListEntries()))
	}
}

func TestAddEntry(t *testing.T) {
	dir := t.TempDir()
	vaultPath := filepath.Join(dir, "vault.enc")
	password := "test-password"

	v, _ := CreateVault(vaultPath, password)
	v.AddEntry(VaultEntry{
		ID:       "id-1",
		Title:    "GitHub",
		Username: "user@test.com",
		Password: "secret",
		URL:      "https://github.com",
	})
	v.Save()

	loaded, _ := LoadVault(vaultPath, password)
	entries := loaded.ListEntries()
	if len(entries) != 1 {
		t.Fatalf("Expected 1 entry, got %d", len(entries))
	}
	if entries[0].Title != "GitHub" {
		t.Fatalf("Expected title 'GitHub', got '%s'", entries[0].Title)
	}
	if entries[0].CreatedAt == "" {
		t.Fatal("Expected createdAt to be set")
	}
	if entries[0].UpdatedAt == "" {
		t.Fatal("Expected updatedAt to be set")
	}
}

func TestUpdateEntry(t *testing.T) {
	dir := t.TempDir()
	vaultPath := filepath.Join(dir, "vault.enc")
	password := "test-password"

	v, _ := CreateVault(vaultPath, password)
	v.AddEntry(VaultEntry{
		ID:       "id-1",
		Title:    "GitHub",
		Username: "old@test.com",
		Password: "oldpass",
	})
	v.Save()

	updated := v.UpdateEntry("id-1", VaultEntry{
		Title:    "GitHub",
		Username: "new@test.com",
		Password: "newpass",
	})
	if !updated {
		t.Fatal("UpdateEntry returned false")
	}
	v.Save()

	loaded, _ := LoadVault(vaultPath, password)
	entry := loaded.FindEntry("id-1")
	if entry == nil {
		t.Fatal("Entry not found after update")
	}
	if entry.Username != "new@test.com" {
		t.Fatalf("Expected username 'new@test.com', got '%s'", entry.Username)
	}
	if entry.Password != "newpass" {
		t.Fatalf("Expected password 'newpass', got '%s'", entry.Password)
	}
}

func TestDeleteEntry(t *testing.T) {
	dir := t.TempDir()
	vaultPath := filepath.Join(dir, "vault.enc")
	password := "test-password"

	v, _ := CreateVault(vaultPath, password)
	v.AddEntry(VaultEntry{ID: "id-1", Title: "GitHub"})
	v.AddEntry(VaultEntry{ID: "id-2", Title: "Google"})
	v.Save()

	if !v.DeleteEntry("id-1") {
		t.Fatal("DeleteEntry returned false for existing entry")
	}
	v.Save()

	loaded, _ := LoadVault(vaultPath, password)
	entries := loaded.ListEntries()
	if len(entries) != 1 {
		t.Fatalf("Expected 1 entry after delete, got %d", len(entries))
	}
	if entries[0].Title != "Google" {
		t.Fatalf("Expected 'Google', got '%s'", entries[0].Title)
	}
}

func TestFindEntry(t *testing.T) {
	dir := t.TempDir()
	vaultPath := filepath.Join(dir, "vault.enc")
	password := "test-password"

	v, _ := CreateVault(vaultPath, password)
	v.AddEntry(VaultEntry{ID: "id-1", Title: "GitHub", Username: "user@github.com", URL: "https://github.com"})
	v.AddEntry(VaultEntry{ID: "id-2", Title: "Google", Username: "user@gmail.com"})

	tests := []struct {
		query string
		found bool
	}{
		{"id-1", true},
		{"GitHub", true},
		{"user@github.com", true},
		{"https://github.com", true},
		{"nonexistent", false},
	}

	for _, tc := range tests {
		entry := v.FindEntry(tc.query)
		if tc.found && entry == nil {
			t.Errorf("FindEntry(%q) returned nil, expected entry", tc.query)
		}
		if !tc.found && entry != nil {
			t.Errorf("FindEntry(%q) returned entry, expected nil", tc.query)
		}
	}
}

func TestLoadWrongPassword(t *testing.T) {
	dir := t.TempDir()
	vaultPath := filepath.Join(dir, "vault.enc")

	CreateVault(vaultPath, "correct-password")
	_, err := LoadVault(vaultPath, "wrong-password")
	if err == nil {
		t.Fatal("Expected error when loading with wrong password, got nil")
	}
}

func TestSaveAndLoadMultiple(t *testing.T) {
	dir := t.TempDir()
	vaultPath := filepath.Join(dir, "vault.enc")
	password := "test-password"

	v, _ := CreateVault(vaultPath, password)
	for i := 0; i < 10; i++ {
		v.AddEntry(VaultEntry{
			ID:    generateID(),
			Title: "Entry",
		})
	}
	v.Save()

	loaded, _ := LoadVault(vaultPath, password)
	if len(loaded.ListEntries()) != 10 {
		t.Fatalf("Expected 10 entries, got %d", len(loaded.ListEntries()))
	}
}

func generateID() string {
	return "test-id"
}

func TestPersistToDisk(t *testing.T) {
	dir := t.TempDir()
	vaultPath := filepath.Join(dir, "vault.enc")
	password := "test-password"

	v, _ := CreateVault(vaultPath, password)
	v.AddEntry(VaultEntry{ID: "id-1", Title: "Persist Test"})
	v.Save()

	data, err := os.ReadFile(vaultPath)
	if err != nil {
		t.Fatalf("Failed to read vault file: %v", err)
	}

	if len(data) == 0 {
		t.Fatal("Vault file is empty")
	}
}
