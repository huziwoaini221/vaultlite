package vault

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"github.com/guoyan/vaultlite/cli/crypto"
)

type VaultEntry struct {
	ID         string   `json:"id"`
	Title      string   `json:"title"`
	Username   string   `json:"username"`
	Password   string   `json:"password"`
	URL        string   `json:"url"`
	Note       string   `json:"note"`
	Tags       []string `json:"tags"`
	TOTPSecret string   `json:"totpSecret"`
	CreatedAt  string   `json:"createdAt"`
	UpdatedAt  string   `json:"updatedAt"`
}

type VaultData struct {
	Entries []VaultEntry `json:"entries"`
}

type Vault struct {
	Data     VaultData
	password string
	path     string
}

func LoadVault(vaultPath, password string) (*Vault, error) {
	data, err := os.ReadFile(vaultPath)
	if err != nil {
		return nil, err
	}
	decrypted, err := crypto.Decrypt(data, password)
	if err != nil {
		return nil, err
	}
	var vaultData VaultData
	if err := json.Unmarshal(decrypted, &vaultData); err != nil {
		return nil, err
	}
	return &Vault{Data: vaultData, password: password, path: vaultPath}, nil
}

func CreateVault(vaultPath, password string) (*Vault, error) {
	v := &Vault{
		Data:     VaultData{Entries: []VaultEntry{}},
		password: password,
		path:     vaultPath,
	}
	if err := v.Save(); err != nil {
		return nil, err
	}
	return v, nil
}

func (v *Vault) Save() error {
	data, err := json.Marshal(v.Data)
	if err != nil {
		return err
	}
	encrypted, err := crypto.Encrypt(data, v.password)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(v.path), 0700); err != nil {
		return err
	}
	return os.WriteFile(v.path, encrypted, 0600)
}

func (v *Vault) AddEntry(entry VaultEntry) {
	now := time.Now().UTC().Format(time.RFC3339)
	entry.CreatedAt = now
	entry.UpdatedAt = now
	v.Data.Entries = append(v.Data.Entries, entry)
}

func (v *Vault) UpdateEntry(id string, entry VaultEntry) bool {
	for i, e := range v.Data.Entries {
		if e.ID == id {
			entry.CreatedAt = e.CreatedAt
			entry.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			entry.ID = id
			v.Data.Entries[i] = entry
			return true
		}
	}
	return false
}

func (v *Vault) DeleteEntry(id string) bool {
	for i, e := range v.Data.Entries {
		if e.ID == id {
			v.Data.Entries = append(v.Data.Entries[:i], v.Data.Entries[i+1:]...)
			return true
		}
	}
	return false
}

func (v *Vault) FindEntry(query string) *VaultEntry {
	for i := range v.Data.Entries {
		e := &v.Data.Entries[i]
		if e.ID == query || e.Title == query || e.Username == query || e.URL == query {
			return e
		}
	}
	return nil
}

func (v *Vault) ListEntries() []VaultEntry {
	return v.Data.Entries
}
