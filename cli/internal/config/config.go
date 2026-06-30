package config

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	GitHubToken string `json:"github_token,omitempty"`
	GitHubOwner string `json:"github_owner,omitempty"`
	GitHubRepo  string `json:"github_repo,omitempty"`
	AutoBackup  bool   `json:"auto_backup"`
}

func defaultConfig() *Config {
	return &Config{
		GitHubRepo: "vaultlite-backup",
	}
}

func Load(path string) (*Config, error) {
	cfg := defaultConfig()
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) Save(path string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0600)
}
