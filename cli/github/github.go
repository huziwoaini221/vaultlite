package github

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
)

const baseURL = "https://api.github.com"

type repoResponse struct {
	Name string `json:"name"`
}

type contentResponse struct {
	Content string `json:"content"`
	SHA     string `json:"sha"`
}

func EnsureRepo(token string) error {
	body := map[string]interface{}{
		"name":        "vaultlite-backup",
		"description": "VaultLite encrypted password backup",
		"private":     true,
		"auto_init":   false,
	}
	b, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", baseURL+"/user/repos", bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == 201 {
		return nil
	}
	if resp.StatusCode == 422 {
		return nil
	}
	return fmt.Errorf("failed to create repo: %s", resp.Status)
}

func UploadVault(token string, encryptedContent []byte, message string) error {
	owner, repo, err := getRepoInfo(token)
	if err != nil {
		return err
	}
	encoded := base64.StdEncoding.EncodeToString(encryptedContent)
	url := fmt.Sprintf("%s/repos/%s/%s/contents/vault.enc", baseURL, owner, repo)
	body := map[string]string{
		"message": message,
		"content": encoded,
	}
	b, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("PUT", url, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == 201 || resp.StatusCode == 200 {
		return nil
	}
	return fmt.Errorf("failed to upload vault: %s", resp.Status)
}

func DownloadVault(token string) ([]byte, error) {
	owner, repo, err := getRepoInfo(token)
	if err != nil {
		return nil, err
	}
	url := fmt.Sprintf("%s/repos/%s/%s/contents/vault.enc", baseURL, owner, repo)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to download vault: %s", resp.Status)
	}
	var cr contentResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return nil, err
	}
	return base64.StdEncoding.DecodeString(cr.Content)
}

func DownloadVaultPublic(owner string) ([]byte, error) {
	url := fmt.Sprintf("%s/repos/%s/vaultlite-backup/contents/vault.enc", baseURL, owner)
	resp, err := http.DefaultClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("no vault.enc found (make sure vaultlite-backup is public)")
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to download vault: %s", resp.Status)
	}
	var cr contentResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return nil, err
	}
	return base64.StdEncoding.DecodeString(cr.Content)
}

func SetRepoPublic(token string) error {
	owner, repo, err := getRepoInfo(token)
	if err != nil {
		return err
	}
	body := map[string]bool{"private": false}
	b, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("PATCH", fmt.Sprintf("%s/repos/%s/%s", baseURL, owner, repo), bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to make repo public: %s", resp.Status)
	}
	return nil
}

func getRepoInfo(token string) (string, string, error) {
	req, err := http.NewRequest("GET", baseURL+"/user", nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", "", fmt.Errorf("failed to get user info: %s", resp.Status)
	}
	var user struct {
		Login string `json:"login"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return "", "", err
	}
	return user.Login, "vaultlite-backup", nil
}
