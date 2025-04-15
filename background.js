// 拡張機能がインストールされたときの処理
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed or updated:', details.reason);
});
