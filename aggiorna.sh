#!/bin/bash

# === CONFIGURAZIONE ===
SSH_KEY="$HOME/.ssh/id_ed25519"
LOG_FILE="$HOME/aggiorna_git.log"
COMMIT_MSG="Aggiornamento automatico"

# === INIZIO SCRIPT ===
echo "⏱ $(date '+%Y-%m-%d %H:%M:%S') - Inizio aggiornamento" >> "$LOG_FILE"
#!/bin/bash

# === CONFIGURAZIONE ===
SSH_KEY="$HOME/.ssh/id_ed25519"
LOG_FILE="$HOME/aggiorna_git.log"

# === CHIEDI MESSAGGIO DI COMMIT ===
COMMIT_MSG=$(osascript -e 'Tell application "System Events" to display dialog "Messaggio di commit:" default answer "" with title "Git Auto Update" buttons {"OK"} default button "OK"' -e 'text returned of result')

# === INIZIO SCRIPT ===
echo "⏱ $(date '+%Y-%m-%d %H:%M:%S') - Inizio aggiornamento" >> "$LOG_FILE"

eval "$(ssh-agent -s)"
ssh-add -K "$SSH_KEY" > /dev/null 2>&1

cd "$(dirname "$0")"

git add .
git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1
git push >> "$LOG_FILE" 2>&1

osascript -e 'display notification "Aggiornamento completato con successo!" with title "Git Auto Update"'

echo "✅ $(date '+%Y-%m-%d %H:%M:%S') - Commit: '"$COMMIT_MSG"'" >> "$LOG_FILE"

