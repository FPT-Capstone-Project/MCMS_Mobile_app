import { ImouPlayerConfiguration } from '../../domain/entities/CameraStream';

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function createImouPlayerHtml(
  config: ImouPlayerConfiguration,
  apiUrl: string
): string {
  const assetBaseUrl = new URL('/imou-player/', apiUrl).toString();
  const playerConfig = escapeScriptJson({
    deviceId: config.deviceId,
    channelId: config.channelId,
    streamId: config.streamId,
    type: config.type,
    token: config.kitToken,
    WasmLibPath: assetBaseUrl,
    templateMode: 'mobile',
  });

  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="${assetBaseUrl}imou-player.css" />
    <style>
      html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #0f172a; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script
      src="${assetBaseUrl}imou-player.js"
      onerror="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Không thể tải thư viện ImouPlayer từ máy chủ backend: ' + this.src }))"
    ></script>
    <script>
      (function () {
        var config = ${playerConfig};
        var send = function (payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        };

        window.onerror = function (msg) {
          send({ type: 'error', message: 'Lỗi webview: ' + msg });
        };

        function startPlayer() {
          if (typeof window.imouPlayer !== 'function') {
            send({
              type: 'error',
              message: 'Không tìm thấy thư viện imouPlayer trên máy chủ (' + '${assetBaseUrl}imou-player.js' + ').',
            });
            return;
          }
          try {
            window.__imouPlayer = new window.imouPlayer({
              id: 'root',
              width: document.documentElement.clientWidth || window.innerWidth,
              height: document.documentElement.clientHeight || window.innerHeight,
              ...config,
              handleError: function (error) {
                var errMsg = error && (error.errMsg || error.message || error.description);
                send({
                  type: 'error',
                  message: errMsg || 'ImouPlayer không thể phát camera.',
                });
              },
              handleCallBack: function (event) {
                if (event && event.type) send({ type: event.type });
              },
            });
          } catch (error) {
            send({
              type: 'error',
              message: error && typeof error === 'object' && 'message' in error
                ? error.message
                : 'Không thể khởi tạo ImouPlayer.',
            });
          }
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          setTimeout(startPlayer, 100);
        } else {
          window.addEventListener('DOMContentLoaded', startPlayer);
        }
      })();
    </script>
  </body>
</html>`;
}
