#!/usr/bin/env bash
# 在本机起一个静态服务器，供 iPad 在同一 Wi-Fi 下打开。
# 用法：bash serve.sh  （Ctrl+C 停止）

set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8765}"

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '')"

echo "电脑上打开：  http://127.0.0.1:${PORT}/index.html"
if [ -n "${IP}" ]; then
  echo "iPad 上打开：  http://${IP}:${PORT}/index.html   （iPad 要和这台 Mac 连同一个 Wi-Fi）"
else
  echo "没取到局域网 IP，检查 Wi-Fi 是否连接。"
fi
echo "按 Ctrl+C 停止。"
echo

exec python3 -m http.server "${PORT}"
