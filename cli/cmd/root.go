package cmd

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"golang.org/x/term"
)

const AppName = "VaultLite"
const Version = "1.0.0"

var (
	vaultDir   string
	vaultPath  string
	configPath string
)

func init() {
	home, err := os.UserHomeDir()
	if err != nil {
		home = os.Getenv("HOME")
	}
	vaultDir = filepath.Join(home, ".vaultlite")
	vaultPath = filepath.Join(vaultDir, "vault.enc")
	configPath = filepath.Join(vaultDir, "config.json")
}

type Command struct {
	Name    string
	Aliases []string
	Desc    string
	Run     func(args []string) error
}

var commands = []*Command{
	{Name: "init", Aliases: []string{}, Desc: "Initialize a new vault", Run: runInit},
	{Name: "list", Aliases: []string{"ls"}, Desc: "List all entries", Run: runList},
	{Name: "get", Aliases: []string{}, Desc: "Search and show an entry", Run: runGet},
	{Name: "add", Aliases: []string{"create", "new"}, Desc: "Add a new entry", Run: runAdd},
	{Name: "edit", Aliases: []string{"update"}, Desc: "Edit an entry by ID", Run: runEdit},
	{Name: "rm", Aliases: []string{"delete", "remove"}, Desc: "Delete an entry by ID", Run: runRm},
	{Name: "sync", Aliases: []string{}, Desc: "Backup vault to GitHub", Run: runSync},
	{Name: "generate", Aliases: []string{"gen"}, Desc: "Generate a random password", Run: runGenerate},
	{Name: "config", Aliases: []string{"cfg"}, Desc: "View or edit configuration", Run: runConfig},
	{Name: "totp", Aliases: []string{"2fa", "otp"}, Desc: "Generate TOTP code for an entry", Run: runTotp},
	{Name: "export", Aliases: []string{}, Desc: "Export vault.enc file", Run: runExport},
	{Name: "import", Aliases: []string{}, Desc: "Import vault.enc or Bitwarden CSV", Run: runImport},
	{Name: "pull", Aliases: []string{"restore"}, Desc: "Download vault from GitHub backup", Run: runPull},
}

func Execute() {
	if len(os.Args) < 2 {
		printHelp()
		return
	}
	name := os.Args[1]
	if name == "--help" || name == "-h" || name == "help" {
		printHelp()
		return
	}
	for _, c := range commands {
		if c.Name == name {
			if err := c.Run(os.Args[2:]); err != nil {
				fmt.Fprintf(os.Stderr, "Error: %v\n", err)
				os.Exit(1)
			}
			return
		}
		for _, a := range c.Aliases {
			if a == name {
				if err := c.Run(os.Args[2:]); err != nil {
					fmt.Fprintf(os.Stderr, "Error: %v\n", err)
					os.Exit(1)
				}
				return
			}
		}
	}
	fmt.Fprintf(os.Stderr, "Unknown command: %s\nRun 'vault --help' for usage.\n", name)
	os.Exit(1)
}

func printHelp() {
	fmt.Printf("%s v%s - Developer-Focused Password Manager\n\n", AppName, Version)
	fmt.Println("Usage: vault <command> [flags] [args]")
	fmt.Println()
	fmt.Println("Commands:")
	for _, c := range commands {
		fmt.Printf("  %-12s %s\n", c.Name, c.Desc)
	}
	fmt.Println()
	fmt.Println("Use 'vault <command> --help' for more info about a command.")
}

func readLine(prompt string) (string, error) {
	fmt.Print(prompt)
	input, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimRight(input, "\n\r"), nil
}

func readPassword(prompt string) (string, error) {
	fmt.Print(prompt)
	b, err := term.ReadPassword(int(os.Stdin.Fd()))
	fmt.Println()
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func confirm(prompt string) bool {
	resp, _ := readLine(prompt)
	resp = strings.ToLower(strings.TrimSpace(resp))
	return resp == "y" || resp == "yes"
}

func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func copyToClipboard(text string) error {
	if _, err := exec.LookPath("xclip"); err == nil {
		cmd := exec.Command("xclip", "-selection", "clipboard")
		pipe, err := cmd.StdinPipe()
		if err != nil {
			return err
		}
		if err := cmd.Start(); err != nil {
			return err
		}
		pipe.Write([]byte(text))
		pipe.Close()
		return cmd.Wait()
	}
	if _, err := exec.LookPath("pbcopy"); err == nil {
		cmd := exec.Command("pbcopy")
		pipe, err := cmd.StdinPipe()
		if err != nil {
			return err
		}
		if err := cmd.Start(); err != nil {
			return err
		}
		pipe.Write([]byte(text))
		pipe.Close()
		return cmd.Wait()
	}
	return fmt.Errorf("no clipboard tool found (install xclip on Linux or pbcopy on macOS)")
}
