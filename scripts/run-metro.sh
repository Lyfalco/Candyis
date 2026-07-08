#!/usr/bin/env bash
# Android Studio'dan "Run" ile telefona/emulator'a atınca debug build JS kodunu
# GÖMMÜYOR — Metro'dan (localhost:8081) canlı çekiyor. Android Studio'nun kendi
# "Run" düğmesi Metro'yu başlatmaz ve USB/adb bağlantısında port yönlendirmesi
# (adb reverse) kurmaz — "Unable to load script" hatasının sebebi budur.
#
# Kullanım: Android Studio'dan Run'a basmadan önce (ya da sonra) bu scripti
# çalıştırıp açık bırakın:
#   npm run metro
set -euo pipefail
cd "$(dirname "$0")/.."

devices=$(adb devices | tail -n +2 | awk 'NF && $2=="device" {print $1}')

if [ -z "$devices" ]; then
  echo "Uyarı: adb'ye bağlı cihaz/emulator bulunamadı — sadece Metro başlatılıyor."
else
  echo "Bağlı cihazlar için 'adb reverse tcp:8081 tcp:8081' ayarlanıyor:"
  while IFS= read -r device; do
    adb -s "$device" reverse tcp:8081 tcp:8081 && echo "  -> $device: OK"
  done <<< "$devices"
fi

echo ""
echo "Metro başlatılıyor — bu terminali açık bırakın, Android Studio'dan Run'a"
echo "basınca (veya basılıysa) uygulama artık buradan JS çekebilecek."
echo ""
exec npx expo start
